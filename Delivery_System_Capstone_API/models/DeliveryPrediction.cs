using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models
{
    public class DeliveryPrediction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DeliveryOrderId { get; set; }

        [ForeignKey("DeliveryOrderId")]
        public virtual DeliveryOrder? DeliveryOrder { get; set; }

        [Required]
        public double RiskScore { get; set; }

        [Required]
        [MaxLength(20)]
        public string RiskLevel { get; set; } = "Low"; // "Low", "Medium", "High", "Critical"

        [Required]
        public double ConfidenceScore { get; set; }

        [Required]
        public bool IsAtRisk { get; set; }

        [Required]
        public string RiskReason { get; set; } = string.Empty;

        [Required]
        public string RecommendedAction { get; set; } = string.Empty;

        [Required]
        public DateTime PredictedAt { get; set; } = DateTime.UtcNow;

        // ─── Captured factor inputs ───────────────────────────────────────────────────
        // The eight normalised values behind RiskScore, retained so a model can be fitted to
        // them later. Storing them at prediction time is what keeps training leak-free: any
        // attempt to reconstruct these after the fact would compute time-dependent factors
        // (SLA remaining, driver and route breach rates) from data that already reflects the
        // outcome, and the resulting model would score far better than it deserves.

        /// <summary>
        /// False for rows written before feature capture shipped. Those rows carry 0.0 in every
        /// feature column, which is indistinguishable from a genuine all-zero vector, so this
        /// flag — not the values — is what makes a row eligible for training.
        /// </summary>
        [Required]
        public bool FeaturesCaptured { get; set; }

        [Required]
        public double FeatureSlaRemainingTime { get; set; }

        [Required]
        public double FeaturePriority { get; set; }

        [Required]
        public double FeatureRedeliveryAttempts { get; set; }

        [Required]
        public double FeatureDriverHistory { get; set; }

        [Required]
        public double FeatureRouteHistory { get; set; }

        [Required]
        public double FeaturePackage { get; set; }

        [Required]
        public double FeatureClientType { get; set; }

        [Required]
        public double FeatureConditions { get; set; }

        // ─── Shadow-mode model output ─────────────────────────────────────────────────
        // Written alongside the heuristic, never instead of it. RiskScore, RiskLevel and
        // IsAtRisk above remain the heuristic's values and continue to drive the dashboard, so
        // enabling the model cannot move a number an operator is already relying on.

        /// <summary>
        /// Model probability of breach, or null when no active model exists or shadow scoring is
        /// disabled. Nullable rather than 0.0 precisely because a stored 0.0 would read as
        /// "the model is confident this is safe" rather than "the model did not run".
        /// </summary>
        public double? MlRiskScore { get; set; }

        /// <summary>Model verdict at its own decision threshold. Null when the model did not run.</summary>
        public bool? MlIsAtRisk { get; set; }

        /// <summary>
        /// The <see cref="PredictionModel"/> that produced <see cref="MlRiskScore"/>, so a score
        /// stays attributable to a specific fit after retraining.
        /// </summary>
        public int? MlModelId { get; set; }

        /// <summary>Copies the eight captured factor values into a feature vector.</summary>
        public PredictionFeatureVector ToFeatureVector() => new()
        {
            SlaRemainingTime   = FeatureSlaRemainingTime,
            Priority           = FeaturePriority,
            RedeliveryAttempts = FeatureRedeliveryAttempts,
            DriverHistory      = FeatureDriverHistory,
            RouteHistory       = FeatureRouteHistory,
            Package            = FeaturePackage,
            ClientType         = FeatureClientType,
            Conditions         = FeatureConditions
        };

        /// <summary>
        /// Writes a feature vector into the eight columns and marks the row as captured.
        /// </summary>
        public void SetFeatures(PredictionFeatureVector features)
        {
            if (features == null)
            {
                throw new ArgumentNullException(nameof(features));
            }

            FeatureSlaRemainingTime   = features.SlaRemainingTime;
            FeaturePriority           = features.Priority;
            FeatureRedeliveryAttempts = features.RedeliveryAttempts;
            FeatureDriverHistory      = features.DriverHistory;
            FeatureRouteHistory       = features.RouteHistory;
            FeaturePackage            = features.Package;
            FeatureClientType         = features.ClientType;
            FeatureConditions         = features.Conditions;
            FeaturesCaptured          = true;
        }
    }
}
