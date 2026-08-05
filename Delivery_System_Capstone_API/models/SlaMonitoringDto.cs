using System;
using System.Collections.Generic;

namespace SPXDeliveryAPI.Models
{
    public class PredictionResultDto
    {
        public double RiskScore { get; set; }
        public string RiskLevel { get; set; } = "Low";
        public double ConfidenceScore { get; set; }
        public bool IsAtRisk { get; set; }
        public string RiskReason { get; set; } = string.Empty;
        public string RecommendedAction { get; set; } = string.Empty;
    }

    public class AtRiskOrderDto
    {
        public int Id { get; set; } // Prediction ID
        public int DeliveryOrderId { get; set; }
        public string WaybillNo { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string ClientType { get; set; } = string.Empty;
        public string Area { get; set; } = string.Empty;
        public string Route { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string DriverName { get; set; } = string.Empty;
        public double SlaRemainingHours { get; set; }
        public double SlaRemainingPercentage { get; set; }
        public string TimeUntilBreach { get; set; } = string.Empty;
        public string RiskLevel { get; set; } = string.Empty;
        public double RiskScore { get; set; }
        public double ConfidenceScore { get; set; }
        public string RiskReason { get; set; } = string.Empty;
        public string RecommendedAction { get; set; } = string.Empty;
        public string PredictedArrival { get; set; } = string.Empty;
        public DateTime PredictedAt { get; set; }
    }

    public class SlaSummaryDto
    {
        public int ActiveDeliveriesCount { get; set; }
        public double OverallOnTimePercentage { get; set; }
        public int SlaBreachesCount { get; set; }
        public int AtRiskCount { get; set; }
        public double AverageDelayHours { get; set; }
        public double AverageDeliveryDurationHours { get; set; }
        public List<RouteSlaPerformanceDto> RouteBreakdown { get; set; } = new();
        public List<PrioritySlaPerformanceDto> PriorityBreakdown { get; set; } = new();
    }

    public class RouteSlaPerformanceDto
    {
        public string Route { get; set; } = string.Empty;
        public int TotalOrders { get; set; }
        public int BreachedCount { get; set; }
        public double OnTimePercentage { get; set; }
        public double AverageDelayHours { get; set; }
    }

    public class PrioritySlaPerformanceDto
    {
        public string Priority { get; set; } = string.Empty;
        public int TotalOrders { get; set; }
        public int BreachedCount { get; set; }
        public double OnTimePercentage { get; set; }
    }

    /// <summary>
    /// Confusion matrix and derived quality metrics for the prediction model, computed from
    /// <see cref="PredictionOutcome"/> rows (real results paired with the prediction that
    /// preceded them).
    /// </summary>
    /// <remarks>
    /// <c>TruePositives + FalsePositives + TrueNegatives + FalseNegatives</c> always equals
    /// <see cref="TotalEvaluated"/>. All four metrics are rounded to 3 decimals, and any
    /// metric whose denominator is zero is reported as <c>0</c> rather than NaN.
    /// A <see cref="TotalEvaluated"/> of 0 means the model has not been validated yet — it
    /// does not mean the model scores zero, and must not be presented as a measurement.
    /// </remarks>
    public class PredictionAccuracyDto
    {
        /// <summary>Predicted at-risk, and the delivery did breach.</summary>
        public int TruePositives { get; set; }

        /// <summary>Predicted at-risk, but the delivery did NOT breach (false alarm).</summary>
        public int FalsePositives { get; set; }

        /// <summary>Predicted safe, and the delivery did NOT breach.</summary>
        public int TrueNegatives { get; set; }

        /// <summary>Predicted safe, but the delivery breached (missed breach).</summary>
        public int FalseNegatives { get; set; }

        public double Accuracy { get; set; }
        public double Precision { get; set; }
        public double Recall { get; set; }
        public double F1Score { get; set; }

        public int TotalEvaluated { get; set; }

        /// <summary>Earliest OutcomeRecordedAt in the evaluated window; null when nothing was evaluated.</summary>
        public DateTime? EvaluationPeriodStart { get; set; }

        /// <summary>Latest OutcomeRecordedAt in the evaluated window; null when nothing was evaluated.</summary>
        public DateTime? EvaluationPeriodEnd { get; set; }
    }

    public class DriverSlaPerformanceDto
    {
        public string DriverName { get; set; } = string.Empty;
        public double OnTimePercentage { get; set; }
        public int DeliveriesCount { get; set; }
        public int BreachedCount { get; set; }
        public double AverageDelayHours { get; set; }
    }
}
