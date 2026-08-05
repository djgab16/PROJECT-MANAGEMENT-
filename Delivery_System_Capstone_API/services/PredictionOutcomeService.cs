using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Services
{
    /// <inheritdoc cref="IPredictionOutcomeService"/>
    public class PredictionOutcomeService : IPredictionOutcomeService
    {
        /// <summary>
        /// The four terminal statuses. "Cancelled" is deliberately excluded: a cancelled order
        /// was never attempted, so scoring the prediction against it would pollute the matrix
        /// with outcomes the model was never trying to predict. This also matches the existing
        /// breach definition, which excludes Cancelled.
        /// </summary>
        private static readonly string[] TerminalStatuses =
        {
            "Delivered",
            "Completed",
            "Failed",
            "Returned"
        };

        private readonly AppDbContext _context;
        private readonly ILogger<PredictionOutcomeService> _logger;

        public PredictionOutcomeService(AppDbContext context, ILogger<PredictionOutcomeService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public bool IsTerminalStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return false;
            }

            return TerminalStatuses.Contains(status, StringComparer.OrdinalIgnoreCase);
        }

        public async Task<bool> TryCaptureOutcomeAsync(
            DeliveryOrder order,
            CancellationToken cancellationToken = default)
        {
            if (order == null || !IsTerminalStatus(order.Status))
            {
                return false;
            }

            // ─── Idempotency ───────────────────────────────────────────────────────────
            // The unique index on DeliveryOrderId is the hard backstop; these two checks
            // stop a duplicate from ever reaching it. The first covers a status update that
            // fires twice across separate requests, the second covers two capture attempts
            // inside a single unit of work (for example a bulk operation that touches the
            // same order more than once).
            var alreadyRecorded = await _context.PredictionOutcomes
                .AsNoTracking()
                .AnyAsync(o => o.DeliveryOrderId == order.Id, cancellationToken);

            if (alreadyRecorded)
            {
                _logger.LogDebug(
                    "Outcome for order {OrderId} ({WaybillNo}) is already recorded. Skipping to keep accuracy counts stable.",
                    order.Id,
                    order.WaybillNo);
                return false;
            }

            var queuedInThisUnitOfWork = _context.ChangeTracker
                .Entries<PredictionOutcome>()
                .Any(e => e.State == EntityState.Added && e.Entity.DeliveryOrderId == order.Id);

            if (queuedInThisUnitOfWork)
            {
                _logger.LogDebug(
                    "Outcome for order {OrderId} ({WaybillNo}) is already queued in this unit of work. Skipping.",
                    order.Id,
                    order.WaybillNo);
                return false;
            }

            // ─── Snapshot the prediction as it was BEFORE the outcome was known ────────
            // Read-only, and never recomputed here. Recomputing at capture time would let
            // the known result influence the "prediction" and reproduce the circularity
            // that makes GET /completed unusable for accuracy measurement.
            var prediction = await _context.DeliveryPredictions
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.DeliveryOrderId == order.Id, cancellationToken);

            if (prediction == null)
            {
                // Expected for orders that completed before this feature shipped, and for
                // orders that never sat in an active state long enough to be scored.
                // Inventing a prediction here would fabricate data, so the order is skipped.
                _logger.LogDebug(
                    "No stored prediction for order {OrderId} ({WaybillNo}); skipping outcome capture rather than inventing one.",
                    order.Id,
                    order.WaybillNo);
                return false;
            }

            var outcome = new PredictionOutcome
            {
                DeliveryOrderId = order.Id,
                WaybillNo = order.WaybillNo,
                PredictedAtRisk = prediction.IsAtRisk,
                PredictedRiskScore = prediction.RiskScore,
                PredictedRiskLevel = prediction.RiskLevel,
                PredictedConfidence = prediction.ConfidenceScore,
                ActuallyBreached = IsBreached(order),
                PredictionMadeAt = prediction.PredictedAt,
                OutcomeRecordedAt = DateTime.UtcNow
            };

            await _context.PredictionOutcomes.AddAsync(outcome, cancellationToken);

            _logger.LogInformation(
                "Captured prediction outcome for {WaybillNo}: predictedAtRisk={PredictedAtRisk}, actuallyBreached={ActuallyBreached}, predictedLevel={RiskLevel}.",
                order.WaybillNo,
                outcome.PredictedAtRisk,
                outcome.ActuallyBreached,
                outcome.PredictedRiskLevel);

            return true;
        }

        /// <summary>
        /// The codebase's breach definition, unchanged:
        /// <c>DateCompleted &gt; ExpectedDelivery || Status == "Failed" || Status == "Returned"</c>.
        /// </summary>
        private static bool IsBreached(DeliveryOrder order)
        {
            if (order.DateCompleted.HasValue && order.DateCompleted.Value > order.ExpectedDelivery)
            {
                return true;
            }

            return string.Equals(order.Status, "Failed", StringComparison.OrdinalIgnoreCase)
                || string.Equals(order.Status, "Returned", StringComparison.OrdinalIgnoreCase);
        }
    }
}
