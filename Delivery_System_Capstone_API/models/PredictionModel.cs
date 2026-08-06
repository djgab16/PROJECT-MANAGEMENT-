using System;
using System.ComponentModel.DataAnnotations;

namespace SPXDeliveryAPI.Models
{
    /// <summary>
    /// A trained logistic-regression model: the fitted intercept and one coefficient per factor,
    /// plus the provenance needed to judge whether the fit is trustworthy.
    /// </summary>
    /// <remarks>
    /// Coefficients are stored as eight <b>named</b> columns rather than a serialised array, so
    /// the pairing between a coefficient and the factor it belongs to is enforced by the schema
    /// instead of by an implicit positional convention. A JSON blob would let a future feature
    /// reordering re-map every coefficient onto the wrong factor with no schema change and no
    /// error — the model would keep scoring, just wrongly.
    /// <para>
    /// Rows are immutable once written and never updated in place. Retraining inserts a new row
    /// and clears <see cref="IsActive"/> on the previous one, so every model that has ever
    /// driven a prediction stays auditable. That matters because
    /// <see cref="PredictionOutcome"/> rows recorded under an older model must remain
    /// interpretable after a retrain.
    /// </para>
    /// </remarks>
    public class PredictionModel
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Exactly one row is active at a time; that row is the model used for shadow scoring.
        /// Enforced by a filtered unique index in <c>AppDbContext</c>.
        /// </summary>
        [Required]
        public bool IsActive { get; set; }

        [Required]
        public double Intercept { get; set; }

        /// <summary>Fitted coefficient for factor 1 (heuristic weight 0.35).</summary>
        [Required]
        public double CoefSlaRemainingTime { get; set; }

        /// <summary>Fitted coefficient for factor 2 (heuristic weight 0.15).</summary>
        [Required]
        public double CoefPriority { get; set; }

        /// <summary>Fitted coefficient for factor 3 (heuristic weight 0.15).</summary>
        [Required]
        public double CoefRedeliveryAttempts { get; set; }

        /// <summary>Fitted coefficient for factor 4 (heuristic weight 0.15).</summary>
        [Required]
        public double CoefDriverHistory { get; set; }

        /// <summary>Fitted coefficient for factor 5 (heuristic weight 0.10).</summary>
        [Required]
        public double CoefRouteHistory { get; set; }

        /// <summary>Fitted coefficient for factor 6 (heuristic weight 0.05).</summary>
        [Required]
        public double CoefPackage { get; set; }

        /// <summary>Fitted coefficient for factor 7 (heuristic weight 0.03).</summary>
        [Required]
        public double CoefClientType { get; set; }

        /// <summary>Fitted coefficient for factor 8 (heuristic weight 0.02).</summary>
        [Required]
        public double CoefConditions { get; set; }

        /// <summary>Rows the fit was computed from.</summary>
        [Required]
        public int SampleCount { get; set; }

        /// <summary>
        /// Rows in the training set that actually breached. Reported alongside
        /// <see cref="SampleCount"/> because a fit on a set with almost no positives will look
        /// accurate while never predicting a breach, and the two numbers together make that
        /// visible instead of hiding it behind a single accuracy figure.
        /// </summary>
        [Required]
        public int PositiveCount { get; set; }

        /// <summary>Mean binary cross-entropy on the training set.</summary>
        [Required]
        public double TrainingLogLoss { get; set; }

        /// <summary>
        /// Probability at or above which the model calls an order at risk. Persisted with the
        /// model so a stored model reproduces exactly the decisions it made when live, even if
        /// the configured default changes later.
        /// </summary>
        [Required]
        public double DecisionThreshold { get; set; }

        [Required]
        public int Epochs { get; set; }

        [Required]
        public double LearningRate { get; set; }

        [Required]
        public double L2 { get; set; }

        /// <summary>
        /// Where the training rows came from: <c>Outcomes</c> for real recorded results, or
        /// <c>Synthetic</c> for generated demonstration data.
        /// </summary>
        /// <remarks>
        /// Kept explicit so a model fitted on generated data can never be mistaken for one
        /// validated against real deliveries. Any figure derived from a Synthetic model
        /// describes the generator, not the business.
        /// </remarks>
        [Required]
        [MaxLength(20)]
        public string TrainingSource { get; set; } = "Outcomes";

        [Required]
        public DateTime TrainedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Projects the stored coefficients back into positional order.</summary>
        /// <remarks>
        /// The order here is the one place the named columns are mapped onto
        /// <see cref="PredictionFeatureVector.Names"/>, and it must stay in step with them.
        /// </remarks>
        public double[] ToCoefficientArray() => new[]
        {
            CoefSlaRemainingTime,
            CoefPriority,
            CoefRedeliveryAttempts,
            CoefDriverHistory,
            CoefRouteHistory,
            CoefPackage,
            CoefClientType,
            CoefConditions
        };

        /// <summary>Writes a positional coefficient array into the named columns.</summary>
        /// <exception cref="ArgumentException">Thrown when the length is not <see cref="PredictionFeatureVector.Length"/>.</exception>
        public void SetCoefficients(double[] coefficients)
        {
            if (coefficients == null)
            {
                throw new ArgumentNullException(nameof(coefficients));
            }

            if (coefficients.Length != PredictionFeatureVector.Length)
            {
                throw new ArgumentException(
                    $"Expected {PredictionFeatureVector.Length} coefficients but received {coefficients.Length}.",
                    nameof(coefficients));
            }

            CoefSlaRemainingTime   = coefficients[0];
            CoefPriority           = coefficients[1];
            CoefRedeliveryAttempts = coefficients[2];
            CoefDriverHistory      = coefficients[3];
            CoefRouteHistory       = coefficients[4];
            CoefPackage            = coefficients[5];
            CoefClientType         = coefficients[6];
            CoefConditions         = coefficients[7];
        }
    }
}
