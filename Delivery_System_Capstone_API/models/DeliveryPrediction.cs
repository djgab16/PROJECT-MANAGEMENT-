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
    }
}
