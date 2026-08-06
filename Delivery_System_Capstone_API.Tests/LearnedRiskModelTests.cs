using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Tests;

/// <summary>
/// Covers the learned risk model: the trainer's arithmetic, the feature-capture path that feeds
/// it, and the shadow-mode guarantee that none of it moves a published figure.
/// </summary>
/// <remarks>
/// Kept separate from the rule-based scoring tests on purpose. Those assert exact heuristic
/// scores and must keep passing untouched; a model changes no number they measure, and this file
/// asserts precisely that.
/// </remarks>
public class LearnedRiskModelTests
{
    // ─────────────────────────── Helpers ───────────────────────────

    private static MlRiskModelService NewModelService(
        AppDbContext context,
        bool enabled = true,
        double decisionThreshold = 0.5,
        int minTrainingSamples = 200,
        int epochs = 4000,
        double learningRate = 1.0,
        double l2 = 0.0001)
    {
        var config = TestSupport.Config(
            ("Predictions:Ml:Enabled", enabled ? "true" : "false"),
            ("Predictions:Ml:DecisionThreshold", decisionThreshold.ToString("R")),
            ("Predictions:Ml:MinTrainingSamples", minTrainingSamples.ToString()),
            ("Predictions:Ml:Epochs", epochs.ToString()),
            ("Predictions:Ml:LearningRate", learningRate.ToString("R")),
            ("Predictions:Ml:L2", l2.ToString("R")));

        return new MlRiskModelService(context, config, NullLogger<MlRiskModelService>.Instance);
    }

    /// <summary>An outcome row that carries captured features, i.e. one usable for training.</summary>
    private static PredictionOutcome NewTrainableOutcome(
        int id,
        int deliveryOrderId,
        double slaRemaining,
        bool actuallyBreached,
        bool predictedAtRisk = false)
    {
        var outcome = TestSupport.NewOutcome(id, deliveryOrderId, predictedAtRisk, actuallyBreached);

        outcome.SetFeatures(new PredictionFeatureVector
        {
            SlaRemainingTime   = slaRemaining,
            Priority           = 0.5,
            RedeliveryAttempts = 0.0,
            DriverHistory      = 0.2,
            RouteHistory       = 0.2,
            Package            = 0.0,
            ClientType         = 0.1,
            Conditions         = 0.1
        });

        return outcome;
    }

    // ─────────────────── Trainer: numerical safety ───────────────────

    [Fact]
    public void Sigmoid_SaturatesInsteadOfOverflowingToNaN()
    {
        // The naive 1/(1+exp(-z)) overflows for strongly negative z and yields NaN rather than
        // the correct limit of 0. A NaN here would propagate into every coefficient.
        Assert.Equal(0.0, LogisticRegressionTrainer.Sigmoid(-10_000), 12);
        Assert.Equal(1.0, LogisticRegressionTrainer.Sigmoid(10_000), 12);
        Assert.Equal(0.5, LogisticRegressionTrainer.Sigmoid(0.0), 12);

        Assert.False(double.IsNaN(LogisticRegressionTrainer.Sigmoid(-1e308)));
        Assert.False(double.IsNaN(LogisticRegressionTrainer.Sigmoid(1e308)));
    }

