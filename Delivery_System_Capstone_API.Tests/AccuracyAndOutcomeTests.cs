using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SPXDeliveryAPI.Controllers;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Tests;

/// <summary>
/// Task 4: outcome capture semantics and the accuracy confusion matrix.
/// </summary>
public class AccuracyAndOutcomeTests
{
    private static PredictionsController NewController(AppDbContext context)
    {
        return new PredictionsController(
            TestSupport.NewPredictionService(context),
            new SlaService(TestSupport.Config()),
            context,
            NullLogger<PredictionsController>.Instance,
            TestSupport.NewCache());
    }

    private static async Task<PredictionAccuracyDto> AccuracyAsync(
        AppDbContext context, DateTime? from = null, DateTime? to = null)
    {
        var result = await NewController(context).GetPredictionAccuracy(from, to);
        var ok = Assert.IsType<OkObjectResult>(result);
        return Assert.IsType<PredictionAccuracyDto>(ok.Value);
    }

    // ─────────────────────────── Cold start ───────────────────────────

    [Fact]
    public async Task EmptyOutcomeTable_ReturnsAllZerosAndNullBounds_WithoutThrowing()
    {
        using var context = TestSupport.NewContext();

        var dto = await AccuracyAsync(context);

        Assert.Equal(0, dto.TruePositives);
        Assert.Equal(0, dto.FalsePositives);
        Assert.Equal(0, dto.TrueNegatives);
        Assert.Equal(0, dto.FalseNegatives);
        Assert.Equal(0, dto.TotalEvaluated);
        Assert.Equal(0.0, dto.Accuracy);
        Assert.Equal(0.0, dto.Precision);
        Assert.Equal(0.0, dto.Recall);
        Assert.Equal(0.0, dto.F1Score);
        Assert.Null(dto.EvaluationPeriodStart);
        Assert.Null(dto.EvaluationPeriodEnd);
    }

    [Fact]
    public async Task NoMetricIsEverNaNOrInfinite()
    {
        // Every metric has a zero-denominator case; none may leak NaN to the dashboard.
        using var context = TestSupport.NewContext();

        // Only true negatives: TP + FP == 0 and TP + FN == 0, so precision and recall both
        // divide by zero.
        context.PredictionOutcomes.Add(TestSupport.NewOutcome(1, 101, predictedAtRisk: false, actuallyBreached: false));
        context.PredictionOutcomes.Add(TestSupport.NewOutcome(2, 102, predictedAtRisk: false, actuallyBreached: false));
        await context.SaveChangesAsync();

        var dto = await AccuracyAsync(context);

        foreach (var metric in new[] { dto.Accuracy, dto.Precision, dto.Recall, dto.F1Score })
        {
            Assert.False(double.IsNaN(metric));
            Assert.False(double.IsInfinity(metric));
        }

        Assert.Equal(1.0, dto.Accuracy);   // (0 + 2) / 2
        Assert.Equal(0.0, dto.Precision);  // 0 / 0 -> 0
        Assert.Equal(0.0, dto.Recall);     // 0 / 0 -> 0
        Assert.Equal(0.0, dto.F1Score);    // precision + recall == 0 -> 0
    }

    // ─────────────────────── Matrix invariant and arithmetic ───────────────────────

    [Fact]
    public async Task ConfusionMatrixCells_SumToTotalEvaluated()
    {
        using var context = TestSupport.NewContext();

        // 3 TP, 2 FP, 4 TN, 1 FN = 10 evaluated.
        var id = 1;
        for (var i = 0; i < 3; i++) context.PredictionOutcomes.Add(TestSupport.NewOutcome(id, 100 + id++, true, true));
        for (var i = 0; i < 2; i++) context.PredictionOutcomes.Add(TestSupport.NewOutcome(id, 100 + id++, true, false));
        for (var i = 0; i < 4; i++) context.PredictionOutcomes.Add(TestSupport.NewOutcome(id, 100 + id++, false, false));
        for (var i = 0; i < 1; i++) context.PredictionOutcomes.Add(TestSupport.NewOutcome(id, 100 + id++, false, true));
        await context.SaveChangesAsync();

        var dto = await AccuracyAsync(context);

        Assert.Equal(3, dto.TruePositives);
        Assert.Equal(2, dto.FalsePositives);
        Assert.Equal(4, dto.TrueNegatives);
        Assert.Equal(1, dto.FalseNegatives);
        Assert.Equal(10, dto.TotalEvaluated);
        Assert.Equal(
            dto.TotalEvaluated,
            dto.TruePositives + dto.FalsePositives + dto.TrueNegatives + dto.FalseNegatives);
    }

