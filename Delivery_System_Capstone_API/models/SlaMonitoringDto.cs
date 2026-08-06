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

        /// <summary>
        /// The eight normalised factor values that produced <see cref="RiskScore"/>.
        /// </summary>
        /// <remarks>
        /// Surfaced so the caller can persist them for later model fitting. These were already
        /// being computed and then discarded; exposing them changes no score.
        /// </remarks>
        public PredictionFeatureVector Features { get; set; } = new();
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

    /// <summary>One factor's hand-set heuristic weight next to its fitted coefficient.</summary>
    /// <remarks>
    /// The two numbers are not on the same scale and must not be read as directly comparable:
    /// heuristic weights are non-negative and sum to 1.00, while a logistic coefficient is an
    /// unbounded log-odds multiplier that may legitimately be negative. What is meaningful is
    /// the <i>ranking</i> and the <i>sign</i> — which factors the fit considers most predictive,
    /// and whether any of them push in the opposite direction to what the heuristic assumed.
    /// </remarks>
    public class FactorWeightComparisonDto
    {
        public string Factor { get; set; } = string.Empty;

        /// <summary>The hand-set weight currently driving the live risk score.</summary>
        public double HeuristicWeight { get; set; }

        /// <summary>The fitted log-odds coefficient.</summary>
        public double LearnedCoefficient { get; set; }
    }

    /// <summary>Provenance and diagnostics for the active trained model.</summary>
    public class PredictionModelInfoDto
    {
        /// <summary>False when no model has been trained yet. Every other field is then unset.</summary>
        public bool HasActiveModel { get; set; }

        public int? ModelId { get; set; }
        public DateTime? TrainedAt { get; set; }

        /// <summary><c>Outcomes</c> for real recorded results, <c>Synthetic</c> for generated data.</summary>
        public string TrainingSource { get; set; } = string.Empty;

        public int SampleCount { get; set; }

        /// <summary>Breaches in the training set.</summary>
        public int PositiveCount { get; set; }

        /// <summary>
        /// Share of the training set that breached. Reported because a fit on a set with very
        /// few positives can post a high accuracy while never once predicting a breach.
        /// </summary>
        public double PositiveRate { get; set; }

        public double TrainingLogLoss { get; set; }
        public double Intercept { get; set; }
        public double DecisionThreshold { get; set; }

        /// <summary>
        /// Whether <c>Predictions:Ml:Enabled</c> is set, and therefore whether this model is
        /// actually scoring anything.
        /// </summary>
        /// <remarks>
        /// A trained model and an applied model are different states. Without this, an operator
        /// seeing a populated model would reasonably assume it is running when shadow scoring
        /// may still be switched off.
        /// </remarks>
        public bool ShadowScoringEnabled { get; set; }

        /// <summary>
        /// True while the fit rests on too few rows to generalise, per
        /// <c>Predictions:Ml:MinTrainingSamples</c>. The model is still reported so it can be
        /// inspected, but its metrics should not be presented as validated performance.
        /// </summary>
        public bool BelowRecommendedSampleSize { get; set; }

        public List<FactorWeightComparisonDto> Factors { get; set; } = new();
    }

    /// <summary>
    /// The heuristic and the model graded side by side on the identical set of outcomes.
    /// </summary>
    /// <remarks>
    /// Both matrices are computed only over rows where the model actually ran, so neither side
    /// is scored on rows the other never saw. Comparing a heuristic measured over all history
    /// against a model measured over a recent subset would flatter whichever had the easier
    /// rows, which is the specific mistake this DTO exists to prevent.
    /// </remarks>
    public class ModelAccuracyComparisonDto
    {
        /// <summary>Rows where both the heuristic and the model produced a verdict.</summary>
        public int ComparableOutcomes { get; set; }

        /// <summary>Heuristic performance over <see cref="ComparableOutcomes"/> only.</summary>
        public PredictionAccuracyDto Heuristic { get; set; } = new();

        /// <summary>Model performance over the same rows.</summary>
        public PredictionAccuracyDto Model { get; set; } = new();

        /// <summary>
        /// Model F1 minus heuristic F1 over the shared rows. Positive means the model is ahead.
        /// F1 is the comparison metric because accuracy alone rewards a model that simply
        /// predicts the majority class.
        /// </summary>
        public double F1Delta { get; set; }

        /// <summary>Null when no model has run against any recorded outcome yet.</summary>
        public PredictionModelInfoDto? ActiveModel { get; set; }
    }
}
