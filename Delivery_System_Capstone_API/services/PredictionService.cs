using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public class PredictionService : IPredictionService
    {
        /// <summary>
        /// Factor weights for the scoring model, named so the total can be asserted by tests.
        /// An edit that breaks the sum would silently de-calibrate every risk-level threshold.
        /// </summary>
        /// <remarks>
        /// 1 SLA remaining time 0.35, 2 Priority 0.15, 3 Redelivery attempts 0.15,
        /// 4 Driver history 0.15, 5 Route history 0.10, 6 Package 0.05, 7 Client type 0.03,
        /// 8 Operating conditions 0.02. Total = 1.00.
        /// </remarks>
        public static class ScoringWeights
        {
            public const double SlaRemainingTime   = 0.35;
            public const double Priority           = 0.15;
            public const double RedeliveryAttempts = 0.15;
            public const double DriverHistory      = 0.15;
            public const double RouteHistory       = 0.10;
            public const double Package            = 0.05;
            public const double ClientType         = 0.03;
            public const double Conditions         = 0.02;

            /// <summary>
            /// Sum of all eight weights. 0.35, 0.15 and 0.03 are not exactly representable in
            /// IEEE-754 binary64, so compare against 1.0 with rounding rather than with ==.
            /// </summary>
            public static double Total =>
                SlaRemainingTime + Priority + RedeliveryAttempts + DriverHistory
                + RouteHistory + Package + ClientType + Conditions;
        }

        /// <summary>
        /// The four terminal statuses that make an order eligible for breach-rate aggregation.
        /// Declared once and shared (including with <see cref="LocalHistoryConditionsService"/>)
        /// so the definition cannot drift between call sites.
        /// </summary>
        public static readonly Expression<Func<DeliveryOrder, bool>> TerminalOrderFilter =
            o => o.Status == "Delivered"
              || o.Status == "Completed"
              || o.Status == "Failed"
              || o.Status == "Returned";

        private readonly AppDbContext _context;
        private readonly ISlaService _slaService;
        private readonly IExternalConditionsService _conditionsService;
        private readonly IPredictionCache _cache;

        public PredictionService(
            AppDbContext context,
            ISlaService slaService,
            IExternalConditionsService conditionsService,
            IPredictionCache cache)
        {
            _context = context;
            _slaService = slaService;
            _conditionsService = conditionsService;
            _cache = cache;
        }

        /// <summary>Risk-level band boundaries. Inclusive lower bounds.</summary>
        public const double CriticalThreshold = 0.80;
        public const double HighThreshold     = 0.60;
        public const double MediumThreshold   = 0.35;

        /// <summary>
        /// Maps a weighted risk score onto its band. Extracted from the scoring routine purely
        /// so the inclusive (&gt;=) boundary behaviour can be asserted at exactly 0.35, 0.60 and
        /// 0.80 without having to steer a full end-to-end score onto those values through
        /// floating-point arithmetic. Behaviour is unchanged.
        /// </summary>
        public static string DetermineRiskLevel(double riskScore)
        {
            if (riskScore >= CriticalThreshold) return "Critical";
            if (riskScore >= HighThreshold) return "High";
            if (riskScore >= MediumThreshold) return "Medium";
            return "Low";
        }

        /// <summary>Historical breach-rate profiles keyed by driver, route and client.</summary>
        private sealed class PerformanceAggregates
        {
            public Dictionary<int, (int Total, int Breached)> Driver { get; init; } = new();
            public Dictionary<string, (int Total, int Breached)> Route { get; init; } = new();
            public Dictionary<string, (int Total, int Breached)> Client { get; init; } = new();
        }

        public async Task<PredictionResultDto> ComputePredictionAsync(DeliveryOrder order)
        {
            // Scoped to just this order's driver, route and client — the same narrowing as
            // before, now routed through the shared aggregation helper so the breach
            // definition exists in exactly one place.
            var aggregates = await LoadPerformanceAggregatesAsync(order);
            var conditions = await _conditionsService.CreateSnapshotAsync();

            return ComputePredictionInternal(order, aggregates, conditions);
        }

        public async Task<int> RunPredictionsAsync()
        {
            // 1. Fetch active, non-archived orders
            var activeOrders = await _context.DeliveryOrders
                .Include(o => o.Driver)
                .Where(o => !o.IsArchived 
                         && o.Status != "Delivered" 
                         && o.Status != "Completed" 
                         && o.Status != "Failed" 
                         && o.Status != "Returned"
                         && o.Status != "Cancelled")
                .ToListAsync();

            if (!activeOrders.Any())
            {
                return 0;
            }

            // 2. Pre-fetch every aggregate the loop needs, exactly once. Nothing past this
            //    point may touch the database per order — that is what keeps a full recompute
            //    free of N+1 behaviour, including the new conditions lookup for factor 8.
            var aggregates = await LoadPerformanceAggregatesAsync();
            var conditions = await _conditionsService.CreateSnapshotAsync();

            // Fetch existing predictions once to avoid N+1 updates
            var existingPredictions = await _context.DeliveryPredictions
                .ToDictionaryAsync(p => p.DeliveryOrderId);

            // Orders that cross INTO Critical on this run. Collected during the loop and turned
            // into notifications afterwards.
            var newlyCritical = new List<DeliveryOrder>();

            foreach (var order in activeOrders)
            {
                var result = ComputePredictionInternal(order, aggregates, conditions);

                if (existingPredictions.TryGetValue(order.Id, out var existing))
                {
                    // Read the previous level BEFORE it is overwritten. This is what makes the
                    // alert fire on the transition into Critical rather than on every run while
                    // the order merely remains Critical.
                    var wasCritical = string.Equals(existing.RiskLevel, "Critical", StringComparison.OrdinalIgnoreCase);
                    var isCritical = string.Equals(result.RiskLevel, "Critical", StringComparison.OrdinalIgnoreCase);

                    if (isCritical && !wasCritical)
                    {
                        newlyCritical.Add(order);
                    }

                    existing.RiskScore = result.RiskScore;
                    existing.RiskLevel = result.RiskLevel;
                    existing.ConfidenceScore = result.ConfidenceScore;
                    existing.IsAtRisk = result.IsAtRisk;
                    existing.RiskReason = result.RiskReason;
                    existing.RecommendedAction = result.RecommendedAction;
                    existing.PredictedAt = DateTime.UtcNow;
                    _context.DeliveryPredictions.Update(existing);
                }
                else
                {
                    // First-ever prediction for this order. There is no previous level, so
                    // landing on Critical is itself an escalation.
                    if (string.Equals(result.RiskLevel, "Critical", StringComparison.OrdinalIgnoreCase))
                    {
                        newlyCritical.Add(order);
                    }

                    var newPred = new DeliveryPrediction
                    {
                        DeliveryOrderId = order.Id,
                        RiskScore = result.RiskScore,
                        RiskLevel = result.RiskLevel,
                        ConfidenceScore = result.ConfidenceScore,
                        IsAtRisk = result.IsAtRisk,
                        RiskReason = result.RiskReason,
                        RecommendedAction = result.RecommendedAction,
                        PredictedAt = DateTime.UtcNow
                    };
                    await _context.DeliveryPredictions.AddAsync(newPred);
                }
            }

            await CreateCriticalRiskNotificationsAsync(newlyCritical);

            await _context.SaveChangesAsync();

            // Centralised eviction. Living here rather than in the controller means the manual
            // endpoint, the scheduler, and any future caller all invalidate the aggregate cache
            // without having to remember to. A stale summary after a fresh recompute is a bug.
            _cache.InvalidateAggregates();

            return activeOrders.Count;
        }

        /// <summary>
        /// Raises one operations alert per order that has just escalated into Critical.
        /// </summary>
        /// <remarks>
        /// Reuses the existing <see cref="Notification"/> feed rather than introducing a
        /// parallel alerting system. Because the caller only supplies orders whose previous
        /// RiskLevel was something other than Critical, an order that stays Critical across many
        /// scheduled runs produces exactly one alert. If it recovers to a lower band and later
        /// escalates again, that is a fresh transition and a second alert is correct.
        /// </remarks>
        private async Task CreateCriticalRiskNotificationsAsync(List<DeliveryOrder> newlyCritical)
        {
            if (newlyCritical.Count == 0)
            {
                return;
            }

            var predictionsByOrder = await _context.DeliveryPredictions
                .Where(p => newlyCritical.Select(o => o.Id).Contains(p.DeliveryOrderId))
                .ToDictionaryAsync(p => p.DeliveryOrderId);

            foreach (var order in newlyCritical)
            {
                // Prefer the freshly written RecommendedAction; fall back to a generic
                // instruction if the prediction row cannot be resolved for any reason.
                var recommendedAction =
                    predictionsByOrder.TryGetValue(order.Id, out var prediction)
                        ? prediction.RecommendedAction
                        : "Review this delivery immediately.";

                var waybill = Truncate(order.WaybillNo, 50);

                var notification = new Notification
                {
                    Type = "alert",
                    Title = Truncate($"Critical SLA risk: {waybill}", 200),
                    WaybillNo = waybill,
                    Description = string.IsNullOrWhiteSpace(recommendedAction)
                        ? "Review this delivery immediately."
                        : recommendedAction,
                    Timestamp = DateTime.UtcNow.ToString("t"),
                    Date = DateTime.UtcNow,
                    Source = "SLA Prediction Engine",
                    Read = false,
                    StatusBadge = "Critical"
                };

                await _context.Notifications.AddAsync(notification);
            }
        }

        private static string Truncate(string? value, int maxLength)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            return value.Length <= maxLength ? value : value.Substring(0, maxLength);
        }

        /// <summary>
        /// Builds the driver, route and client breach-rate profiles.
        /// </summary>
        /// <param name="scopeTo">
        /// When supplied, each profile is narrowed to that order's own driver, route and client.
        /// When null, profiles cover every driver, route and client.
        /// </param>
        /// <remarks>
        /// The single entry point for breach-rate aggregation. Previously
        /// <c>ComputePredictionAsync</c> and <c>RunPredictionsAsync</c> each carried their own
        /// copy of these three group-by queries, so the breach definition existed twice and was
        /// free to drift.
        /// </remarks>
        private async Task<PerformanceAggregates> LoadPerformanceAggregatesAsync(
            DeliveryOrder? scopeTo = null,
            CancellationToken cancellationToken = default)
        {
            var scopedDriverId = scopeTo?.DriverId;
            var scopedRoute = scopeTo?.Route;
            var scopedClient = scopeTo?.ClientName;

            var driver = await AggregateBreachRatesAsync(
                o => o.DriverId != null
                     && (scopedDriverId == null || o.DriverId == scopedDriverId),
                o => o.DriverId!.Value,
                comparer: null,
                cancellationToken);

            var route = await AggregateBreachRatesAsync(
                o => o.Route != null && o.Route != ""
                     && (scopedRoute == null || o.Route == scopedRoute),
                o => o.Route,
                StringComparer.OrdinalIgnoreCase,
                cancellationToken);

            var client = await AggregateBreachRatesAsync(
                o => o.ClientName != null && o.ClientName != ""
                     && (scopedClient == null || o.ClientName == scopedClient),
                o => o.ClientName,
                StringComparer.OrdinalIgnoreCase,
                cancellationToken);

            return new PerformanceAggregates
            {
                Driver = driver,
                Route = route,
                Client = client
            };
        }

        /// <summary>
        /// Groups terminal orders by <paramref name="keySelector"/> and returns total and
        /// breached counts per key.
        /// </summary>
        /// <remarks>
        /// This is the <b>only</b> place the breach predicate
        /// <c>DateCompleted &gt; ExpectedDelivery || Status == "Failed" || Status == "Returned"</c>
        /// appears for aggregation purposes, and the only place
        /// <see cref="TerminalOrderFilter"/> is applied to it. Keeping both in one method is
        /// what stops the two callers from drifting apart.
        /// </remarks>
        private async Task<Dictionary<TKey, (int Total, int Breached)>> AggregateBreachRatesAsync<TKey>(
            Expression<Func<DeliveryOrder, bool>> scopeFilter,
            Expression<Func<DeliveryOrder, TKey>> keySelector,
            IEqualityComparer<TKey>? comparer,
            CancellationToken cancellationToken)
            where TKey : notnull
        {
            return await _context.DeliveryOrders
                .AsNoTracking()
                .Where(TerminalOrderFilter)
                .Where(scopeFilter)
                .GroupBy(keySelector)
                .Select(g => new
                {
                    Key = g.Key,
                    Total = g.Count(),
                    Breached = g.Count(o =>
                        o.DateCompleted > o.ExpectedDelivery
                        || o.Status == "Failed"
                        || o.Status == "Returned")
                })
                .ToDictionaryAsync(x => x.Key, x => (x.Total, x.Breached), comparer, cancellationToken);
        }

        private PredictionResultDto ComputePredictionInternal(
            DeliveryOrder order,
            PerformanceAggregates aggregates,
            IConditionsSnapshot conditions)
        {
            var driverPerf = aggregates.Driver;
            var routePerf = aggregates.Route;
            var clientPerf = aggregates.Client;

            var now = DateTime.UtcNow;
            
            // ─── 1. SLA Remaining Time Factor (Weight: 0.35) ───
            double remainingHours = (order.ExpectedDelivery - now).TotalHours;
            double slaTimeScore = 0.0;
            if (remainingHours <= 0)
            {
                slaTimeScore = 1.0; // Already breached
            }
            else if (remainingHours <= 6)
            {
                slaTimeScore = 0.9;
            }
            else if (remainingHours <= 12)
            {
                slaTimeScore = 0.7;
            }
            else if (remainingHours <= 24)
            {
                slaTimeScore = 0.4;
            }
            else if (remainingHours <= 48)
            {
                slaTimeScore = 0.2;
            }
            else
            {
                slaTimeScore = 0.0;
            }

            // ─── 2. Delivery Priority Factor (Weight: 0.15) ───
            double priorityScore = order.Priority.ToLowerInvariant().Trim() switch
            {
                "high" => 1.0,
                "medium" => 0.5,
                "low" => 0.1,
                _ => 0.3
            };

            // ─── 3. Redelivery Attempts Factor (Weight: 0.15) ───
            double redeliveryScore = 0.0;
            if (order.RedeliveryAttemptCount >= 2)
            {
                redeliveryScore = 1.0;
            }
            else if (order.RedeliveryAttemptCount == 1)
            {
                redeliveryScore = 0.6;
            }

            // ─── 4. Driver Historical Performance Factor (Weight: 0.15) ───
            double driverScore = 0.2; // Default fallback
            double driverBreachRate = 0.0;
            bool hasDriverHistory = false;

            if (order.DriverId.HasValue)
            {
                if (driverPerf.TryGetValue(order.DriverId.Value, out var dp) && dp.Total >= 3)
                {
                    driverBreachRate = (double)dp.Breached / dp.Total;
                    driverScore = driverBreachRate;
                    hasDriverHistory = true;
                }
            }
            else
            {
                driverScore = 0.8; // Unassigned active order represents a high delay risk
            }

            // ─── 5. Route Historical Performance Factor (Weight: 0.10) ───
            double routeScore = 0.2; // Default fallback
            double routeBreachRate = 0.0;
            bool hasRouteHistory = false;

            if (!string.IsNullOrEmpty(order.Route))
            {
                if (routePerf.TryGetValue(order.Route, out var rp) && rp.Total >= 3)
                {
                    routeBreachRate = (double)rp.Breached / rp.Total;
                    routeScore = routeBreachRate;
                    hasRouteHistory = true;
                }
            }

            // ─── 6. Item Count and Package Weight Factor (Weight: 0.05) ───
            double weightKg = 0;
            if (!string.IsNullOrWhiteSpace(order.Weight))
            {
                var cleanWeight = new string(order.Weight.Where(c => char.IsDigit(c) || c == '.').ToArray());
                double.TryParse(cleanWeight, out weightKg);
            }

            double packageScore = 0.0;
            if (weightKg > 15 || order.ItemCount > 8)
            {
                packageScore = 1.0;
            }
            else if (weightKg > 5 || order.ItemCount > 3)
            {
                packageScore = 0.4;
            }

            // ─── 7. Client Type Factor (Weight: 0.03) ───
            double clientScore = order.ClientType.ToLowerInvariant().Trim() switch
            {
                "vip" => 0.7,
                "express" => 0.5,
                "corporate" => 0.3,
                _ => 0.1
            };

            // ─── 8. Operating Conditions Factor (Weight: 0.02) ───
            // Was (weekendFactor + 0.2 + 0.1) / 1.5 with traffic and weather hardcoded, which
            // resolved to exactly 0.2 on weekdays and 0.533 at weekends — a 0.0067 spread once
            // weighted, too small to ever move an order between risk levels. Now sourced from
            // IExternalConditionsService, which varies by route, time of day and calendar
            // window. Scored against ExpectedDelivery rather than "now" because the conditions
            // that matter are the ones at the delivery slot.
            double conditionsScore = conditions.GetConditionsRisk(
                order.Route,
                order.Area,
                order.ExpectedDelivery);

            // ─── Compute Weighted Risk Score ───
            double riskScore = (slaTimeScore * ScoringWeights.SlaRemainingTime) +
                               (priorityScore * ScoringWeights.Priority) +
                               (redeliveryScore * ScoringWeights.RedeliveryAttempts) +
                               (driverScore * ScoringWeights.DriverHistory) +
                               (routeScore * ScoringWeights.RouteHistory) +
                               (packageScore * ScoringWeights.Package) +
                               (clientScore * ScoringWeights.ClientType) +
                               (conditionsScore * ScoringWeights.Conditions);

            // Clamp risk score to [0.0, 1.0].
            //
            // Documenting D9: the upper clamp is unreachable in practice. Factor 7 maxes at 0.7
            // (0.021 weighted) so, even with every other factor at 1.0, the ceiling is 0.991
            // rather than 1.000. Nothing should assume a score of exactly 1.0 is attainable.
            riskScore = Math.Clamp(riskScore, 0.0, 1.0);

            // ─── Determine Risk Level ───
            string riskLevel = DetermineRiskLevel(riskScore);

            // Is At Risk flag (includes Medium, High, and Critical risk levels).
            //
            // Reads MediumThreshold rather than repeating its value. The literal 0.35 that used
            // to sit here was numerically identical, but it meant the Medium band boundary
            // existed in two places: retuning the band via the constant would have left this
            // flag behind, silently decoupling IsAtRisk from RiskLevel. Behaviour is unchanged.
            bool isAtRisk = riskScore >= MediumThreshold || remainingHours <= 0;

            // ─── Compute Confidence Score (0.0 to 1.0) ───
            // High confidence relies on how much historical profile data we have
            double confidence = 0.60; // Base confidence
            if (hasDriverHistory) confidence += 0.15;
            if (hasRouteHistory) confidence += 0.15;
            if (weightKg > 0) confidence += 0.05;
            if (clientPerf.TryGetValue(order.ClientName, out var cp) && cp.Total >= 3) confidence += 0.05;
            confidence = Math.Clamp(confidence, 0.50, 0.98); // cap below 100% since it's a prediction

            // ─── Compile Risk Reasons ───
            var reasons = new List<string>();
            if (remainingHours <= 0)
            {
                reasons.Add("Expected delivery deadline has passed (Breached).");
            }
            else if (remainingHours <= 12)
            {
                reasons.Add($"SLA deadline is very short ({remainingHours:F1} hours remaining).");
            }

            if (!order.DriverId.HasValue)
            {
                reasons.Add("No driver has been assigned to this active order.");
            }
            else if (hasDriverHistory && driverBreachRate > 0.3)
            {
                reasons.Add($"Assigned driver has a high historical SLA breach rate ({driverBreachRate:P0}).");
            }

            if (hasRouteHistory && routeBreachRate > 0.3)
            {
                reasons.Add($"Delivery route is historically delayed ({routeBreachRate:P0} breach rate).");
            }

            if (order.RedeliveryAttemptCount > 0)
            {
                reasons.Add($"Order has failed delivery {order.RedeliveryAttemptCount} time(s) previously.");
            }

            if (order.Priority.Equals("High", StringComparison.OrdinalIgnoreCase))
            {
                reasons.Add("High priority shipment has a strict SLA window.");
            }

            if (weightKg > 15)
            {
                reasons.Add("Package is heavy (> 15 kg), which may slow down transport.");
            }

            string riskReasonStr = reasons.Any() 
                ? string.Join("\n", reasons.Select(r => $"• {r}")) 
                : "• No severe risk factors identified. On schedule.";

            // ─── Compile Recommended Action ───
            string recommendedAction = "No action required. On schedule.";
            if (remainingHours <= 0)
            {
                recommendedAction = "Escalate order delivery status and contact client with update.";
            }
            else if (!order.DriverId.HasValue)
            {
                recommendedAction = "Assign an experienced driver to this order immediately.";
            }
            else if (hasDriverHistory && driverBreachRate > 0.3)
            {
                recommendedAction = "Consider reassigning order to a driver with a higher SLA on-time rating.";
            }
            else if (order.RedeliveryAttemptCount >= 2)
            {
                recommendedAction = "Contact recipient to confirm availability and address details before next delivery attempt.";
            }
            else if (order.Priority.Equals("High", StringComparison.OrdinalIgnoreCase) && remainingHours <= 6)
            {
                recommendedAction = "Prioritize loading and routing. Send immediate alert to driver.";
            }
            else if (riskScore >= 0.35)
            {
                recommendedAction = "Monitor delivery progress closely. Request location updates from driver.";
            }

            return new PredictionResultDto
            {
                RiskScore = riskScore,
                RiskLevel = riskLevel,
                ConfidenceScore = confidence,
                IsAtRisk = isAtRisk,
                RiskReason = riskReasonStr,
                RecommendedAction = recommendedAction
            };
        }
    }
}
