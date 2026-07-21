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

    public class DriverSlaPerformanceDto
    {
        public string DriverName { get; set; } = string.Empty;
        public double OnTimePercentage { get; set; }
        public int DeliveriesCount { get; set; }
        public int BreachedCount { get; set; }
        public double AverageDelayHours { get; set; }
    }
}