    [Fact]
    public async Task MetricsAreArithmeticallyConsistentWithTheCells_AndRoundedToThreeDecimals()
    {
        using var context = TestSupport.NewContext();

        var id = 1;
        for (var i = 0; i < 3; i++) context.PredictionOutcomes.Add(TestSupport.NewOutcome(id, 100 + id++, true, true));
        for (var i = 0; i < 2; i++) context.PredictionOutcomes.Add(TestSupport.NewOutcome(id, 100 + id++, true, false));
        for (var i = 0; i < 4; i++) context.PredictionOutcomes.Add(TestSupport.NewOutcome(id, 100 + id++, false, false));
        for (var i = 0; i < 1; i++) context.PredictionOutcomes.Add(TestSupport.NewOutcome(id, 100 + id++, false, true));
        await context.SaveChangesAsync();

        var dto = await AccuracyAsync(context);

        var precision = 3.0 / (3 + 2);          // 0.6
        var recall = 3.0 / (3 + 1);             // 0.75
        var accuracy = (3.0 + 4) / 10;          // 0.7
        var f1 = 2 * precision * recall / (precision + recall); // 0.666...

        Assert.Equal(Math.Round(accuracy, 3), dto.Accuracy);
        Assert.Equal(Math.Round(precision, 3), dto.Precision);
        Assert.Equal(Math.Round(recall, 3), dto.Recall);
        Assert.Equal(Math.Round(f1, 3), dto.F1Score);
        Assert.Equal(0.667, dto.F1Score);
    }

    [Fact]
    public async Task DateFiltersNarrowTheEvaluationWindow()
    {
        using var context = TestSupport.NewContext();
        var baseline = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);

        context.PredictionOutcomes.Add(TestSupport.NewOutcome(1, 101, true, true, baseline));
        context.PredictionOutcomes.Add(TestSupport.NewOutcome(2, 102, true, false, baseline.AddDays(10)));
        await context.SaveChangesAsync();

        var all = await AccuracyAsync(context);
        Assert.Equal(2, all.TotalEvaluated);

        var firstOnly = await AccuracyAsync(context, to: baseline.AddDays(1));
        Assert.Equal(1, firstOnly.TotalEvaluated);
        Assert.Equal(1, firstOnly.TruePositives);
        Assert.Equal(0, firstOnly.FalsePositives);

        var secondOnly = await AccuracyAsync(context, from: baseline.AddDays(5));
        Assert.Equal(1, secondOnly.TotalEvaluated);
        Assert.Equal(0, secondOnly.TruePositives);
        Assert.Equal(1, secondOnly.FalsePositives);

