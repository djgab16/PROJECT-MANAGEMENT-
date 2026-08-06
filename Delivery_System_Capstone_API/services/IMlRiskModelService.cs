using System.Threading;
using System.Threading.Tasks;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    /// <summary>
    /// An immutable, already-loaded model that scores feature vectors without touching the
    /// database.
    /// </summary>
    /// <remarks>
    /// Deliberately mirrors <see cref="IConditionsSnapshot"/>: resolve once per recompute, then
    /// score every order from memory. A per-order model lookup would reintroduce exactly the
    /// N+1 pattern the prediction loop is built to avoid.
    /// </remarks>
    public interface IMlRiskScorer
    {
        /// <summary>Identifier of the <see cref="PredictionModel"/> behind this scorer.</summary>
        int ModelId { get; }

        /// <summary>Probability at or above which an order is called at risk.</summary>
        double DecisionThreshold { get; }

        /// <summary>Probability of breach in <c>[0,1]</c>.</summary>
        double PredictProbability(PredictionFeatureVector features);

        /// <summary>True when <see cref="PredictProbability"/> reaches <see cref="DecisionThreshold"/>.</summary>
        bool IsAtRisk(PredictionFeatureVector features);
    }

    /// <summary>Outcome of a training attempt.</summary>
    /// <remarks>
    /// A result object rather than an exception, because "not enough data yet" is an ordinary
    /// and expected state on a fresh install, not a fault. The caller can surface
    /// <paramref name="FailureReason"/> verbatim.
    /// </remarks>
    /// <param name="Success">True when a model was fitted and persisted.</param>
    /// <param name="FailureReason">Operator-facing explanation when <paramref name="Success"/> is false.</param>
    /// <param name="Info">Diagnostics for the newly active model when training succeeded.</param>
    public sealed record ModelTrainingResult(
        bool Success,
        string? FailureReason,
        PredictionModelInfoDto? Info)
    {
        public static ModelTrainingResult Failed(string reason) => new(false, reason, null);

        public static ModelTrainingResult Succeeded(PredictionModelInfoDto info) => new(true, null, info);
    }

    /// <summary>
    /// Fits, stores and applies the learned risk model that runs in shadow alongside the
    /// rule-based scorer.
    /// </summary>
    public interface IMlRiskModelService
    {
        /// <summary>
        /// True when <c>Predictions:Ml:Enabled</c> is set. When false, no shadow score is
        /// computed or written and the heuristic behaves exactly as it did before this feature.
        /// </summary>
        bool IsEnabled { get; }

        /// <summary>
        /// Loads the active model, or null when shadow scoring is disabled or nothing has been
        /// trained yet. Callers treat null as "skip shadow scoring", never as a zero score.
        /// </summary>
        Task<IMlRiskScorer?> GetActiveScorerAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Fits a model on recorded outcomes that carry captured features, then makes it active.
        /// </summary>
        Task<ModelTrainingResult> TrainFromOutcomesAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Fits a model on generated data so the pipeline can be demonstrated before enough real
        /// outcomes exist.
        /// </summary>
        /// <remarks>
        /// The generated rows are held in memory and never written to
        /// <see cref="PredictionOutcome"/>, so the real accuracy measurement stays uncontaminated.
        /// The resulting model is tagged <c>Synthetic</c>; any metric taken from it describes the
        /// generator, not the business.
        /// </remarks>
        /// <param name="sampleCount">Rows to generate.</param>
        /// <param name="seed">Fixed seed, so a demonstration is reproducible.</param>
        Task<ModelTrainingResult> TrainFromSyntheticAsync(
            int sampleCount = 600,
            int seed = 20260805,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Provenance and fitted coefficients for the active model, or
        /// <see cref="PredictionModelInfoDto.HasActiveModel"/> false when none exists.
        /// </summary>
        Task<PredictionModelInfoDto> GetActiveModelInfoAsync(CancellationToken cancellationToken = default);
    }
}
