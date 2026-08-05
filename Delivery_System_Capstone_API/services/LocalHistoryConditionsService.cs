using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Services
{
    /// <summary>
    /// Default <see cref="IExternalConditionsService"/>, derived entirely from delivery history
    /// already held locally. No external or paid API is involved.
    /// </summary>
    /// <remarks>
    /// Replaces the two hardcoded constants that made factor 8 inert. Previously the factor
    /// evaluated to exactly 0.2 on weekdays and 0.533 at weekends, a spread of 0.0067 once
    /// multiplied by its 0.02 weight — too small to ever move an order across a risk
    /// threshold. It now varies by route, by time of day, and by calendar window.
    /// <para>
    /// Three signals are blended. The sub-weights below are internal to factor 8 and sum to
    /// 1.00, so the returned value stays in [0,1] and factor 8's own weight in the model
    /// remains exactly 0.02.
    /// </para>
    /// </remarks>
    public class LocalHistoryConditionsService : IExternalConditionsService
    {
        // Sub-weights within factor 8. 0.55 + 0.25 + 0.20 = 1.00.
        private const double HistoricalWeight = 0.55;
        private const double CongestionWeight = 0.25;
        private const double CalendarWeight   = 0.20;

        /// <summary>Minimum completed deliveries before a bucket's breach rate is trusted.
        /// Matches the >= 3 threshold the driver and route factors already use.</summary>
        private const int MinimumSamples = 3;

        /// <summary>Fallback when no bucket has enough history. Matches the existing
        /// route-factor default of 0.2 so behaviour on a cold database is unchanged in spirit.</summary>
        private const double NoHistoryFallback = 0.2;

        private const int DefaultLocalUtcOffsetHours = 8; // Asia/Manila

        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public LocalHistoryConditionsService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<IConditionsSnapshot> CreateSnapshotAsync(CancellationToken cancellationToken = default)
        {
            var offsetHours =
                _configuration.GetValue<int?>("Predictions:LocalUtcOffsetHours")
                ?? DefaultLocalUtcOffsetHours;

            // One query. Grouping by DATEPART(hour, ExpectedDelivery) keeps the SQL simple and
            // translatable; the 24 hour-groups are folded into coarser buckets in memory, which
            // also lets the UTC -> local shift happen without any SQL time-zone dependency.
            var byRouteHour = await _context.DeliveryOrders
                .AsNoTracking()
                .Where(PredictionService.TerminalOrderFilter)
                .GroupBy(o => new { o.Route, o.Area, Hour = o.ExpectedDelivery.Hour })
                .Select(g => new
                {
                    g.Key.Route,
                    g.Key.Area,
                    g.Key.Hour,
                    Total = g.Count(),
                    Breached = g.Count(o =>
                        o.DateCompleted > o.ExpectedDelivery
                        || o.Status == "Failed"
                        || o.Status == "Returned")
                })
                .ToListAsync(cancellationToken);

            var byLocationBucket = new Dictionary<string, (int Total, int Breached)>(StringComparer.OrdinalIgnoreCase);
            var byLocation = new Dictionary<string, (int Total, int Breached)>(StringComparer.OrdinalIgnoreCase);
            var globalTotal = 0;
            var globalBreached = 0;

            foreach (var row in byRouteHour)
            {
                var localHour = ShiftHour(row.Hour, offsetHours);
                var bucket = TimeBucket(localHour);

                // Index under both route and area so an order missing one still resolves.
                foreach (var location in new[] { row.Route, row.Area })
                {
                    if (string.IsNullOrWhiteSpace(location))
                    {
                        continue;
                    }

                    Accumulate(byLocationBucket, BucketKey(location, bucket), row.Total, row.Breached);
                    Accumulate(byLocation, location, row.Total, row.Breached);
                }

                globalTotal += row.Total;
                globalBreached += row.Breached;
            }

            return new ConditionsSnapshot(
                byLocationBucket,
                byLocation,
                globalTotal,
                globalBreached,
                offsetHours);
        }

        private static void Accumulate(
            Dictionary<string, (int Total, int Breached)> target,
            string key,
            int total,
            int breached)
        {
            target.TryGetValue(key, out var current);
            target[key] = (current.Total + total, current.Breached + breached);
        }

        private static string BucketKey(string location, int bucket) => $"{location}|{bucket}";

        private static int ShiftHour(int utcHour, int offsetHours)
        {
            var shifted = (utcHour + offsetHours) % 24;
            return shifted < 0 ? shifted + 24 : shifted;
        }

        /// <summary>Four six-hour buckets. Coarse on purpose: per-hour buckets are far too
        /// sparse to produce a stable breach rate at this data volume.</summary>
        private static int TimeBucket(int localHour)
        {
            if (localHour < 6) return 0;   // overnight
            if (localHour < 12) return 1;  // morning
            if (localHour < 18) return 2;  // afternoon
            return 3;                      // evening
        }

        private sealed class ConditionsSnapshot : IConditionsSnapshot
        {
            private readonly Dictionary<string, (int Total, int Breached)> _byLocationBucket;
            private readonly Dictionary<string, (int Total, int Breached)> _byLocation;
            private readonly int _globalTotal;
            private readonly int _globalBreached;
            private readonly int _offsetHours;

            public ConditionsSnapshot(
                Dictionary<string, (int Total, int Breached)> byLocationBucket,
                Dictionary<string, (int Total, int Breached)> byLocation,
                int globalTotal,
                int globalBreached,
                int offsetHours)
            {
                _byLocationBucket = byLocationBucket;
                _byLocation = byLocation;
                _globalTotal = globalTotal;
                _globalBreached = globalBreached;
                _offsetHours = offsetHours;
            }

            public double GetConditionsRisk(string? route, string? area, DateTime timestampUtc)
            {
                var localHour = ShiftHour(timestampUtc.Hour, _offsetHours);
                var bucket = TimeBucket(localHour);

                // Local day-of-week, derived from the same shifted instant.
                var localDay = timestampUtc.AddHours(_offsetHours).DayOfWeek;

                var historical = ResolveHistoricalRisk(route, area, bucket);
                var congestion = CongestionRisk(localHour);
                var calendar = localDay == DayOfWeek.Saturday || localDay == DayOfWeek.Sunday ? 1.0 : 0.0;

                var combined =
                    (historical * HistoricalWeight)
                    + (congestion * CongestionWeight)
                    + (calendar * CalendarWeight);

                return Math.Clamp(combined, 0.0, 1.0);
            }

            /// <summary>
            /// Fallback chain, most specific first: route+bucket, area+bucket, route overall,
            /// area overall, global, then a fixed default. Each level must clear
            /// <see cref="MinimumSamples"/> before it is trusted.
            /// </summary>
            private double ResolveHistoricalRisk(string? route, string? area, int bucket)
            {
                foreach (var location in new[] { route, area })
                {
                    if (string.IsNullOrWhiteSpace(location))
                    {
                        continue;
                    }

                    if (_byLocationBucket.TryGetValue(BucketKey(location, bucket), out var scoped)
                        && scoped.Total >= MinimumSamples)
                    {
                        return (double)scoped.Breached / scoped.Total;
                    }
                }

                foreach (var location in new[] { route, area })
                {
                    if (string.IsNullOrWhiteSpace(location))
                    {
                        continue;
                    }

                    if (_byLocation.TryGetValue(location, out var overall)
                        && overall.Total >= MinimumSamples)
                    {
                        return (double)overall.Breached / overall.Total;
                    }
                }

                if (_globalTotal >= MinimumSamples)
                {
                    return (double)_globalBreached / _globalTotal;
                }

                return NoHistoryFallback;
            }

            /// <summary>
            /// Rush-hour congestion proxy on local time. Peaks are the Metro Manila commute
            /// windows; the hours either side are treated as shoulders.
            /// </summary>
            private static double CongestionRisk(int localHour)
            {
                // Morning peak 07:00-09:59, evening peak 17:00-19:59.
                if ((localHour >= 7 && localHour <= 9) || (localHour >= 17 && localHour <= 19))
                {
                    return 1.0;
                }

                // Shoulders either side of each peak.
                if (localHour == 6 || localHour == 10 || localHour == 16 || localHour == 20)
                {
                    return 0.5;
                }

                // Overnight is the freest-flowing window.
                if (localHour >= 22 || localHour <= 4)
                {
                    return 0.0;
                }

                return 0.2;
            }
        }
    }
}
