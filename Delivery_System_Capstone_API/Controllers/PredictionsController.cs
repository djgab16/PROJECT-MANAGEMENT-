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
        private readonly IMlRiskModelService? _mlModelService;

        /// <param name="mlModelService">
        /// Optional so the controller stays constructible for the endpoints that predate the
        /// learned model. The container always supplies it; when absent, the model endpoints
        /// report "no model" rather than failing, and the heuristic endpoints are unaffected.
        /// </param>
        public PredictionsController(
            IPredictionService predictionService,
            ISlaService slaService,
            AppDbContext context,
            ILogger<PredictionsController> logger,
            IPredictionCache cache,
            IMlRiskModelService? mlModelService = null)
        {
            _predictionService = predictionService;
            _slaService = slaService;
            _context = context;
            _logger = logger;
            _cache = cache;
            _mlModelService = mlModelService;
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

            // The four predicates partition the set exactly (two booleans, four combinations),
            // so deriving TotalEvaluated from the cells makes the documented invariant
            // TP + FP + TN + FN == TotalEvaluated true by construction. A mismatch against the
            // raw row count would mean a NULL crept into a non-nullable bit column, so it is
            // logged rather than silently absorbed — and never thrown, because this endpoint
            // must not return 500 for a reporting anomaly.
            var result = BuildAccuracy(
                matrix.TruePositives,
                matrix.FalsePositives,
                matrix.TrueNegatives,
                matrix.FalseNegatives,
                matrix.PeriodStart,
                matrix.PeriodEnd);

            if (result.TotalEvaluated != matrix.RowCount)
            {
                _logger.LogWarning(
                    "Prediction accuracy confusion matrix does not tie out: cells sum to {CellSum} but {RowCount} outcome rows matched the filter.",
                    result.TotalEvaluated,
                    matrix.RowCount);
            }

            return Ok(result);
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
        /// Builds the metric set from four confusion-matrix cells.
        /// </summary>
        /// <remarks>
        /// Shared by <see cref="GetPredictionAccuracy"/> and
        /// <see cref="CompareModelAccuracy"/> so the two endpoints cannot report the same
        /// situation differently. Precision and recall are combined into F1 before rounding, so
        /// F1 stays consistent with the cells instead of compounding two rounded inputs.
        /// </remarks>
        private static PredictionAccuracyDto BuildAccuracy(
            int truePositives,
            int falsePositives,
            int trueNegatives,
            int falseNegatives,
            DateTime? periodStart,
            DateTime? periodEnd)
        {
            var totalEvaluated = truePositives + falsePositives + trueNegatives + falseNegatives;

            var precision = SafeRatio(truePositives, truePositives + falsePositives);
            var recall    = SafeRatio(truePositives, truePositives + falseNegatives);
            var accuracy  = SafeRatio(truePositives + trueNegatives, totalEvaluated);
            var f1        = (precision + recall) <= 0.0
                ? 0.0
                : 2.0 * precision * recall / (precision + recall);

            return new PredictionAccuracyDto
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
                EvaluationPeriodStart = periodStart,
                EvaluationPeriodEnd   = periodEnd
            };
        }

        /// <summary>
        /// Reports the active learned model: when it was fitted, on how much data, and the
        /// coefficient it assigned to each factor next to that factor's hand-set weight.
        /// </summary>
        /// <remarks>
        /// Inherits the class-level <c>OpTeamAndAbove</c> authorization policy.
        /// </remarks>
        [HttpGet("model")]
        public async Task<IActionResult> GetActiveModel()
        {
            if (_mlModelService == null)
            {
                return Ok(new PredictionModelInfoDto { HasActiveModel = false });
            }

            var info = await _mlModelService.GetActiveModelInfoAsync();
            return Ok(info);
        }

        /// <summary>
        /// Fits a logistic-regression model and makes it active.
        /// </summary>
        /// <remarks>
        /// Training never alters the live risk scores. The fitted model runs in shadow only, and
        /// only once <c>Predictions:Ml:Enabled</c> is set.
        /// <para>
        /// Inherits the class-level <c>OpTeamAndAbove</c> authorization policy.
        /// </para>
        /// </remarks>
        /// <param name="source">
        /// <c>outcomes</c> (default) fits on real recorded results that carry captured features.
        /// <c>synthetic</c> fits on generated data so the pipeline can be demonstrated before
        /// enough real outcomes exist; the resulting model is tagged accordingly and its metrics
        /// describe the generator, not the business.
        /// </param>
        /// <param name="sampleCount">Rows to generate. Applies to <c>synthetic</c> only.</param>
        /// <param name="seed">Generator seed, so a demonstration is reproducible. Applies to <c>synthetic</c> only.</param>
        [HttpPost("model/train")]
        public async Task<IActionResult> TrainModel(
            [FromQuery] string source = "outcomes",
            [FromQuery] int sampleCount = 600,
            [FromQuery] int seed = 20260805)
        {
            if (_mlModelService == null)
            {
                return Conflict(new { message = "The learned-model service is not available in this configuration." });
            }

            var normalised = (source ?? string.Empty).Trim().ToLowerInvariant();

            ModelTrainingResult result;

            switch (normalised)
            {
                case "outcomes":
                    result = await _mlModelService.TrainFromOutcomesAsync();
                    break;

                case "synthetic":
                    result = await _mlModelService.TrainFromSyntheticAsync(sampleCount, seed);
                    break;

                default:
                    return BadRequest(new
                    {
                        message = "source must be either 'outcomes' or 'synthetic'."
                    });
            }

            if (!result.Success)
            {
                // 409 rather than 400: the request was well formed, the data is simply not in a
                // state that can be fitted yet. The reason is returned verbatim because it tells
                // the operator what has to happen before training can succeed.
                return Conflict(new { message = result.FailureReason });
            }

            _logger.LogInformation(
                "Risk model retrained from {Source} by {User}.",
                normalised,
                User.Identity?.Name ?? "Operations Team");

            return Ok(result.Info);
        }

        /// <summary>
        /// Grades the rule-based scorer and the learned model against each other on the identical
        /// set of recorded outcomes.
        /// </summary>
        /// <remarks>
        /// Restricted to outcomes where the model actually produced a verdict, so neither side is
        /// credited or penalised for rows the other never saw. Measuring the heuristic across all
        /// history against a model that only covers recent orders would favour whichever happened
        /// to get the easier deliveries.
        /// <para>
        /// Inherits the class-level <c>OpTeamAndAbove</c> authorization policy.
        /// </para>
        /// </remarks>
        /// <param name="from">Optional inclusive lower bound on OutcomeRecordedAt (UTC).</param>
        /// <param name="to">Optional inclusive upper bound on OutcomeRecordedAt (UTC).</param>
        [HttpGet("accuracy/comparison")]
        public async Task<IActionResult> CompareModelAccuracy(
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            // Degrades to reporting the matrices without model provenance rather than failing.
            var activeModel = _mlModelService == null
                ? new PredictionModelInfoDto { HasActiveModel = false }
                : await _mlModelService.GetActiveModelInfoAsync();

            var outcomes = _context.PredictionOutcomes
                .AsNoTracking()
                .Where(o => o.MlPredictedAtRisk != null);

            if (from.HasValue)
            {
                outcomes = outcomes.Where(o => o.OutcomeRecordedAt >= from.Value);
            }

            if (to.HasValue)
            {
                outcomes = outcomes.Where(o => o.OutcomeRecordedAt <= to.Value);
            }

            // Both matrices in one round trip, over one row set, so the two sides are guaranteed
            // to describe the same deliveries.
            var matrix = await outcomes
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    HeuristicTp = g.Count(o => o.PredictedAtRisk && o.ActuallyBreached),
                    HeuristicFp = g.Count(o => o.PredictedAtRisk && !o.ActuallyBreached),
                    HeuristicTn = g.Count(o => !o.PredictedAtRisk && !o.ActuallyBreached),
                    HeuristicFn = g.Count(o => !o.PredictedAtRisk && o.ActuallyBreached),

                    ModelTp = g.Count(o => o.MlPredictedAtRisk == true && o.ActuallyBreached),
                    ModelFp = g.Count(o => o.MlPredictedAtRisk == true && !o.ActuallyBreached),
                    ModelTn = g.Count(o => o.MlPredictedAtRisk == false && !o.ActuallyBreached),
                    ModelFn = g.Count(o => o.MlPredictedAtRisk == false && o.ActuallyBreached),

                    RowCount    = g.Count(),
                    PeriodStart = g.Min(o => (DateTime?)o.OutcomeRecordedAt),
                    PeriodEnd   = g.Max(o => (DateTime?)o.OutcomeRecordedAt)
                })
                .FirstOrDefaultAsync();

            // Cold start: the model has not scored any delivery that has since completed. Zeroed
            // matrices with null bounds, so "no comparison yet" stays distinguishable from "the
            // model scored zero".
            if (matrix == null || matrix.RowCount == 0)
            {
                return Ok(new ModelAccuracyComparisonDto
                {
                    ComparableOutcomes = 0,
                    Heuristic = new PredictionAccuracyDto(),
                    Model = new PredictionAccuracyDto(),
                    F1Delta = 0.0,
                    ActiveModel = activeModel.HasActiveModel ? activeModel : null
                });
            }

            var heuristic = BuildAccuracy(
                matrix.HeuristicTp, matrix.HeuristicFp, matrix.HeuristicTn, matrix.HeuristicFn,
                matrix.PeriodStart, matrix.PeriodEnd);

            var model = BuildAccuracy(
                matrix.ModelTp, matrix.ModelFp, matrix.ModelTn, matrix.ModelFn,
                matrix.PeriodStart, matrix.PeriodEnd);

            if (heuristic.TotalEvaluated != matrix.RowCount || model.TotalEvaluated != matrix.RowCount)
            {
                _logger.LogWarning(
                    "Model comparison matrices do not tie out: heuristic {HeuristicSum}, model {ModelSum}, rows {RowCount}.",
                    heuristic.TotalEvaluated,
                    model.TotalEvaluated,
                    matrix.RowCount);
            }

            return Ok(new ModelAccuracyComparisonDto
            {
                ComparableOutcomes = matrix.RowCount,
                Heuristic = heuristic,
                Model = model,
                F1Delta = Math.Round(model.F1Score - heuristic.F1Score, 3),
                ActiveModel = activeModel.HasActiveModel ? activeModel : null
            });
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
