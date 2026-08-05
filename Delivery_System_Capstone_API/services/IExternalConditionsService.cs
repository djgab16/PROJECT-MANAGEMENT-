using System;
using System.Threading;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Services
{
    /// <summary>
    /// Supplies a normalised operating-conditions risk in <c>[0.0, 1.0]</c> for a given
    /// route, area and timestamp — the input to factor 8 of the scoring model.
    /// </summary>
    /// <remarks>
    /// Deliberately narrow so the default local-history implementation can be swapped for a
    /// real traffic or weather provider without touching <see cref="PredictionService"/>.
    /// <para>
    /// The two-stage shape (build a snapshot once, then query it synchronously per order) is
    /// what keeps a full recompute free of per-order I/O: <c>RunPredictionsAsync</c> creates
    /// one snapshot before its loop and every lookup inside the loop is in-memory. A future
    /// HTTP-backed provider should fetch and cache inside
    /// <see cref="CreateSnapshotAsync"/> for the same reason.
    /// </para>
    /// </remarks>
    public interface IExternalConditionsService
    {
        /// <summary>
        /// Builds an immutable snapshot of everything needed to score conditions. Call once
        /// per prediction run, never per order.
        /// </summary>
        Task<IConditionsSnapshot> CreateSnapshotAsync(CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// An immutable, in-memory view of operating conditions. Lookups must not perform I/O.
    /// </summary>
    public interface IConditionsSnapshot
    {
        /// <summary>
        /// Returns the conditions risk for a delivery, normalised to <c>[0.0, 1.0]</c> where
        /// 0 is ideal conditions and 1 is the worst observed.
        /// </summary>
        /// <param name="route">Delivery route; may be null or empty.</param>
        /// <param name="area">Delivery area, used as a fallback key when route is missing.</param>
        /// <param name="timestampUtc">The UTC instant to score, normally ExpectedDelivery.</param>
        double GetConditionsRisk(string? route, string? area, DateTime timestampUtc);
    }
}
