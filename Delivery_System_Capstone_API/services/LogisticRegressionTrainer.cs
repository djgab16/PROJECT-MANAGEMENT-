using System;
using System.Collections.Generic;

namespace SPXDeliveryAPI.Services
{
    /// <summary>Hyperparameters for <see cref="LogisticRegressionTrainer"/>.</summary>
    /// <param name="Epochs">Full passes over the training set.</param>
    /// <param name="LearningRate">Gradient step size.</param>
    /// <param name="L2">
    /// Ridge penalty applied to the coefficients but never to the intercept. Penalising the
    /// intercept would bias the model away from the true base rate.
    /// </param>
    public sealed record LogisticRegressionOptions(
        int Epochs = 2000,
        double LearningRate = 0.5,
        double L2 = 0.01)
    {
        /// <summary>Throws when any hyperparameter would make training meaningless or divergent.</summary>
        public void Validate()
        {
            if (Epochs <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(Epochs), Epochs, "Epochs must be positive.");
            }

            if (!double.IsFinite(LearningRate) || LearningRate <= 0.0)
            {
                throw new ArgumentOutOfRangeException(nameof(LearningRate), LearningRate, "LearningRate must be a positive finite number.");
            }

            if (!double.IsFinite(L2) || L2 < 0.0)
            {
                throw new ArgumentOutOfRangeException(nameof(L2), L2, "L2 must be a non-negative finite number.");
            }
        }
    }

    /// <summary>A single labelled training row.</summary>
    public sealed record TrainingSample(double[] Features, bool Label);

    /// <summary>The fitted model plus the diagnostics needed to judge whether to trust it.</summary>
    public sealed record TrainedLogisticModel(
        double Intercept,
        double[] Coefficients,
        int SampleCount,
        int PositiveCount,
        double FinalLogLoss,
        int EpochsRun)
    {
        /// <summary>Share of training rows that actually breached. The model's base rate.</summary>
        public double PositiveRate => SampleCount <= 0 ? 0.0 : (double)PositiveCount / SampleCount;

        /// <summary>
        /// Probability of breach for a feature vector, in <c>[0,1]</c>.
        /// </summary>
        /// <exception cref="ArgumentException">Thrown when the vector length does not match the coefficients.</exception>
        public double PredictProbability(double[] features)
        {
            if (features == null)
            {
                throw new ArgumentNullException(nameof(features));
            }

            if (features.Length != Coefficients.Length)
            {
                throw new ArgumentException(
                    $"Expected {Coefficients.Length} features but received {features.Length}.",
                    nameof(features));
            }

            var z = Intercept;
            for (var j = 0; j < features.Length; j++)
            {
                z += Coefficients[j] * features[j];
            }

            return LogisticRegressionTrainer.Sigmoid(z);
        }
    }

    /// <summary>
    /// Batch-gradient-descent logistic regression, implemented in plain C#.
    /// </summary>
    /// <remarks>
    /// Hand-rolled on purpose: the eight inputs are already normalised to <c>[0,1]</c>, so the
    /// usual reasons to reach for a framework — feature scaling, sparse matrices, GPU kernels —
    /// do not apply, and ML.NET or ONNX would add a heavyweight dependency for roughly forty
    /// lines of arithmetic.
    /// <para>
    /// <b>Deterministic by construction.</b> Full-batch descent from a zero initialisation with
    /// no shuffling and no random seed means identical input always yields identical
    /// coefficients. That is what lets the tests assert on fitted values instead of tolerating
    /// run-to-run drift.
    /// </para>
    /// </remarks>
    public static class LogisticRegressionTrainer
    {
        /// <summary>
        /// Numerically stable logistic function.
        /// </summary>
        /// <remarks>
        /// The naive <c>1/(1+exp(-z))</c> overflows to infinity for strongly negative z, which
        /// yields NaN rather than the correct limit of 0. Branching on the sign keeps the
        /// exponent negative in both cases so the result saturates cleanly at 0 and 1.
        /// </remarks>
        public static double Sigmoid(double z)
        {
            if (double.IsNaN(z))
            {
                return double.NaN;
            }

            if (z >= 0.0)
            {
                return 1.0 / (1.0 + Math.Exp(-z));
            }

            var expZ = Math.Exp(z);
            return expZ / (1.0 + expZ);
        }

        /// <summary>
        /// Fits coefficients and an intercept to <paramref name="samples"/>.
        /// </summary>
        /// <exception cref="ArgumentException">
        /// Thrown for an empty set, ragged feature arrays, or any non-finite feature value.
        /// These are rejected up front rather than allowed to poison the gradient, because a
        /// single NaN makes every coefficient NaN and the failure would otherwise surface much
        /// later as a model that scores everything as NaN.
        /// </exception>
        public static TrainedLogisticModel Train(
            IReadOnlyList<TrainingSample> samples,
            LogisticRegressionOptions? options = null)
        {
            if (samples == null)
            {
                throw new ArgumentNullException(nameof(samples));
            }

            if (samples.Count == 0)
            {
                throw new ArgumentException("Cannot train on an empty sample set.", nameof(samples));
            }

            options ??= new LogisticRegressionOptions();
            options.Validate();

            var featureCount = samples[0].Features?.Length ?? 0;
            if (featureCount == 0)
            {
                throw new ArgumentException("Training samples must carry at least one feature.", nameof(samples));
            }

            for (var i = 0; i < samples.Count; i++)
            {
                var features = samples[i].Features;

                if (features == null || features.Length != featureCount)
                {
                    throw new ArgumentException(
                        $"Sample {i} has {(features == null ? "no" : features.Length.ToString())} features; expected {featureCount}. Ragged training data would misalign coefficients.",
                        nameof(samples));
                }

                for (var j = 0; j < featureCount; j++)
                {
                    if (!double.IsFinite(features[j]))
                    {
                        throw new ArgumentException(
                            $"Sample {i} feature {j} is not finite ({features[j]}). A single non-finite value turns every coefficient into NaN.",
                            nameof(samples));
                    }
                }
            }

            var coefficients = new double[featureCount];
            var intercept = 0.0;
            var n = samples.Count;

            var positiveCount = 0;
            foreach (var sample in samples)
            {
                if (sample.Label)
                {
                    positiveCount++;
                }
            }

            var gradient = new double[featureCount];

            for (var epoch = 0; epoch < options.Epochs; epoch++)
            {
                Array.Clear(gradient, 0, gradient.Length);
                var interceptGradient = 0.0;

                foreach (var sample in samples)
                {
                    var z = intercept;
                    for (var j = 0; j < featureCount; j++)
                    {
                        z += coefficients[j] * sample.Features[j];
                    }

                    // Derivative of log loss wrt z collapses to (prediction - label), which is
                    // why no separate loss derivative is needed here.
                    var error = Sigmoid(z) - (sample.Label ? 1.0 : 0.0);

                    for (var j = 0; j < featureCount; j++)
                    {
                        gradient[j] += error * sample.Features[j];
                    }

                    interceptGradient += error;
                }

                for (var j = 0; j < featureCount; j++)
                {
                    // Mean gradient plus ridge term. The intercept is updated below without a
                    // penalty so the model can still reach the observed base rate.
                    var step = (gradient[j] / n) + (options.L2 * coefficients[j]);
                    coefficients[j] -= options.LearningRate * step;
                }

                intercept -= options.LearningRate * (interceptGradient / n);
            }

            // Divergence guard. With a large learning rate the descent can overshoot into
            // infinities; surfacing that as an exception is far safer than persisting a model
            // whose every prediction is NaN.
            if (!double.IsFinite(intercept))
            {
                throw new InvalidOperationException(
                    "Training diverged: the intercept is not finite. Lower Predictions:Ml:LearningRate or raise Predictions:Ml:L2.");
            }

            for (var j = 0; j < featureCount; j++)
            {
                if (!double.IsFinite(coefficients[j]))
                {
                    throw new InvalidOperationException(
                        $"Training diverged: coefficient {j} is not finite. Lower Predictions:Ml:LearningRate or raise Predictions:Ml:L2.");
                }
            }

            var model = new TrainedLogisticModel(
                intercept,
                coefficients,
                n,
                positiveCount,
                FinalLogLoss: 0.0,
                EpochsRun: options.Epochs);

            return model with { FinalLogLoss = ComputeLogLoss(model, samples) };
        }

        /// <summary>
        /// Mean binary cross-entropy over <paramref name="samples"/>.
        /// </summary>
        /// <remarks>
        /// Probabilities are clamped away from exactly 0 and 1 before the logarithm. A saturated
        /// prediction that happens to be wrong would otherwise contribute infinite loss and make
        /// the whole diagnostic unreadable.
        /// </remarks>
        public static double ComputeLogLoss(TrainedLogisticModel model, IReadOnlyList<TrainingSample> samples)
        {
            if (model == null)
            {
                throw new ArgumentNullException(nameof(model));
            }

            if (samples == null || samples.Count == 0)
            {
                return 0.0;
            }

            const double epsilon = 1e-15;
            var total = 0.0;

            foreach (var sample in samples)
            {
                var p = Math.Clamp(model.PredictProbability(sample.Features), epsilon, 1.0 - epsilon);
                total += sample.Label ? -Math.Log(p) : -Math.Log(1.0 - p);
            }

            return total / samples.Count;
        }
    }
}