        var none = await AccuracyAsync(context, from: baseline.AddYears(1));
        Assert.Equal(0, none.TotalEvaluated);
        Assert.Null(none.EvaluationPeriodStart);
    }

    // ─────────────────────────── Outcome capture ───────────────────────────

    [Fact]
    public async Task CaptureSnapshotsTheExistingPredictionVerbatim_AndNeverRecomputes()
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-SNAP", expectedDeliveryHoursFromNow: -4);
        context.DeliveryOrders.Add(order);

        var predictedAt = DateTime.UtcNow.AddHours(-3);
        context.DeliveryPredictions.Add(new DeliveryPrediction
        {
            DeliveryOrderId = order.Id,
            RiskScore = 0.4242,
            RiskLevel = "Medium",
            ConfidenceScore = 0.8181,
            IsAtRisk = true,
            RiskReason = "• stored reason",
            RecommendedAction = "stored action",
            PredictedAt = predictedAt
        });
        await context.SaveChangesAsync();

        order.Status = "Failed";
        var captured = await TestSupport.NewOutcomeService(context).TryCaptureOutcomeAsync(order);
        await context.SaveChangesAsync();

        Assert.True(captured);
        var outcome = await context.PredictionOutcomes.SingleAsync();

        // Copied, not recalculated.
        Assert.Equal(0.4242, outcome.PredictedRiskScore);
        Assert.Equal("Medium", outcome.PredictedRiskLevel);
        Assert.Equal(0.8181, outcome.PredictedConfidence);
        Assert.True(outcome.PredictedAtRisk);
        Assert.Equal(predictedAt, outcome.PredictionMadeAt);
        Assert.Equal("WB-SNAP", outcome.WaybillNo);

        // Failed is a breach by definition.
        Assert.True(outcome.ActuallyBreached);
    }

    [Fact]
    public async Task CaptureIsIdempotent_AcrossRepeatedTerminalTransitions()
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-IDEMPOTENT");
        context.DeliveryOrders.Add(order);
        context.DeliveryPredictions.Add(new DeliveryPrediction
        {
            DeliveryOrderId = order.Id,
            RiskScore = 0.5,
            RiskLevel = "Medium",
            ConfidenceScore = 0.7,
            IsAtRisk = true,
            RiskReason = "r",
            RecommendedAction = "a",
            PredictedAt = DateTime.UtcNow.AddHours(-1)
        });
        await context.SaveChangesAsync();

        var service = TestSupport.NewOutcomeService(context);

        order.Status = "Failed";
        Assert.True(await service.TryCaptureOutcomeAsync(order));
        await context.SaveChangesAsync();

        var firstRecordedAt = (await context.PredictionOutcomes.SingleAsync()).OutcomeRecordedAt;

        // A second terminal transition for the same order must not add a row or move the
        // original timestamp.
        order.Status = "Returned";
        Assert.False(await service.TryCaptureOutcomeAsync(order));
        await context.SaveChangesAsync();

        var only = await context.PredictionOutcomes.SingleAsync();
        Assert.Equal(1, await context.PredictionOutcomes.CountAsync());
        Assert.Equal(firstRecordedAt, only.OutcomeRecordedAt);
    }

    [Fact]
    public async Task DuplicateCaptureWithinOneUnitOfWork_IsSuppressed()
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-SAMEUOW");
        context.DeliveryOrders.Add(order);
        context.DeliveryPredictions.Add(new DeliveryPrediction
        {
            DeliveryOrderId = order.Id,
            RiskScore = 0.5,
            RiskLevel = "Medium",
            ConfidenceScore = 0.7,
            IsAtRisk = true,
            RiskReason = "r",
            RecommendedAction = "a",
            PredictedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var service = TestSupport.NewOutcomeService(context);
        order.Status = "Failed";

        // Two attempts before any SaveChanges: the ChangeTracker guard must catch the second.
        Assert.True(await service.TryCaptureOutcomeAsync(order));
        Assert.False(await service.TryCaptureOutcomeAsync(order));

        await context.SaveChangesAsync();
        Assert.Equal(1, await context.PredictionOutcomes.CountAsync());
    }

    [Fact]
    public async Task OrderWithoutAPrediction_IsSkippedRatherThanInvented()
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-NOPREDICTION");
        context.DeliveryOrders.Add(order);
        await context.SaveChangesAsync();

        order.Status = "Failed";
        var captured = await TestSupport.NewOutcomeService(context).TryCaptureOutcomeAsync(order);
        await context.SaveChangesAsync();

        Assert.False(captured);
        Assert.Empty(await context.PredictionOutcomes.ToListAsync());
    }

    [Theory]
    [InlineData("Pending", false)]
    [InlineData("In Transit", false)]
    [InlineData("Out for Delivery", false)]
    [InlineData("Cancelled", false)]   // never attempted, so not a prediction target
    [InlineData("Delivered", true)]
    [InlineData("Completed", true)]
    [InlineData("Failed", true)]
    [InlineData("Returned", true)]
    public void IsTerminalStatus_RecognisesExactlyTheFourTerminalStatuses(string status, bool expected)
    {
        using var context = TestSupport.NewContext();
        Assert.Equal(expected, TestSupport.NewOutcomeService(context).IsTerminalStatus(status));
    }

    [Fact]
    public async Task BreachDefinition_MatchesTheCodebaseRule()
    {
        // DateCompleted > ExpectedDelivery || Status == "Failed" || Status == "Returned"
        using var context = TestSupport.NewContext();

        var onTime = TestSupport.NewOrder(1, "WB-ONTIME", expectedDeliveryHoursFromNow: 48);
        onTime.Status = "Completed";
        onTime.DateCompleted = DateTime.UtcNow;           // before ExpectedDelivery
        onTime.PodImage = "data:image/png;base64,AAAA";
        onTime.PodStatus = "Submitted";
        onTime.DriverId = 4;

        var late = TestSupport.NewOrder(2, "WB-LATE", expectedDeliveryHoursFromNow: -48);
        late.Status = "Completed";
        late.DateCompleted = DateTime.UtcNow;             // after ExpectedDelivery
        late.PodImage = "data:image/png;base64,AAAA";
        late.PodStatus = "Submitted";
        late.DriverId = 4;

        context.DeliveryOrders.AddRange(onTime, late);
        foreach (var o in new[] { onTime, late })
        {
            context.DeliveryPredictions.Add(new DeliveryPrediction
            {
                DeliveryOrderId = o.Id,
                RiskScore = 0.5,
                RiskLevel = "Medium",
                ConfidenceScore = 0.7,
                IsAtRisk = true,
                RiskReason = "r",
                RecommendedAction = "a",
                PredictedAt = DateTime.UtcNow.AddHours(-1)
            });
        }
        await context.SaveChangesAsync();

        var service = TestSupport.NewOutcomeService(context);
        await service.TryCaptureOutcomeAsync(onTime);
        await service.TryCaptureOutcomeAsync(late);
        await context.SaveChangesAsync();

        Assert.False((await context.PredictionOutcomes.SingleAsync(o => o.WaybillNo == "WB-ONTIME")).ActuallyBreached);
        Assert.True((await context.PredictionOutcomes.SingleAsync(o => o.WaybillNo == "WB-LATE")).ActuallyBreached);
    }
}
