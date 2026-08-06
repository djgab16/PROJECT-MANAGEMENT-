using System;

namespace SPXDeliveryAPI.Models
{
    /// <summary>
    /// The eight normalised factor scores that produce a risk score, captured as an ordered
    /// feature vector so a model can be fitted to them.
    /// </summary>
    /// <remarks>
    /// These are the <i>same</i> eight values the rule-based scorer already computes, each
    /// normalised to <c>[0,1]</c> before weighting. Reusing them rather than inventing a
    /// parallel feature set means the learned model and the heuristic are directly comparable:
    /// they see identical inputs and differ only in how those inputs are combined. It also
    /// removes any need for feature scaling, which is what makes plain gradient descent stable
    /// here without a linear-algebra dependency.
    /// <para>
    /// <b>Ordering is a contract.</b> Trained coefficients are persisted as a positional array,
    /// so reordering these properties would silently re-map every coefficient onto the wrong
    /// factor and quietly corrupt predictions. <see cref="Names"/> and <see cref="ToArray"/>
    /// are the single definition of that order; nothing should hard-code it independently.
    /// </para>
    /// </remarks>
    public class PredictionFeatureVector
    {
        /// <summary>Number of features. Coefficient arrays must match this length exactly.</summary>
        public const int Length = 8;

        /// <summary>
        /// Feature names in positional order, for diagnostics and for reporting a fitted
        /// coefficient next to the factor it belongs to.
        /// </summary>
        public static readonly string[] Names =
        {
            "SlaRemainingTime",
            "Priority",
            "RedeliveryAttempts",
            "DriverHistory",
            "RouteHistory",
            "Package",
            "ClientType",
            "Conditions"
        };

        /// <summary>Factor 1. Heuristic weight 0.35.</summary>
        public double SlaRemainingTime { get; set; }

        /// <summary>Factor 2. Heuristic weight 0.15.</summary>
        public double Priority { get; set; }

        /// <summary>Factor 3. Heuristic weight 0.15.</summary>
        public double RedeliveryAttempts { get; set; }

        /// <summary>Factor 4. Heuristic weight 0.15.</summary>
        public double DriverHistory { get; set; }

        /// <summary>Factor 5. Heuristic weight 0.10.</summary>
        public double RouteHistory { get; set; }

        /// <summary>Factor 6. Heuristic weight 0.05.</summary>
        public double Package { get; set; }

        /// <summary>Factor 7. Heuristic weight 0.03.</summary>
        public double ClientType { get; set; }

        /// <summary>Factor 8. Heuristic weight 0.02.</summary>
        public double Conditions { get; set; }

        /// <summary>Projects to a positional array matching <see cref="Names"/>.</summary>
        public double[] ToArray() => new[]
        {
            SlaRemainingTime,
            Priority,
            RedeliveryAttempts,
            DriverHistory,
            RouteHistory,
            Package,
            ClientType,
            Conditions
        };

        /// <summary>Rebuilds a vector from a positional array matching <see cref="Names"/>.</summary>
        /// <exception cref="ArgumentException">
        /// Thrown when the array length is not <see cref="Length"/>. Failing loudly here is
        /// deliberate: a silently truncated or padded vector would misalign every coefficient.
        /// </exception>
        public static PredictionFeatureVector FromArray(double[] values)
        {
            if (values == null)
            {
                throw new ArgumentNullException(nameof(values));
            }

            if (values.Length != Length)
            {
                throw new ArgumentException(
                    $"Expected {Length} features but received {values.Length}. " +
                    "Feature order is positional and must match PredictionFeatureVector.Names.",
                    nameof(values));
            }

            return new PredictionFeatureVector
            {
                SlaRemainingTime   = values[0],
                Priority           = values[1],
                RedeliveryAttempts = values[2],
                DriverHistory      = values[3],
                RouteHistory       = values[4],
                Package            = values[5],
                ClientType         = values[6],
                Conditions         = values[7]
            };
        }

        /// <summary>
        /// True when every component is finite and within <c>[0,1]</c>.
        /// </summary>
        /// <remarks>
        /// Used to reject rows before they reach the trainer. A single NaN or infinity in a
        /// training set propagates through the gradient and turns every coefficient into NaN,
        /// which would produce a model that silently scores everything as NaN rather than
        /// failing outright.
        /// </remarks>
        public bool IsValid()
        {
            foreach (var value in ToArray())
            {
                if (!double.IsFinite(value) || value < 0.0 || value > 1.0)
                {
                    return false;
                }
            }

            return true;
        }
    }
}
