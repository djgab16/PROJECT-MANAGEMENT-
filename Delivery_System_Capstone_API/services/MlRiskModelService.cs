using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    /// <inheritdoc cref="IMlRiskModelService"/>
    public class MlRiskModelService : IMlRiskModelService
    {
        /// <summary>
        /// Absolute minimum training rows, at two per feature.
        /// </summary>
        /// <remarks>
        /// Below this the fit is not merely imprecise, it is under-determined: with eight
        /// features and fewer rows than parameters the data can be separated perfectly by
        /// infinitely many coefficient sets, and gradient descent will happily report a near-zero
        /// loss for one of them. That reads as a flawless model and is worthless. Distinct from
        /// <c>MinTrainingSamples</c>, which is a soft recommendation that only raises a flag.
        /// </remarks>
        public const int AbsoluteMinimumSamples = PredictionFeatureVector.Length * 2;

        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<MlRiskModelService> _logger;

        public MlRiskModelService(
            AppDbContext context,
            IConfiguration configuration,
            ILogger<MlRiskModelService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>Defaults to false, so installing this build changes no behaviour on its own.</summary>
        public bool IsEnabled => _configuration.GetValue<bool?>("Predictions:Ml:Enabled") ?? false;

        private int MinTrainingSamples =>
            Math.Max(AbsoluteMinimumSamples, _configuration.GetValue<int?>("Predictions:Ml:MinTrainingSamples") ?? 200);

        private double DecisionThreshold
        {
            get
            {
                var configured = _configuration.GetValue<double?>("Predictions:Ml:DecisionThreshold") ?? 0.5;

                // A threshold outside (0,1) would make every verdict constant. Clamped rather
                // than thrown so a typo in configuration degrades to a usable model.
                return double.IsFinite(configured) ? Math.Clamp(configured, 0.01, 0.99) : 0.5;
            }
        }

        private LogisticRegressionOptions TrainerOptions => new(
            Epochs: _configuration.GetValue<int?>("Predictions:Ml:Epochs") ?? 2000,
            LearningRate: _configuration.GetValue<double?>("Predictions:Ml:LearningRate") ?? 0.5,
            L2: _configuration.GetValue<double?>("Predictions:Ml:L2") ?? 0.01);

        public async Task<IMlRiskScorer?> GetActiveScorerAsync(CancellationToken cancellationToken = default)
        {
            if (!IsEnabled)
            {
                return null;
            }

            var model = await _context.PredictionModels
                .AsNoTracking()
                .Where(m => m.IsActive)
                .OrderByDescending(m => m.TrainedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (model == null)
            {
                return null;
            }

            return new LogisticRiskScorer(
                model.Id,
                model.Intercept,
                model.ToCoefficientArray(),
                model.DecisionThreshold);
        }

        public async Task<ModelTrainingResult> TrainFromOutcomesAsync(CancellationToken cancellationToken = default)
        {
            // Only rows whose features were captured before the outcome was known are eligible.
            // Filtering on the flag rather than on the values is essential: an uncaptured row
            // stores 0.0 in all eight columns and would otherwise be indistinguishable from a
            // legitimate all-zero example.
            var rows = await _context.PredictionOutcomes
                .AsNoTracking()
                .Where(o => o.FeaturesCaptured)
                .Select(o => new
                {
                    o.FeatureSlaRemainingTime,
                    o.FeaturePriority,
                    o.FeatureRedeliveryAttempts,
                    o.FeatureDriverHistory,
                    o.FeatureRouteHistory,
                    o.FeaturePackage,
                    o.FeatureClientType,
                    o.FeatureConditions,
                    o.ActuallyBreached
                })
                .ToListAsync(cancellationToken);

            if (rows.Count == 0)
            {
                return ModelTrainingResult.Failed(
                    "No recorded outcomes carry captured features yet. Features are captured when predictions run, " +
                    "so outcomes recorded before this feature shipped cannot be used. Let the scheduler score active " +
                    "orders and wait for those orders to reach a terminal status, or train on synthetic data to " +
                    "demonstrate the pipeline.");
            }

            var samples = new List<TrainingSample>(rows.Count);
            var rejected = 0;

            foreach (var row in rows)
            {
                var vector = new PredictionFeatureVector
                {
                    SlaRemainingTime   = row.FeatureSlaRemainingTime,
                    Priority           = row.FeaturePriority,
                    RedeliveryAttempts = row.FeatureRedeliveryAttempts,
                    DriverHistory      = row.FeatureDriverHistory,
                    RouteHistory       = row.FeatureRouteHistory,
                    Package            = row.FeaturePackage,
                    ClientType         = row.FeatureClientType,
                    Conditions         = row.FeatureConditions
                };

                // Drop rather than repair. A row outside [0,1] means the capture path wrote
                // something the scorer could not have produced, and silently clamping it would
                // train on a value that never existed.
                if (!vector.IsValid())
                {
                    rejected++;
                    continue;
                }

                samples.Add(new TrainingSample(vector.ToArray(), row.ActuallyBreached));
            }

            if (rejected > 0)
            {
                _logger.LogWarning(
                    "Excluded {Rejected} of {Total} outcome rows from training because their captured features were out of range.",
                    rejected,
                    rows.Count);
            }

            return await FitAndActivateAsync(samples, "Outcomes", cancellationToken);
        }

        public async Task<ModelTrainingResult> TrainFromSyntheticAsync(
            int sampleCount = 600,
            int seed = 20260805,
            CancellationToken cancellationToken = default)
        {
            if (sampleCount < AbsoluteMinimumSamples)
            {
                return ModelTrainingResult.Failed(
                    $"sampleCount must be at least {AbsoluteMinimumSamples} to fit {PredictionFeatureVector.Length} features.");
            }

            var samples = SyntheticTrainingData.Generate(sampleCount, seed);

            return await FitAndActivateAsync(samples, "Synthetic", cancellationToken);
        }

        /// <summary>
        /// Shared tail of both training paths: validate the sample set, fit, then replace the
        /// active model inside one transaction.
        /// </summary>
        private async Task<ModelTrainingResult> FitAndActivateAsync(
            List<TrainingSample> samples,
            string trainingSource,
            CancellationToken cancellationToken)
        {
            if (samples.Count < AbsoluteMinimumSamples)
            {
                return ModelTrainingResult.Failed(
                    $"Only {samples.Count} usable training rows are available; at least {AbsoluteMinimumSamples} are " +
                    $"required to fit {PredictionFeatureVector.Length} features. Below that the coefficients are not " +
                    "identifiable and a near-zero training loss would be meaningless.");
            }

            var positives = samples.Count(s => s.Label);

            // Single-class guards. Logistic regression on one class has no finite optimum: the
            // intercept is driven toward infinity and only the ridge term stops it. The fit
            // would appear to converge and would then classify everything identically.
            if (positives == 0)
            {
                return ModelTrainingResult.Failed(
                    "Every training row is a non-breach, so there is nothing to separate. A model fitted here would " +
                    "predict 'safe' unconditionally. Wait until at least one breached delivery has been recorded.");
            }

            if (positives == samples.Count)
            {
                return ModelTrainingResult.Failed(
                    "Every training row is a breach, so there is nothing to separate. A model fitted here would " +
                    "predict 'at risk' unconditionally. Wait until at least one on-time delivery has been recorded.");
            }

            TrainedLogisticModel fitted;
            try
            {
                fitted = LogisticRegressionTrainer.Train(samples, TrainerOptions);
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                // Divergence and malformed input are reported to the operator rather than
                // surfacing as a 500, and no model is persisted.
                _logger.LogError(ex, "Model training failed.");
                return ModelTrainingResult.Failed($"Training failed: {ex.Message}");
            }

            var threshold = DecisionThreshold;

            var model = new PredictionModel
            {
                IsActive = true,
                Intercept = fitted.Intercept,
                SampleCount = fitted.SampleCount,
                PositiveCount = fitted.PositiveCount,
                TrainingLogLoss = fitted.FinalLogLoss,
                DecisionThreshold = threshold,
                Epochs = fitted.EpochsRun,
                LearningRate = TrainerOptions.LearningRate,
                L2 = TrainerOptions.L2,
                TrainingSource = trainingSource,
                TrainedAt = DateTime.UtcNow
            };

            model.SetCoefficients(fitted.Coefficients);

            // Retire the incumbent before inserting, so the "exactly one active" invariant holds
            // at every committed state. Previous rows are retained, never deleted: outcomes
            // already snapshotted against them must stay interpretable.
            var incumbents = await _context.PredictionModels
                .Where(m => m.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var incumbent in incumbents)
            {
                incumbent.IsActive = false;
            }

            await _context.PredictionModels.AddAsync(model, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Trained {Source} risk model {ModelId}: {Samples} rows, {Positives} breaches ({Rate:P1}), log loss {LogLoss:F4}.",
                trainingSource,
                model.Id,
                model.SampleCount,
                model.PositiveCount,
                fitted.PositiveRate,
                model.TrainingLogLoss);

            return ModelTrainingResult.Succeeded(BuildInfo(model));
        }

        public async Task<PredictionModelInfoDto> GetActiveModelInfoAsync(CancellationToken cancellationToken = default)
        {
            var model = await _context.PredictionModels
                .AsNoTracking()
                .Where(m => m.IsActive)
                .OrderByDescending(m => m.TrainedAt)
                .FirstOrDefaultAsync(cancellationToken);

            // The enabled flag is reported even with no model, because "shadow scoring is on but
            // nothing is trained" and "shadow scoring is off" are different states an operator
            // needs to tell apart. Omitting it here previously made an enabled system look
            // disabled until its first successful training run.
            return model == null
                ? new PredictionModelInfoDto { HasActiveModel = false, ShadowScoringEnabled = IsEnabled }
                : BuildInfo(model);
        }

        private PredictionModelInfoDto BuildInfo(PredictionModel model)
        {
            var coefficients = model.ToCoefficientArray();
            var heuristicWeights = PredictionService.ScoringWeights.ToOrderedArray();

            var factors = new List<FactorWeightComparisonDto>(PredictionFeatureVector.Length);
            for (var i = 0; i < PredictionFeatureVector.Length; i++)
            {
                factors.Add(new FactorWeightComparisonDto
                {
                    Factor = PredictionFeatureVector.Names[i],
                    HeuristicWeight = heuristicWeights[i],
                    LearnedCoefficient = Math.Round(coefficients[i], 4)
                });
            }

            return new PredictionModelInfoDto
            {
                HasActiveModel = true,
                ModelId = model.Id,
                TrainedAt = model.TrainedAt,
                TrainingSource = model.TrainingSource,
                SampleCount = model.SampleCount,
                PositiveCount = model.PositiveCount,
                PositiveRate = model.SampleCount <= 0
                    ? 0.0
                    : Math.Round((double)model.PositiveCount / model.SampleCount, 4),
                TrainingLogLoss = Math.Round(model.TrainingLogLoss, 4),
                Intercept = Math.Round(model.Intercept, 4),
                DecisionThreshold = model.DecisionThreshold,
                BelowRecommendedSampleSize = model.SampleCount < MinTrainingSamples,
                ShadowScoringEnabled = IsEnabled,
                Factors = factors
            };
        }

        /// <summary>An immutable scorer over a fitted coefficient set.</summary>
        private sealed class LogisticRiskScorer : IMlRiskScorer
        {
            private readonly double _intercept;
            private readonly double[] _coefficients;

            public LogisticRiskScorer(int modelId, double intercept, double[] coefficients, double decisionThreshold)
            {
                ModelId = modelId;
                _intercept = intercept;
                _coefficients = coefficients;
                DecisionThreshold = decisionThreshold;
            }

            public int ModelId { get; }

            public double DecisionThreshold { get; }

            public double PredictProbability(PredictionFeatureVector features)
            {
                if (features == null)
                {
                    throw new ArgumentNullException(nameof(features));
                }

                var values = features.ToArray();
                var z = _intercept;

                for (var j = 0; j < values.Length && j < _coefficients.Length; j++)
                {
                    z += _coefficients[j] * values[j];
                }

                return LogisticRegressionTrainer.Sigmoid(z);
            }

            public bool IsAtRisk(PredictionFeatureVector features)
                => PredictProbability(features) >= DecisionThreshold;
        }
    }
}
