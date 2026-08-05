using System.Threading;
using System.Threading.Tasks;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    /// <summary>
    /// Captures the real delivery result against the prediction that preceded it, so model
    /// accuracy can be measured from data that is not derived from the outcome itself.
    /// </summary>
    public interface IPredictionOutcomeService
    {
        /// <summary>
        /// Returns true when <paramref name="status"/> is one of the four terminal statuses
        /// used consistently across the codebase: Delivered, Completed, Failed, Returned.
        /// </summary>
        bool IsTerminalStatus(string? status);

        /// <summary>
        /// Queues a <see cref="PredictionOutcome"/> for the supplied order if, and only if,
        /// the order has reached a terminal status, still has no recorded outcome, and
        /// already has a stored prediction to snapshot.
        /// </summary>
        /// <remarks>
        /// Deliberately does <b>not</b> call SaveChanges. The new row is added to the caller's
        /// change tracker so it commits inside the caller's existing unit of work, keeping the
        /// outcome and the status transition atomic.
        /// </remarks>
        /// <param name="order">
        /// The order with its <i>new</i> terminal status and DateCompleted already applied.
        /// </param>
        /// <returns>True when an outcome row was queued; false when the call was a no-op.</returns>
        Task<bool> TryCaptureOutcomeAsync(DeliveryOrder order, CancellationToken cancellationToken = default);
    }
}
