using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using SPXDeliveryAPI.Services;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/predictions")]
    [ApiController]
    [Authorize(Policy = "OpTeamAndAbove")]
    public class PredictionsController : ControllerBase
    {
        private readonly IPredictionService _predictionService;
        private readonly ISlaService _slaService;
        private readonly AppDbContext _context;
        private readonly ILogger<PredictionsController> _logger;
        private readonly IPredictionCache _cache;

        public PredictionsController(
            IPredictionService predictionService,
            ISlaService slaService,
            AppDbContext context,
            ILogger<PredictionsController> logger,
            IPredictionCache cache)
        {
            _predictionService = predictionService;
            _slaService = slaService;
            _context = context;
            _logger = logger;
            _cache = cache;
        }

        [HttpPost("run")]
        public async Task<IActionResult> RunPredictions()
        {
            var stopwatch = Stopwatch.StartNew();

            int processedCount = await _predictionService.RunPredictionsAsync();

            stopwatch.Stop();
            var durationMs = stopwatch.ElapsedMilliseconds;

            var username = User.Identity?.Name ?? "Operations Team";
            var employeeId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            var initials = employee?.Initials ?? "OP";
            var color = employee?.Color ?? "#3b82f6";
            var role = employee?.Role ?? "OP. TEAM";

            var activityLog = new ActivityLog
            {
                Timestamp = DateTime.UtcNow,
                UserName = username,
                UserRole = role,
                UserInitials = initials,
                UserColor = color,
                Action = "Prediction",
                Description = $"Recomputed at-risk SLA predictions. Processed {processedCount} active orders in {durationMs}ms.",
                Reference = $"Run-{DateTime.UtcNow:yyyyMMddHHmmss}"
            };

            await _context.ActivityLogs.AddAsync(activityLog);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Predictions recomputed successfully.",
                ordersProcessed = processedCount,
                durationMs = durationMs
            });
        }

        /// <summary>
        /// Returns the stored prediction for every <i>active</i> (non-archived, non-terminal)
        /// delivery order.
        /// </summary>
        /// <remarks>
        /// <para>
        /// The <c>at-risk</c> route name is historical. By default this action deliberately
        /// returns predictions for <i>all</i> active orders rather than only those whose
        /// <c>IsAtRisk</c> flag is set. The SLA Monitoring dashboard depends on receiving the
        /// full active set: it derives its risk-distribution pie chart and all nine of its
        /// client-side filters from this payload, so narrowing the default would silently
        /// under-report Low-risk orders and break those charts.
        /// </para>
        /// <para>
        /// The route is left unrenamed on purpose — <c>AtRiskOrderDto</c> field names and this
        /// URL are part of the published frontend contract.
        /// </para>
        /// </remarks>
        /// <param name="atRiskOnly">
        /// When <c>true</c>, applies the <c>IsAtRisk</c> filter server-side. Defaults to
        /// <c>false</c> so the historical response set is preserved for existing callers.
        /// </param>
        [HttpGet("at-risk")]
        public async Task<IActionResult> GetAtRiskOrders([FromQuery] bool atRiskOnly = false)
        {
            var now = DateTime.UtcNow;

            var predictions = _context.DeliveryPredictions
                .Include(p => p.DeliveryOrder)
                .ThenInclude(o => o!.Driver)
                .Where(p => !p.DeliveryOrder!.IsArchived 
                         && p.DeliveryOrder.Status != "Delivered" 
                         && p.DeliveryOrder.Status != "Completed" 
                         && p.DeliveryOrder.Status != "Failed" 
                         && p.DeliveryOrder.Status != "Returned");

            // Opt-in server-side narrowing. Composed conditionally so the default query text
            // stays byte-for-byte what it was before this parameter existed.
            if (atRiskOnly)
            {
                predictions = predictions.Where(p => p.IsAtRisk);
            }

            var atRiskOrders = await predictions
                .AsNoTracking()
                .Select(p => new AtRiskOrderDto
                {
                    Id = p.Id,
                    DeliveryOrderId = p.DeliveryOrderId,
                    WaybillNo = p.DeliveryOrder!.WaybillNo,
                    ClientName = p.DeliveryOrder.ClientName,
                    ClientType = p.DeliveryOrder.ClientType,
                    Area = p.DeliveryOrder.Area,
                    Route = p.DeliveryOrder.Route,
                    Priority = p.DeliveryOrder.Priority,
                    Status = p.DeliveryOrder.Status,
                    DriverName = p.DeliveryOrder.Driver != null ? p.DeliveryOrder.Driver.Name : "Unassigned",
                    SlaRemainingHours = (p.DeliveryOrder.ExpectedDelivery - now).TotalHours,
                    SlaRemainingPercentage = (p.DeliveryOrder.ExpectedDelivery - now).TotalHours /
                        Math.Max(1.0, (p.DeliveryOrder.ExpectedDelivery - p.DeliveryOrder.OrderDate).TotalHours) * 100.0,
                    TimeUntilBreach = "",
                    RiskLevel = p.RiskLevel,
                    RiskScore = p.RiskScore,
                    ConfidenceScore = p.ConfidenceScore,
                    RiskReason = p.RiskReason,
                    RecommendedAction = p.RecommendedAction,
                    PredictedAt = p.PredictedAt
                })
                .ToListAsync();

            foreach (var order in atRiskOrders)
            {
                var remainingSpan = TimeSpan.FromHours(order.SlaRemainingHours);
                order.TimeUntilBreach = _slaService.FormatDuration(remainingSpan);

                // Predict arrival in days/hours based on risk level.
                //
                // CAVEAT (documented, intentionally unchanged): the four offsets below are
                // hand-picked constants, not values fitted from historical delivery data.
                // They exist only to give the dashboard a directional "predicted arrival"
                // string and must not be presented as a calibrated ETA. Deriving them from
                // the observed delay distribution per risk level requires the outcome
                // history captured in PredictionOutcomes and is deliberately out of scope
                // here; changing them would alter PredictedArrival strings that the
                // frontend already renders.
                double predictedHours = order.SlaRemainingHours;
                if (order.RiskLevel == "Critical") predictedHours += 18.5;
                else if (order.RiskLevel == "High") predictedHours += 10.0;
                else if (order.RiskLevel == "Medium") predictedHours += 3.5;
                else predictedHours = Math.Max(0.5, predictedHours - 4.0);

                if (predictedHours <= 0)
                {
                    var absDays = Math.Abs(predictedHours) / 24.0;
                    order.PredictedArrival = absDays >= 1.0 
                        ? $"Delayed by {absDays:F1} days" 
                        : $"Delayed by {Math.Abs(predictedHours):F1} hrs";
                }
                else
                {
                    var days = predictedHours / 24.0;
                    order.PredictedArrival = days >= 1.0 
                        ? $"In {days:F1} days" 
                        : $"In {predictedHours:F1} hrs";
                }
            }

            return Ok(atRiskOrders);
        }

        [HttpGet("completed")]
        public async Task<IActionResult> GetCompletedOrders()
        {
            var now = DateTime.UtcNow;

            // Single query for the whole list. OrderDate and DateCompleted ride along beside
            // the DTO purely so PredictedArrival can be formatted in memory afterwards; the
            // previous implementation re-fetched each order individually inside the loop
            // (one extra round trip per row) to read exactly these two values.
            var completedRows = await _context.DeliveryOrders
                .Include(o => o.Driver)
                .Where(o => !o.IsArchived 
                         && (o.Status == "Delivered" 
                          || o.Status == "Completed" 
                          || o.Status == "Failed" 
                          || o.Status == "Returned"))
                .AsNoTracking()
                .OrderByDescending(o => o.DateCompleted ?? o.LastUpdated)
                .Select(o => new
                {
                    Dto = new AtRiskOrderDto
                    {
                        Id = o.Id,
                        DeliveryOrderId = o.Id,
                        WaybillNo = o.WaybillNo,
                        ClientName = o.ClientName,
                        ClientType = o.ClientType,
                        Area = o.Area,
                        Route = o.Route,
                        Priority = o.Priority,
                        Status = o.Status,
                        DriverName = o.Driver != null ? o.Driver.Name : "Unassigned",
                        SlaRemainingHours = o.DateCompleted.HasValue && o.DateCompleted.Value > o.ExpectedDelivery 
                            ? (o.DateCompleted.Value - o.ExpectedDelivery).TotalHours 
                            : 0,
                        SlaRemainingPercentage = 0,
                        TimeUntilBreach = "",
                        RiskLevel = (o.DateCompleted.HasValue && o.DateCompleted.Value > o.ExpectedDelivery) || o.Status == "Failed" || o.Status == "Returned" 
                            ? "High" 
                            : "Low",
                        RiskScore = (o.DateCompleted.HasValue && o.DateCompleted.Value > o.ExpectedDelivery) || o.Status == "Failed" || o.Status == "Returned" 
                            ? 1.0 
                            : 0.0,
                        ConfidenceScore = 1.0,
                        RiskReason = o.FailureReason ?? "",
                        RecommendedAction = o.Status == "Delivered" || o.Status == "Completed" ? "Delivery Successful" : "Delivery Breached / Failed",
                        PredictedAt = o.DateCompleted ?? o.LastUpdated
                    },
                    o.OrderDate,
                    o.DateCompleted
                })
                .ToListAsync();

            var completedOrders = new List<AtRiskOrderDto>(completedRows.Count);

            foreach (var row in completedRows)
            {
                var order = row.Dto;

                // Formatting is byte-identical to the previous per-row implementation: the
                // status values compared here come from the same order row that supplied
                // OrderDate and DateCompleted, so the selected wording cannot diverge.
                if (row.DateCompleted.HasValue)
                {
                    var duration = row.DateCompleted.Value - row.OrderDate;
                    var days = duration.TotalHours / 24.0;

                    if (order.Status == "Delivered" || order.Status == "Completed")
                    {
                        order.PredictedArrival = days >= 1.0 
                            ? $"Delivered in {days:F1} days" 
                            : $"Delivered in {duration.TotalHours:F1} hrs";
                    }
                    else if (order.Status == "Failed")
                    {
                        order.PredictedArrival = days >= 1.0 
                            ? $"Failed after {days:F1} days" 
                            : $"Failed after {duration.TotalHours:F1} hrs";
                    }
                    else
                    {
                        order.PredictedArrival = days >= 1.0 
                            ? $"Returned after {days:F1} days" 
                            : $"Returned after {duration.TotalHours:F1} hrs";
                    }
                }
                else
                {
                    order.PredictedArrival = "Completed";
                }

                completedOrders.Add(order);
            }

            return Ok(completedOrders);
        }

        /// <summary>
        /// Whole-dataset SLA aggregates. Cached for a short TTL
        /// (Predictions:SummaryCacheSeconds, default 60s) and evicted automatically whenever
        /// predictions are recomputed, so a fresh recompute is visible immediately.
        /// </summary>
        [HttpGet("sla-summary")]
        public async Task<IActionResult> GetSlaSummary()
        {
            var summary = await _cache.GetOrCreateAggregateAsync(
                PredictionCache.SlaSummaryKey,
                BuildSlaSummaryAsync);

            return Ok(summary);
        }

        private async Task<SlaSummaryDto> BuildSlaSummaryAsync()
        {
            var now = DateTime.UtcNow;

            // ─── Query strategy ───────────────────────────────────────────────────────
            // This action previously issued `DeliveryOrders.AsNoTracking().ToListAsync()`
            // with no Where and no projection, materialising every column of every row —
            // including PotImage and PodImage, two nvarchar(max) base64 payloads — and then
            // filtered in LINQ-to-objects. It is now three targeted, narrowly-projected
            // queries.
            //
            // Deliberately still evaluated in memory, because moving these into SQL would
            // change the numbers this endpoint reports and Week 5 documentation already
            // cites them:
            //   * DateTime subtraction. SQL Server translates (a - b).TotalHours through
            //     DATEDIFF, which truncates to whole units and would shift every
            //     Math.Round(..., 1) result.
            //   * GroupBy on Route / Priority. LINQ-to-objects groups by ordinal string
            //     equality; SQL GROUP BY uses the database collation, which is
            //     case-insensitive by default and would merge groups that are distinct
            //     today (e.g. "Manila" and "manila").
            //   * OrderBy / OrderByDescending, which follow .NET comparer semantics.

            // Pure COUNT — no row materialisation at all.
            var activeDeliveriesCount = await _context.DeliveryOrders
                .AsNoTracking()
                .CountAsync(o =>
                    !o.IsArchived &&
                    o.Status != "Delivered" &&
                    o.Status != "Completed" &&
                    o.Status != "Failed" &&
                    o.Status != "Returned" &&
                    o.Status != "Cancelled");

            // Completed set. NOTE: no IsArchived filter, matching the original predicate
            // exactly — see the archived-orders caveat documented below.
            var completedOrders = await _context.DeliveryOrders
                .AsNoTracking()
                .Where(o =>
                    o.Status == "Delivered" ||
                    o.Status == "Completed" ||
                    o.Status == "Failed" ||
                    o.Status == "Returned")
                .Select(o => new
                {
                    o.Route,
                    o.Priority,
                    o.Status,
                    o.OrderDate,
                    o.ExpectedDelivery,
                    o.DateCompleted
                })
                .ToListAsync();

            // ─── Archived-orders inconsistency (reported, intentionally NOT changed) ───
            // The breach predicate below spans *every* order in the table, archived
            // included, while activeDeliveriesCount excludes archived rows. It also counts
            // still-active overdue orders (the !DateCompleted.HasValue branch), so
            // SlaBreachesCount is not a subset of the completed set either. That mixed
            // scope is almost certainly unintended, but the figures are already published,
            // so the predicate is reproduced verbatim rather than corrected here.
            var breachedOrders = await _context.DeliveryOrders
                .AsNoTracking()
                .Where(o =>
                    (o.DateCompleted.HasValue && o.DateCompleted.Value > o.ExpectedDelivery) ||
                    o.Status == "Failed" ||
                    o.Status == "Returned" ||
                    (!o.DateCompleted.HasValue && o.ExpectedDelivery < now && o.Status != "Cancelled"))
                .Select(o => new { o.ExpectedDelivery, o.DateCompleted })
                .ToListAsync();

            var totalCompleted = completedOrders.Count;
            var completedOnTime = completedOrders.Count(o => 
                o.DateCompleted <= o.ExpectedDelivery && 
                o.Status != "Failed" && 
                o.Status != "Returned"
            );
            var overallOnTimePercentage = totalCompleted > 0 
                ? (double)completedOnTime / totalCompleted * 100.0 
                : 100.0;

            // Identical predicate to breachedOrders, so this stays equal to its Count as
            // it was when both were computed from the same in-memory list.
            var slaBreachesCount = breachedOrders.Count;

            var atRiskCount = await _context.DeliveryPredictions
                .CountAsync(p => p.IsAtRisk && !p.DeliveryOrder!.IsArchived);

            double averageDelayHours = 0;
            if (breachedOrders.Any())
            {
                averageDelayHours = breachedOrders.Average(o => {
                    if (o.DateCompleted.HasValue) 
                        return (o.DateCompleted.Value - o.ExpectedDelivery).TotalHours;
                    return (now - o.ExpectedDelivery).TotalHours;
                });
            }

            var completedOnTimeOrLate = completedOrders.Where(o => o.DateCompleted.HasValue).ToList();
            double averageDeliveryDurationHours = 0;
            if (completedOnTimeOrLate.Any())
            {
                averageDeliveryDurationHours = completedOnTimeOrLate.Average(o => 
                    (o.DateCompleted!.Value - o.OrderDate).TotalHours
                );
            }

            var routeBreakdown = completedOrders
                .GroupBy(o => o.Route)
                .Select(g => {
                    var total = g.Count();
                    var breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned");
                    var onTime = total - breached;
                    
                    var breachedList = g.Where(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned").ToList();
                    double avgDelayHours = 0;
                    if (breachedList.Any())
                    {
                        avgDelayHours = breachedList.Average(o => {
                            if (o.DateCompleted.HasValue) return (o.DateCompleted.Value - o.ExpectedDelivery).TotalHours;
                            return (now - o.ExpectedDelivery).TotalHours;
                        });
                    }

                    return new RouteSlaPerformanceDto
                    {
                        Route = string.IsNullOrEmpty(g.Key) ? "Unknown Route" : g.Key,
                        TotalOrders = total,
                        BreachedCount = breached,
                        OnTimePercentage = total > 0 ? (double)onTime / total * 100.0 : 100.0,
                        AverageDelayHours = avgDelayHours
                    };
                })
                .OrderBy(r => r.OnTimePercentage)
                .ToList();

            var priorityBreakdown = completedOrders
                .GroupBy(o => o.Priority)
                .Select(g => {
                    var total = g.Count();
                    var breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned");
                    var onTime = total - breached;
                    return new PrioritySlaPerformanceDto
                    {
                        Priority = string.IsNullOrEmpty(g.Key) ? "Medium" : g.Key,
                        TotalOrders = total,
                        BreachedCount = breached,
                        OnTimePercentage = total > 0 ? (double)onTime / total * 100.0 : 100.0
                    };
                })
                .OrderByDescending(p => p.Priority)
                .ToList();

            var summary = new SlaSummaryDto
            {
                ActiveDeliveriesCount = activeDeliveriesCount,
                OverallOnTimePercentage = Math.Round(overallOnTimePercentage, 1),
                SlaBreachesCount = slaBreachesCount,
                AtRiskCount = atRiskCount,
                AverageDelayHours = Math.Round(averageDelayHours, 1),
                AverageDeliveryDurationHours = Math.Round(averageDeliveryDurationHours, 1),
                RouteBreakdown = routeBreakdown,
                PriorityBreakdown = priorityBreakdown
            };

            return summary;
        }

        /// <summary>
        /// Reports how well the prediction model has actually performed, as a confusion matrix
        /// plus accuracy, precision, recall and F1.
        /// </summary>
        /// <remarks>
        /// Computed exclusively from <c>PredictionOutcomes</c>, where each row pairs a real
        /// delivery result with the prediction that existed <i>before</i> that result was known.
        /// <c>GET /completed</c> cannot be used for this: it derives its prediction fields from
        /// the outcome, so any accuracy taken from it would be 100% by construction.
        /// <para>
        /// Inherits the class-level <c>OpTeamAndAbove</c> authorization policy.
        /// </para>
        /// </remarks>
        /// <param name="from">Optional inclusive lower bound on OutcomeRecordedAt (UTC).</param>
        /// <param name="to">Optional inclusive upper bound on OutcomeRecordedAt (UTC).</param>
        [HttpGet("accuracy")]
        public async Task<IActionResult> GetPredictionAccuracy(
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            var outcomes = _context.PredictionOutcomes.AsNoTracking();

            if (from.HasValue)
            {
                outcomes = outcomes.Where(o => o.OutcomeRecordedAt >= from.Value);
            }

            if (to.HasValue)
            {
                outcomes = outcomes.Where(o => o.OutcomeRecordedAt <= to.Value);
            }

            // One round trip for all four cells and the window bounds. GroupBy(_ => 1) makes
            // this a single whole-set aggregate; it yields no row at all when the filtered set
            // is empty, which is the cold-start case handled below.
            var matrix = await outcomes
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TruePositives  = g.Count(o => o.PredictedAtRisk && o.ActuallyBreached),
                    FalsePositives = g.Count(o => o.PredictedAtRisk && !o.ActuallyBreached),
                    TrueNegatives  = g.Count(o => !o.PredictedAtRisk && !o.ActuallyBreached),
                    FalseNegatives = g.Count(o => !o.PredictedAtRisk && o.ActuallyBreached),
                    RowCount       = g.Count(),
                    PeriodStart    = g.Min(o => (DateTime?)o.OutcomeRecordedAt),
                    PeriodEnd      = g.Max(o => (DateTime?)o.OutcomeRecordedAt)
                })
                .FirstOrDefaultAsync();

            // Cold start: no outcomes recorded yet. Returns 200 with an explicit zero state and
            // null period bounds so the caller can distinguish "not yet validated" from a
            // genuinely measured score of zero.
            if (matrix == null || matrix.RowCount == 0)
            {
                return Ok(new PredictionAccuracyDto());
            }

            var truePositives  = matrix.TruePositives;
            var falsePositives = matrix.FalsePositives;
            var trueNegatives  = matrix.TrueNegatives;
            var falseNegatives = matrix.FalseNegatives;

            // The four predicates partition the set exactly (two booleans, four combinations),
            // so deriving TotalEvaluated from the cells makes the documented invariant
            // TP + FP + TN + FN == TotalEvaluated true by construction. A mismatch against the
            // raw row count would mean a NULL crept into a non-nullable bit column, so it is
            // logged rather than silently absorbed — and never thrown, because this endpoint
            // must not return 500 for a reporting anomaly.
            var totalEvaluated = truePositives + falsePositives + trueNegatives + falseNegatives;

            if (totalEvaluated != matrix.RowCount)
            {
                _logger.LogWarning(
                    "Prediction accuracy confusion matrix does not tie out: cells sum to {CellSum} but {RowCount} outcome rows matched the filter.",
                    totalEvaluated,
                    matrix.RowCount);
            }

            // Unrounded, so F1 stays arithmetically consistent with the cell counts rather than
            // compounding two already-rounded inputs.
            var precision = SafeRatio(truePositives, truePositives + falsePositives);
            var recall    = SafeRatio(truePositives, truePositives + falseNegatives);
            var accuracy  = SafeRatio(truePositives + trueNegatives, totalEvaluated);
            var f1        = (precision + recall) <= 0.0
                ? 0.0
                : 2.0 * precision * recall / (precision + recall);

            return Ok(new PredictionAccuracyDto
            {
                TruePositives  = truePositives,
                FalsePositives = falsePositives,
                TrueNegatives  = trueNegatives,
                FalseNegatives = falseNegatives,
                Accuracy       = Math.Round(accuracy, 3),
                Precision      = Math.Round(precision, 3),
                Recall         = Math.Round(recall, 3),
                F1Score        = Math.Round(f1, 3),
                TotalEvaluated = totalEvaluated,
                EvaluationPeriodStart = matrix.PeriodStart,
                EvaluationPeriodEnd   = matrix.PeriodEnd
            });
        }

        /// <summary>
        /// Division that yields 0 for a zero (or negative) denominator instead of NaN or a
        /// DivideByZeroException. Every metric on this endpoint has an empty-set case.
        /// </summary>
        private static double SafeRatio(int numerator, int denominator)
        {
            return denominator <= 0 ? 0.0 : (double)numerator / denominator;
        }

        /// <summary>
        /// Per-driver SLA aggregates. Cached and evicted on the same terms as
        /// <see cref="GetSlaSummary"/>.
        /// </summary>
        [HttpGet("driver-performance")]
        public async Task<IActionResult> GetDriverPerformance()
        {
            var performance = await _cache.GetOrCreateAggregateAsync(
                PredictionCache.DriverPerformanceKey,
                BuildDriverPerformanceAsync);

            return Ok(performance);
        }

        private async Task<List<DriverSlaPerformanceDto>> BuildDriverPerformanceAsync()
        {
            var now = DateTime.UtcNow;

            // Narrow projection rather than full entities: the previous version materialised
            // every completed order in full, including the PotImage/PodImage nvarchar(max)
            // base64 columns, purely to read six fields. Grouping stays in memory so the
            // ordinal DriverId grouping and .NET ordering semantics are unchanged.
            var completedOrders = await _context.DeliveryOrders
                .Where(o => o.DriverId != null && (o.Status == "Delivered" || o.Status == "Completed" || o.Status == "Failed" || o.Status == "Returned"))
                .AsNoTracking()
                .Select(o => new
                {
                    o.DriverId,
                    DriverName = o.Driver != null ? o.Driver.Name : null,
                    o.Status,
                    o.ExpectedDelivery,
                    o.DateCompleted
                })
                .ToListAsync();

            var driverPerformance = completedOrders
                .GroupBy(o => o.DriverId)
                .Select(g => {
                    var firstOrder = g.First();
                    var driverName = firstOrder.DriverName ?? "Unknown Driver";
                    var total = g.Count();
                    var breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned");
                    var onTime = total - breached;

                    double averageDelayHours = 0;
                    var breachedList = g.Where(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned").ToList();
                    if (breachedList.Any())
                    {
                        averageDelayHours = breachedList.Average(o => {
                            if (o.DateCompleted.HasValue) return (o.DateCompleted.Value - o.ExpectedDelivery).TotalHours;
                            return (now - o.ExpectedDelivery).TotalHours;
                        });
                    }

                    return new DriverSlaPerformanceDto
                    {
                        DriverName = driverName,
                        OnTimePercentage = total > 0 ? Math.Round((double)onTime / total * 100.0, 1) : 100.0,
                        DeliveriesCount = total,
                        BreachedCount = breached,
                        AverageDelayHours = Math.Round(averageDelayHours, 1)
                    };
                })
                .OrderByDescending(d => d.OnTimePercentage)
                .ToList();

            return driverPerformance;
        }
    }
}