    [Fact]
    public void Train_RejectsEmptySampleSet()
    {
        var ex = Assert.Throws<ArgumentException>(() =>
            LogisticRegressionTrainer.Train(new List<TrainingSample>()));

        Assert.Contains("empty", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Train_RejectsRaggedFeatureArrays()
    {
        // Ragged input would misalign coefficients against features from that row onward.
        var samples = new List<TrainingSample>
        {
            new(new[] { 0.1, 0.2 }, true),
            new(new[] { 0.1 }, false)
        };

        var ex = Assert.Throws<ArgumentException>(() => LogisticRegressionTrainer.Train(samples));
        Assert.Contains("expected 2", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(double.NaN)]
    [InlineData(double.PositiveInfinity)]
    [InlineData(double.NegativeInfinity)]
    public void Train_RejectsNonFiniteFeatures(double bad)
    {
        // Rejected up front rather than allowed to poison the gradient, because the failure would
        // otherwise surface much later as a model that scores every order as NaN.
        var samples = new List<TrainingSample>
        {
            new(new[] { 0.5 }, true),
            new(new[] { bad }, false)
        };

        var ex = Assert.Throws<ArgumentException>(() => LogisticRegressionTrainer.Train(samples));
        Assert.Contains("finite", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Train_IsDeterministic()
    {
        // Full-batch descent from a zero start with no shuffling: identical input must give
        // identical coefficients, which is what lets these tests assert on fitted values at all.
        var samples = SyntheticTrainingData.Generate(400, seed: 99);

        var first = LogisticRegressionTrainer.Train(samples);
        var second = LogisticRegressionTrainer.Train(samples);

        Assert.Equal(first.Intercept, second.Intercept, 12);
        Assert.Equal(first.Coefficients, second.Coefficients);
        Assert.Equal(first.FinalLogLoss, second.FinalLogLoss, 12);
    }

    // ─────────────────── Trainer: does it actually learn ───────────────────

    [Fact]
    public void Train_RecoversTheGroundTruthSignalFromSyntheticData()
    {
        // The real validation of the descent. The generator's coefficients are known, so the fit
        // can be checked against them instead of merely confirming that numbers came out.
        var samples = SyntheticTrainingData.Generate(4000, seed: 4242);

        var model = LogisticRegressionTrainer.Train(
            samples,
            new LogisticRegressionOptions(Epochs: 6000, LearningRate: 1.5, L2: 0.0));

        // Every true coefficient is positive, so every fitted one should be too.
        for (var i = 0; i < PredictionFeatureVector.Length; i++)
        {
            Assert.True(
                model.Coefficients[i] > 0.0,
                $"Coefficient for {PredictionFeatureVector.Names[i]} should be positive but was {model.Coefficients[i]:F4}.");
        }

        // The generator makes remaining SLA time by far the strongest driver; the fit must agree.
        var slaIndex = Array.IndexOf(PredictionFeatureVector.Names, "SlaRemainingTime");
        var clientIndex = Array.IndexOf(PredictionFeatureVector.Names, "ClientType");

        var strongest = model.Coefficients.Max();
        Assert.Equal(model.Coefficients[slaIndex], strongest, 12);

        // Client type is near-irrelevant in the generator and must not outrank SLA time.
        Assert.True(
            model.Coefficients[clientIndex] < model.Coefficients[slaIndex],
            "ClientType should be weaker than SlaRemainingTime.");

        // A negative intercept reflects the generator's low base rate.
        Assert.True(model.Intercept < 0.0, $"Intercept should be negative but was {model.Intercept:F4}.");
    }

    [Fact]
    public void Train_BeatsAnInterceptOnlyBaseline()
    {
        // Guards against a fit that merely predicts the base rate. If the features carry signal,
        // the fitted log loss must be meaningfully below that of a constant predictor.
        var samples = SyntheticTrainingData.Generate(3000, seed: 7);

        var model = LogisticRegressionTrainer.Train(
            samples,
            new LogisticRegressionOptions(Epochs: 6000, LearningRate: 1.5, L2: 0.0));

        var baseRate = samples.Count(s => s.Label) / (double)samples.Count;

        // Cross-entropy of always predicting the base rate.
        var baseline = -(baseRate * Math.Log(baseRate) + (1 - baseRate) * Math.Log(1 - baseRate));

        Assert.True(
            model.FinalLogLoss < baseline,
            $"Fitted log loss {model.FinalLogLoss:F4} should beat the intercept-only baseline {baseline:F4}.");
    }

    [Fact]
    public void SyntheticData_IsReproducibleForAGivenSeed()
    {
        var a = SyntheticTrainingData.Generate(200, seed: 2026);
        var b = SyntheticTrainingData.Generate(200, seed: 2026);
        var different = SyntheticTrainingData.Generate(200, seed: 2027);

        Assert.Equal(a.Count, b.Count);
        for (var i = 0; i < a.Count; i++)
        {
            Assert.Equal(a[i].Features, b[i].Features);
            Assert.Equal(a[i].Label, b[i].Label);
        }

        // A different seed must actually produce a different set, otherwise the seed is ignored.
        Assert.False(
            a.Select(s => s.Label).SequenceEqual(different.Select(s => s.Label)),
            "A different seed should produce a different sample set.");
    }

    [Fact]
    public void SyntheticData_ProducesFeaturesInRangeAndBothClasses()
    {
        var samples = SyntheticTrainingData.Generate(1000, seed: 11);

        foreach (var sample in samples)
        {
            var vector = PredictionFeatureVector.FromArray(sample.Features);
            Assert.True(vector.IsValid(), "Generated features must be finite and within [0,1].");
        }

        var positives = samples.Count(s => s.Label);
        Assert.True(positives > 0 && positives < samples.Count, "Generated data must contain both classes.");
    }

    // ─────────────────── Feature vector contract ───────────────────

    [Fact]
    public void FeatureVector_RoundTripsThroughItsPositionalArray()
    {
        var original = new PredictionFeatureVector
        {
            SlaRemainingTime = 0.11, Priority = 0.22, RedeliveryAttempts = 0.33, DriverHistory = 0.44,
            RouteHistory = 0.55, Package = 0.66, ClientType = 0.77, Conditions = 0.88
        };

        var restored = PredictionFeatureVector.FromArray(original.ToArray());

        Assert.Equal(original.ToArray(), restored.ToArray());
        Assert.Equal(PredictionFeatureVector.Length, PredictionFeatureVector.Names.Length);
    }

    [Fact]
    public void FeatureVector_FromArrayRejectsAWrongLength()
    {
        // Failing loudly matters: a silently padded vector would shift every coefficient by one.
        Assert.Throws<ArgumentException>(() => PredictionFeatureVector.FromArray(new[] { 0.1, 0.2 }));
    }

    [Theory]
    [InlineData(double.NaN)]
    [InlineData(1.5)]
    [InlineData(-0.1)]
    public void FeatureVector_IsValidRejectsOutOfRangeValues(double bad)
    {
        var vector = new PredictionFeatureVector { SlaRemainingTime = bad };
        Assert.False(vector.IsValid());
    }

    [Fact]
    public void PredictionModel_PreservesFactorOrderAcrossItsNamedColumns()
    {
        // The named columns exist so a coefficient cannot drift onto the wrong factor. This
        // asserts the mapping in both directions.
        var coefficients = new[] { 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0 };

        var model = new PredictionModel();
        model.SetCoefficients(coefficients);

        Assert.Equal(coefficients, model.ToCoefficientArray());

        // Spot-check the two ends so a symmetric mistake cannot pass.
        Assert.Equal(1.0, model.CoefSlaRemainingTime);
        Assert.Equal(8.0, model.CoefConditions);
    }

    [Fact]
    public void PredictionModel_SetCoefficientsRejectsAWrongLength()
    {
        Assert.Throws<ArgumentException>(() => new PredictionModel().SetCoefficients(new[] { 1.0 }));
    }

    [Fact]
    public void HeuristicWeights_AreExposedInFeatureOrderAndStillSumToOne()
    {
        var weights = PredictionService.ScoringWeights.ToOrderedArray();

        Assert.Equal(PredictionFeatureVector.Length, weights.Length);
        Assert.Equal(1.0, weights.Sum(), 10);

        // Order must match the feature names, not merely have the right length.
        Assert.Equal(PredictionService.ScoringWeights.SlaRemainingTime, weights[0]);
        Assert.Equal(PredictionService.ScoringWeights.Conditions, weights[7]);
    }

    // ─────────────────── Feature capture ───────────────────

    [Fact]
    public async Task RunPredictions_CapturesFeaturesThatReproduceTheRiskScore()
    {
        // The strongest available guarantee that the stored features are the ones that actually
        // produced the score: their weighted sum must reproduce it exactly.
        using var context = TestSupport.NewContext();
        context.DeliveryOrders.Add(TestSupport.NewOrder(1, "WB-CAPTURE", expectedDeliveryHoursFromNow: 4, priority: "High"));
        await context.SaveChangesAsync();

        var service = TestSupport.NewPredictionService(context, conditionsRisk: 0.25);
        await service.RunPredictionsAsync();

        var prediction = await context.DeliveryPredictions.SingleAsync();

        Assert.True(prediction.FeaturesCaptured);

        var features = prediction.ToFeatureVector().ToArray();
        var weights = PredictionService.ScoringWeights.ToOrderedArray();

        var recomputed = 0.0;
        for (var i = 0; i < features.Length; i++)
        {
            recomputed += features[i] * weights[i];
        }

        Assert.Equal(prediction.RiskScore, Math.Clamp(recomputed, 0.0, 1.0), 12);
    }

    [Fact]
    public async Task RunPredictions_LeavesShadowColumnsNullWhenNoModelServiceIsSupplied()
    {
        using var context = TestSupport.NewContext();
        context.DeliveryOrders.Add(TestSupport.NewOrder(1, "WB-NOML"));
        await context.SaveChangesAsync();

        // Four-argument construction: the heuristic with no model plumbing at all.
        await TestSupport.NewPredictionService(context).RunPredictionsAsync();

        var prediction = await context.DeliveryPredictions.SingleAsync();

        // Null, never 0.0. A stored zero would read as "the model is confident this is safe".
        Assert.Null(prediction.MlRiskScore);
        Assert.Null(prediction.MlIsAtRisk);
        Assert.Null(prediction.MlModelId);
    }

    [Fact]
    public async Task RunPredictions_SkipsShadowScoringWhileTheModelIsDisabled()
    {
        using var context = TestSupport.NewContext();
        context.DeliveryOrders.Add(TestSupport.NewOrder(1, "WB-DISABLED"));
        await context.SaveChangesAsync();

        // A model exists and is active, but Predictions:Ml:Enabled is false.
        var trainer = NewModelService(context, enabled: true, minTrainingSamples: 50);
        Assert.True((await trainer.TrainFromSyntheticAsync(400, seed: 1)).Success);

        var disabled = NewModelService(context, enabled: false);
        var service = new PredictionService(
            context,
            new SlaService(TestSupport.Config()),
            new StubConditionsService(0.0),
            TestSupport.NewCache(),
            disabled);

        await service.RunPredictionsAsync();

        var prediction = await context.DeliveryPredictions.SingleAsync();
        Assert.Null(prediction.MlRiskScore);
    }

    // ─────────────────── Shadow mode ───────────────────

    [Fact]
    public async Task RunPredictions_WritesTheShadowScoreWithoutMovingAnyHeuristicField()
    {
        // The core shadow-mode guarantee. The same order is scored with the model off and then on;
        // every heuristic field must be byte-identical across the two runs.
        using var context = TestSupport.NewContext();
        context.DeliveryOrders.Add(TestSupport.NewOrder(1, "WB-SHADOW", expectedDeliveryHoursFromNow: 5, priority: "High"));
        await context.SaveChangesAsync();

        await TestSupport.NewPredictionService(context, conditionsRisk: 0.3).RunPredictionsAsync();

        var before = await context.DeliveryPredictions.AsNoTracking().SingleAsync();

        var modelService = NewModelService(context, enabled: true, minTrainingSamples: 50);
        Assert.True((await modelService.TrainFromSyntheticAsync(500, seed: 3)).Success);

        var withModel = new PredictionService(
            context,
            new SlaService(TestSupport.Config()),
            new StubConditionsService(0.3),
            TestSupport.NewCache(),
            modelService);

        await withModel.RunPredictionsAsync();

        var after = await context.DeliveryPredictions.AsNoTracking().SingleAsync();

        Assert.Equal(before.RiskScore, after.RiskScore, 12);
        Assert.Equal(before.RiskLevel, after.RiskLevel);
        Assert.Equal(before.IsAtRisk, after.IsAtRisk);
        Assert.Equal(before.ConfidenceScore, after.ConfidenceScore, 12);
        Assert.Equal(before.RiskReason, after.RiskReason);
        Assert.Equal(before.RecommendedAction, after.RecommendedAction);

        // And the model did run, so the comparison above is meaningful rather than vacuous.
        Assert.NotNull(after.MlRiskScore);
        Assert.InRange(after.MlRiskScore!.Value, 0.0, 1.0);
        Assert.NotNull(after.MlIsAtRisk);
        Assert.NotNull(after.MlModelId);
    }

    [Fact]
    public async Task ShadowVerdict_FollowsTheConfiguredDecisionThreshold()
    {
        using var context = TestSupport.NewContext();
        var modelService = NewModelService(context, enabled: true, decisionThreshold: 0.99, minTrainingSamples: 50);
        Assert.True((await modelService.TrainFromSyntheticAsync(400, seed: 5)).Success);

        var scorer = await modelService.GetActiveScorerAsync();
        Assert.NotNull(scorer);
        Assert.Equal(0.99, scorer!.DecisionThreshold, 10);

        // A benign order cannot clear a 0.99 bar.
        var benign = new PredictionFeatureVector();
        Assert.False(scorer.IsAtRisk(benign));
        Assert.InRange(scorer.PredictProbability(benign), 0.0, 1.0);
    }

    [Fact]
    public async Task GetActiveScorer_ReturnsNullWhenDisabledEvenThoughAModelExists()
    {
        using var context = TestSupport.NewContext();

        Assert.True((await NewModelService(context, minTrainingSamples: 50).TrainFromSyntheticAsync(400, seed: 8)).Success);

        // Null means "skip shadow scoring", and callers must not read it as a zero score.
        Assert.Null(await NewModelService(context, enabled: false).GetActiveScorerAsync());
    }

    // ─────────────────── Outcome snapshot ───────────────────

    [Fact]
    public async Task OutcomeCapture_SnapshotsFeaturesAndTheShadowVerdict()
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-SNAP", expectedDeliveryHoursFromNow: 3, priority: "High");
        context.DeliveryOrders.Add(order);
        await context.SaveChangesAsync();

        var modelService = NewModelService(context, enabled: true, minTrainingSamples: 50);
        Assert.True((await modelService.TrainFromSyntheticAsync(500, seed: 13)).Success);

        var service = new PredictionService(
            context,
            new SlaService(TestSupport.Config()),
            new StubConditionsService(0.2),
            TestSupport.NewCache(),
            modelService);

        await service.RunPredictionsAsync();

        var prediction = await context.DeliveryPredictions.AsNoTracking().SingleAsync();

        order.Status = "Delivered";
        order.DateCompleted = order.ExpectedDelivery.AddHours(2); // late, so this is a breach
        order.PodImage = "data:image/png;base64,AAAA";
        order.PodStatus = "Submitted";
        order.DriverId = 1;

        Assert.True(await TestSupport.NewOutcomeService(context).TryCaptureOutcomeAsync(order));
        await context.SaveChangesAsync();

        var outcome = await context.PredictionOutcomes.AsNoTracking().SingleAsync();

        Assert.True(outcome.FeaturesCaptured);
        Assert.True(outcome.ActuallyBreached);

        // Copied verbatim, never recomputed: recomputing against a delivery whose result is known
        // would let the label leak into the features.
        Assert.Equal(prediction.ToFeatureVector().ToArray(), outcome.ToFeatureVector().ToArray());
        Assert.Equal(prediction.MlRiskScore, outcome.MlPredictedRiskScore);
        Assert.Equal(prediction.MlIsAtRisk, outcome.MlPredictedAtRisk);
        Assert.Equal(prediction.MlModelId, outcome.MlModelId);
    }

    [Fact]
    public async Task OutcomeCapture_DoesNotFabricateFeaturesForAPredictionThatLacksThem()
    {
        // Simulates a prediction written before feature capture shipped. Its eight columns hold
        // 0.0, which must not be copied in as though it were a real observation.
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-LEGACY", status: "Delivered");
        order.DateCompleted = order.ExpectedDelivery.AddHours(-1);
        order.PodImage = "data:image/png;base64,AAAA";
        order.PodStatus = "Submitted";
        order.DriverId = 1;
        context.DeliveryOrders.Add(order);

        context.DeliveryPredictions.Add(new DeliveryPrediction
        {
            DeliveryOrderId = order.Id,
            RiskScore = 0.42,
            RiskLevel = "Medium",
            ConfidenceScore = 0.6,
            IsAtRisk = true,
            RiskReason = "legacy",
            RecommendedAction = "legacy",
            PredictedAt = DateTime.UtcNow.AddHours(-2),
            FeaturesCaptured = false
        });

        await context.SaveChangesAsync();

        Assert.True(await TestSupport.NewOutcomeService(context).TryCaptureOutcomeAsync(order));
        await context.SaveChangesAsync();

        var outcome = await context.PredictionOutcomes.AsNoTracking().SingleAsync();

        Assert.False(outcome.FeaturesCaptured);
        Assert.Equal(0.42, outcome.PredictedRiskScore, 12); // the heuristic snapshot still works
    }

    // ─────────────────── Training guards ───────────────────

    [Fact]
    public async Task TrainFromOutcomes_ExplainsItselfWhenNoRowsCarryFeatures()
    {
        using var context = TestSupport.NewContext();

        // Outcomes exist, but none predate-capture rows are eligible.
        context.PredictionOutcomes.Add(TestSupport.NewOutcome(1, 101, true, true));
        context.PredictionOutcomes.Add(TestSupport.NewOutcome(2, 102, false, false));
        await context.SaveChangesAsync();

        var result = await NewModelService(context).TrainFromOutcomesAsync();

        Assert.False(result.Success);
        Assert.NotNull(result.FailureReason);
        Assert.Contains("captured features", result.FailureReason!, StringComparison.OrdinalIgnoreCase);
        Assert.Empty(context.PredictionModels);
    }

    [Fact]
    public async Task TrainFromOutcomes_RefusesASingleClassTrainingSet()
    {
        // Logistic regression on one class has no finite optimum; only the ridge term stops the
        // intercept diverging. The fit would look convergent and classify everything alike.
        using var context = TestSupport.NewContext();

        for (var i = 0; i < MlRiskModelService.AbsoluteMinimumSamples + 4; i++)
        {
            context.PredictionOutcomes.Add(
                NewTrainableOutcome(i + 1, 200 + i, slaRemaining: 0.5, actuallyBreached: false));
        }

        await context.SaveChangesAsync();

        var result = await NewModelService(context).TrainFromOutcomesAsync();

        Assert.False(result.Success);
        Assert.Contains("non-breach", result.FailureReason!, StringComparison.OrdinalIgnoreCase);
        Assert.Empty(context.PredictionModels);
    }

    [Fact]
    public async Task TrainFromOutcomes_RefusesFewerRowsThanTheModelHasParameters()
    {
        using var context = TestSupport.NewContext();

        // Both classes present, but too few rows for eight coefficients to be identifiable.
        context.PredictionOutcomes.Add(NewTrainableOutcome(1, 301, 0.9, actuallyBreached: true));
        context.PredictionOutcomes.Add(NewTrainableOutcome(2, 302, 0.1, actuallyBreached: false));
        await context.SaveChangesAsync();

        var result = await NewModelService(context).TrainFromOutcomesAsync();

        Assert.False(result.Success);
        Assert.Contains("at least", result.FailureReason!, StringComparison.OrdinalIgnoreCase);
        Assert.Empty(context.PredictionModels);
    }

    [Fact]
    public async Task TrainFromOutcomes_FitsOnRealCapturedRows()
    {
        using var context = TestSupport.NewContext();

        // A separable-but-noisy set: short remaining time tends to breach.
        for (var i = 0; i < 40; i++)
        {
            var breached = i % 2 == 0;
            context.PredictionOutcomes.Add(NewTrainableOutcome(
                i + 1,
                400 + i,
                slaRemaining: breached ? 0.9 : 0.1,
                actuallyBreached: breached));
        }

        await context.SaveChangesAsync();

        var result = await NewModelService(context, minTrainingSamples: 200).TrainFromOutcomesAsync();

        Assert.True(result.Success, result.FailureReason);
        Assert.NotNull(result.Info);
        Assert.Equal("Outcomes", result.Info!.TrainingSource);
        Assert.Equal(40, result.Info.SampleCount);
        Assert.Equal(20, result.Info.PositiveCount);
        Assert.Equal(0.5, result.Info.PositiveRate, 4);

        // 40 rows is under the configured recommendation, and the flag must say so rather than
        // letting the metrics read as validated performance.
        Assert.True(result.Info.BelowRecommendedSampleSize);

        // Remaining SLA time is the only factor that varies, so it must carry the signal.
        var sla = result.Info.Factors.Single(f => f.Factor == "SlaRemainingTime");
        Assert.True(sla.LearnedCoefficient > 0.0, $"Expected a positive coefficient, got {sla.LearnedCoefficient}.");
    }

    [Fact]
    public async Task TrainFromOutcomes_ExcludesRowsWhoseCapturedFeaturesAreOutOfRange()
    {
        using var context = TestSupport.NewContext();

        for (var i = 0; i < 40; i++)
        {
            var breached = i % 2 == 0;
            context.PredictionOutcomes.Add(NewTrainableOutcome(
                i + 1, 500 + i, slaRemaining: breached ? 0.9 : 0.1, actuallyBreached: breached));
        }

        // A corrupt row the scorer could never have produced. Dropped, not clamped: clamping
        // would train on a value that never existed.
        var corrupt = NewTrainableOutcome(999, 599, slaRemaining: 4.2, actuallyBreached: true);
        context.PredictionOutcomes.Add(corrupt);
        await context.SaveChangesAsync();

        var result = await NewModelService(context).TrainFromOutcomesAsync();

        Assert.True(result.Success, result.FailureReason);
        Assert.Equal(40, result.Info!.SampleCount); // 41 rows present, 40 usable
    }

    // ─────────────────── Model lifecycle ───────────────────

    [Fact]
    public async Task TrainFromSynthetic_ProducesAnActiveTaggedModel()
    {
        using var context = TestSupport.NewContext();

        var result = await NewModelService(context, minTrainingSamples: 100).TrainFromSyntheticAsync(500, seed: 21);

        Assert.True(result.Success, result.FailureReason);

        // The tag is what stops a generated fit being mistaken for measured business performance.
        Assert.Equal("Synthetic", result.Info!.TrainingSource);
        Assert.True(result.Info.HasActiveModel);
        Assert.Equal(500, result.Info.SampleCount);
        Assert.False(result.Info.BelowRecommendedSampleSize);
        Assert.Equal(PredictionFeatureVector.Length, result.Info.Factors.Count);

        // Every factor is reported next to its hand-set weight, in feature order.
        Assert.Equal(PredictionFeatureVector.Names, result.Info.Factors.Select(f => f.Factor).ToArray());
        Assert.Equal(
            PredictionService.ScoringWeights.ToOrderedArray(),
            result.Info.Factors.Select(f => f.HeuristicWeight).ToArray());

        var stored = await context.PredictionModels.SingleAsync();
        Assert.True(stored.IsActive);
    }

    [Fact]
    public async Task Retraining_RetiresThePreviousModelAndKeepsExactlyOneActive()
    {
        // Old rows are retained deliberately: outcomes already snapshotted against them must stay
        // interpretable after a retrain.
        using var context = TestSupport.NewContext();
        var service = NewModelService(context, minTrainingSamples: 100);

        Assert.True((await service.TrainFromSyntheticAsync(300, seed: 1)).Success);
        Assert.True((await service.TrainFromSyntheticAsync(300, seed: 2)).Success);
        Assert.True((await service.TrainFromSyntheticAsync(300, seed: 3)).Success);

        Assert.Equal(3, await context.PredictionModels.CountAsync());
        Assert.Equal(1, await context.PredictionModels.CountAsync(m => m.IsActive));

        var active = await context.PredictionModels.SingleAsync(m => m.IsActive);
        var newest = await context.PredictionModels.OrderByDescending(m => m.Id).FirstAsync();
        Assert.Equal(newest.Id, active.Id);
    }

    [Fact]
    public async Task GetActiveModelInfo_ReportsNoModelBeforeAnyTraining()
    {
        using var context = TestSupport.NewContext();

        var info = await NewModelService(context).GetActiveModelInfoAsync();

        Assert.False(info.HasActiveModel);
        Assert.Null(info.ModelId);
        Assert.Empty(info.Factors);
    }

    [Fact]
    public async Task ModelInfo_ReportsWhetherShadowScoringIsActuallyOn()
    {
        // A trained model and an applied model are different states; the flag keeps them distinct.
        using var context = TestSupport.NewContext();

        Assert.True((await NewModelService(context, enabled: false, minTrainingSamples: 100)
            .TrainFromSyntheticAsync(300, seed: 31)).Success);

        Assert.False((await NewModelService(context, enabled: false).GetActiveModelInfoAsync()).ShadowScoringEnabled);
        Assert.True((await NewModelService(context, enabled: true).GetActiveModelInfoAsync()).ShadowScoringEnabled);
    }

    [Fact]
    public async Task TrainFromSynthetic_RefusesASampleCountBelowTheParameterCount()
    {
        using var context = TestSupport.NewContext();

        var result = await NewModelService(context).TrainFromSyntheticAsync(4, seed: 1);

        Assert.False(result.Success);
        Assert.Empty(context.PredictionModels);
    }

    [Fact]
    public async Task DecisionThreshold_IsClampedIntoAUsableRange()
    {
        // A threshold outside (0,1) would make every verdict constant, so a configuration typo is
        // clamped rather than allowed to silently disable the model's discrimination.
        using var context = TestSupport.NewContext();

        Assert.True((await NewModelService(context, decisionThreshold: 42.0, minTrainingSamples: 100)
            .TrainFromSyntheticAsync(300, seed: 41)).Success);

        var stored = await context.PredictionModels.SingleAsync(m => m.IsActive);
        Assert.InRange(stored.DecisionThreshold, 0.01, 0.99);
    }
}
