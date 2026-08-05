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
    }
}
