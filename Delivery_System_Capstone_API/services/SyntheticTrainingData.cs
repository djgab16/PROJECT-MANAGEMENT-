using System;
using System.Collections.Generic;

namespace SPXDeliveryAPI.Services
{
    /// <summary>
    /// Generates labelled feature vectors from a known ground-truth model, so the training
    /// pipeline can be demonstrated and verified before enough real outcomes exist.
    /// </summary>
    /// <remarks>
    /// This is a <b>demonstration and test fixture, not data</b>. Nothing here is written to
    /// <see cref="Models.PredictionOutcome"/>, and any model fitted from it is tagged
    /// <c>Synthetic</c> so its metrics can never be mistaken for measured business performance.
    /// <para>
    /// Two properties make it useful. Feature values are drawn from the same discrete sets the
    /// rule-based scorer actually emits — 0.9 for "six hours or less remaining", 0.6 for "one
    /// failed attempt", and so on — so the generated vectors are shaped like real ones rather
    /// than being uniform noise. And because the ground-truth coefficients are known, a test can
    /// assert that the trainer recovers them, which validates the descent itself rather than
    /// merely checking that it produced some numbers.
    /// </para>
    /// </remarks>
    public static class SyntheticTrainingData
    {
        /// <summary>
        /// Ground-truth log-odds intercept, calibrated so the generated breach rate lands near
        /// 20–25% rather than being balanced.
        /// </summary>
        /// <remarks>
        /// Chosen by working back from the feature distributions rather than guessed. Summing
        /// each factor's expected value against its coefficient gives roughly 3.97, so an
        /// intercept of -5.2 puts the mean log-odds near -1.23 and the breach rate near 22%.
        /// That matters: an earlier value of -3.4 produced a 55% rate, and a balanced set would
        /// misrepresent the problem, since a model demonstrated on 50/50 data looks far better
        /// than it will on real traffic where breaches are the minority and accuracy alone can be
        /// beaten by always predicting "safe".
        /// </remarks>
        public const double TrueIntercept = -5.2;

        /// <summary>
        /// Ground-truth coefficients in <see cref="Models.PredictionFeatureVector.Names"/> order.
        /// </summary>
        /// <remarks>
        /// Ordered to reflect plausible reality rather than the heuristic's weights: remaining
        /// SLA time dominates, driver history matters more than the hand-set 0.15 implies, and
        /// client type is nearly irrelevant. A trainer that recovers this ranking is doing
        /// something real.
        /// </remarks>
        public static readonly double[] TrueCoefficients =
        {
            4.5,  // SlaRemainingTime
            1.0,  // Priority
            2.0,  // RedeliveryAttempts
            2.6,  // DriverHistory
            1.3,  // RouteHistory
            0.6,  // Package
            0.25, // ClientType
            0.4   // Conditions
        };

        /// <summary>
        /// Produces <paramref name="sampleCount"/> labelled rows.
        /// </summary>
        /// <param name="sampleCount">Rows to generate. Must be positive.</param>
        /// <param name="seed">
        /// Seed for the generator. Identical seed and count always yield an identical set, which
        /// is what makes a demonstration reproducible and the tests stable.
        /// </param>
        public static List<TrainingSample> Generate(int sampleCount, int seed)
        {
            if (sampleCount <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(sampleCount), sampleCount, "sampleCount must be positive.");
            }

            var random = new Random(seed);
            var samples = new List<TrainingSample>(sampleCount);

            for (var i = 0; i < sampleCount; i++)
            {
                // Values mirror the discrete outputs of the corresponding heuristic factors.
                var slaRemainingTime = PickWeighted(random,
                    new[] { 0.0, 0.2, 0.4, 0.7, 0.9, 1.0 },
                    new[] { 0.34, 0.22, 0.18, 0.13, 0.08, 0.05 });

                var priority = PickWeighted(random,
                    new[] { 0.1, 0.3, 0.5, 1.0 },
                    new[] { 0.30, 0.15, 0.35, 0.20 });

                var redeliveryAttempts = PickWeighted(random,
                    new[] { 0.0, 0.6, 1.0 },
                    new[] { 0.80, 0.14, 0.06 });

                // Driver factor is either a real breach rate or the 0.8 the scorer substitutes
                // for an unassigned order, which is why the high value appears as a spike rather
                // than as part of the continuous range.
                var driverHistory = random.NextDouble() < 0.08
                    ? 0.8
                    : SkewedLow(random);

                var routeHistory = SkewedLow(random);

                var package = PickWeighted(random,
                    new[] { 0.0, 0.4, 1.0 },
                    new[] { 0.55, 0.33, 0.12 });

                var clientType = PickWeighted(random,
                    new[] { 0.1, 0.3, 0.5, 0.7 },
                    new[] { 0.50, 0.28, 0.14, 0.08 });

                var conditions = SkewedLow(random);

                var features = new[]
                {
                    slaRemainingTime,
                    priority,
                    redeliveryAttempts,
                    driverHistory,
                    routeHistory,
                    package,
                    clientType,
                    conditions
                };

                var z = TrueIntercept;
                for (var j = 0; j < features.Length; j++)
                {
                    z += TrueCoefficients[j] * features[j];
                }

                // Bernoulli draw rather than thresholding, so the set carries irreducible noise.
                // Thresholding would make the classes perfectly separable and let the trainer
                // reach an arbitrarily low loss, hiding any real weakness in the fit.
                var label = random.NextDouble() < LogisticRegressionTrainer.Sigmoid(z);

                samples.Add(new TrainingSample(features, label));
            }

            return samples;
        }

        /// <summary>
        /// Draws from <paramref name="values"/> according to <paramref name="weights"/>.
        /// </summary>
        /// <remarks>
        /// Weights are treated as relative and normalised here, so they need not sum to exactly
        /// 1.0 and cannot drift out of range through rounding.
        /// </remarks>
        private static double PickWeighted(Random random, double[] values, double[] weights)
        {
            var total = 0.0;
            foreach (var weight in weights)
            {
                total += weight;
            }

            var target = random.NextDouble() * total;
            var cumulative = 0.0;

            for (var i = 0; i < values.Length; i++)
            {
                cumulative += weights[i];
                if (target <= cumulative)
                {
                    return values[i];
                }
            }

            // Reached only through floating-point accumulation at the very top of the range.
            return values[values.Length - 1];
        }

        /// <summary>
        /// A value in <c>[0,1]</c> skewed toward zero, for historical breach rates and operating
        /// conditions where most observations are benign.
        /// </summary>
        private static double SkewedLow(Random random)
        {
            var u = random.NextDouble();
            return Math.Clamp(u * u, 0.0, 1.0);
        }
    }
}
