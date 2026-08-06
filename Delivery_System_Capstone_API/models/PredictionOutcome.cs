using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models
{
    /// <summary>
    /// An immutable pairing of a prediction with the delivery outcome that followed it.
    /// </summary>
    /// <remarks>
    /// This table exists so model quality can be measured honestly. The
    /// <c>GET /api/predictions/completed</c> endpoint cannot serve that purpose because it
    /// synthesises its "prediction" fields from the actual result
    /// (<c>RiskScore = breached ? 1.0 : 0.0</c>, <c>ConfidenceScore = 1.0</c>), which is
    /// circular: any accuracy computed from it would be 100% by construction.
    /// <para>
    /// Every row here is captured at the moment an order reaches a terminal status, and the
    /// prediction columns are copied verbatim from the <see cref="DeliveryPrediction"/> row
    /// that already existed at that instant. Predictions are never recomputed at capture
    /// time — doing so would reintroduce the same circularity and make the confusion matrix
    /// meaningless.
    /// </para>
    /// </remarks>
    public class PredictionOutcome
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DeliveryOrderId { get; set; }

        [ForeignKey("DeliveryOrderId")]
        public virtual DeliveryOrder? DeliveryOrder { get; set; }

        /// <summary>Denormalised for reporting; mirrors DeliveryOrder.WaybillNo (max 50).</summary>
        [Required]
        [MaxLength(50)]
        public string WaybillNo { get; set; } = string.Empty;

        /// <summary>Snapshot of DeliveryPrediction.IsAtRisk as it stood before the outcome was known.</summary>
        [Required]
        public bool PredictedAtRisk { get; set; }

        [Required]
        public double PredictedRiskScore { get; set; }

        [Required]
        [MaxLength(20)]
        public string PredictedRiskLevel { get; set; } = "Low";

        [Required]
        public double PredictedConfidence { get; set; }

        /// <summary>
        /// The observed result, using the breach definition applied consistently across the
        /// codebase: <c>DateCompleted &gt; ExpectedDelivery || Status == "Failed" || Status == "Returned"</c>.
        /// </summary>
        [Required]
        public bool ActuallyBreached { get; set; }

        /// <summary>Copied from DeliveryPrediction.PredictedAt (UTC).</summary>
        [Required]
        public DateTime PredictionMadeAt { get; set; }

        /// <summary>When this outcome was captured (UTC).</summary>
        [Required]
        public DateTime OutcomeRecordedAt { get; set; } = DateTime.UtcNow;

        // ─── Training row: features paired with the label ─────────────────────────────
        // Copied verbatim from the DeliveryPrediction row, on the same terms as the prediction
        // columns above and for the same reason. Together with ActuallyBreached these eight
        // values form one supervised training example whose inputs were fixed before the label
        // was observable, which is the property that makes a fit on this table honest.

        /// <summary>
        /// False when the snapshotted prediction predated feature capture. Training must filter
        /// on this rather than on the values, since an uncaptured row stores 0.0 throughout and
        /// would otherwise enter the fit as a spurious all-zero example.
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

        // ─── Shadow-mode model snapshot ───────────────────────────────────────────────

        /// <summary>
        /// The model's probability as it stood before the outcome was known, or null when no
        /// model scored this order. This is what lets the model be graded on exactly the same
        /// rows as the heuristic, which is the only fair comparison available.
        /// </summary>
        public double? MlPredictedRiskScore { get; set; }

        /// <summary>Model verdict before the outcome was known. Null when the model did not run.</summary>
        public bool? MlPredictedAtRisk { get; set; }

        /// <summary>The model that produced the snapshot, retained so a retrain cannot rewrite history.</summary>
        public int? MlModelId { get; set; }

        /// <summary>Copies the eight snapshotted factor values into a feature vector.</summary>
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

        /// <summary>Writes a feature vector into the eight columns and marks the row as captured.</summary>
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
