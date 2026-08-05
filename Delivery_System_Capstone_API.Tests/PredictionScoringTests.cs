using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Tests;

/// <summary>
/// Behavioural tests for the 8-factor scoring engine.
/// </summary>
/// <remarks>
/// ExpectedDelivery is always expressed relative to DateTime.UtcNow, and factor 8 is pinned via
/// <see cref="StubConditionsService"/>, so nothing here depends on which day of the week the
/// suite happens to run on.
/// </remarks>
public class PredictionScoringTests
{
    // ─────────────────────────── Weight integrity ───────────────────────────

    [Fact]
    public void ScoringWeights_SumToOne()
    {
        // Guards future edits: any weight change that breaks the sum silently de-calibrates
        // every risk-level threshold. Rounded because 0.35, 0.15 and 0.03 have no exact
        // binary64 representation.
        Assert.Equal(1.00, Math.Round(PredictionService.ScoringWeights.Total, 10));
    }

    [Fact]
    public void ScoringWeights_MatchTheDocumentedTable()
    {
        Assert.Equal(0.35, PredictionService.ScoringWeights.SlaRemainingTime);
        Assert.Equal(0.15, PredictionService.ScoringWeights.Priority);
        Assert.Equal(0.15, PredictionService.ScoringWeights.RedeliveryAttempts);
        Assert.Equal(0.15, PredictionService.ScoringWeights.DriverHistory);
        Assert.Equal(0.10, PredictionService.ScoringWeights.RouteHistory);
        Assert.Equal(0.05, PredictionService.ScoringWeights.Package);
        Assert.Equal(0.03, PredictionService.ScoringWeights.ClientType);
        Assert.Equal(0.02, PredictionService.ScoringWeights.Conditions);
    }

    // ─────────────────────── Risk-level band boundaries ───────────────────────

    [Theory]
    // Exactly on each inclusive lower bound: proves >= rather than >.
    [InlineData(0.35, "Medium")]
    [InlineData(0.60, "High")]
    [InlineData(0.80, "Critical")]
    // Immediately below each bound.
    [InlineData(0.34999, "Low")]
    [InlineData(0.59999, "Medium")]
    [InlineData(0.79999, "High")]
    // Extremes.
    [InlineData(0.0, "Low")]
    [InlineData(1.0, "Critical")]
    public void DetermineRiskLevel_UsesInclusiveLowerBounds(double score, string expected)
    {
        Assert.Equal(expected, PredictionService.DetermineRiskLevel(score));
    }

    // ─────────────────────────── Overdue orders ───────────────────────────

    [Fact]
    public async Task OrderPastExpectedDelivery_IsFlaggedAtRisk()
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-OVERDUE", expectedDeliveryHoursFromNow: -5);

        var result = await TestSupport.NewPredictionService(context).ComputePredictionAsync(order);

        // isAtRisk is forced true whenever remainingHours <= 0, independent of the score.
        Assert.True(result.IsAtRisk);
        Assert.Contains("deadline has passed", result.RiskReason);
    }

    [Fact]
    public async Task OverdueOrderWithAggravatingFactors_IsCritical()
    {
        using var context = TestSupport.NewContext();

        // 0.35 (overdue) + 0.15 (high priority) + 0.15 (2+ redeliveries)
        // + 0.12 (unassigned driver 0.8) + 0.02 (route default 0.2)
        // + 0.003 (standard client) + 0.02*0.5 = 0.803
        var order = TestSupport.NewOrder(
            1, "WB-CRIT",
            expectedDeliveryHoursFromNow: -12,
            priority: "High",
            driverId: null,
            redeliveryAttempts: 2);

        var result = await TestSupport.NewPredictionService(context, conditionsRisk: 0.5)
            .ComputePredictionAsync(order);

        Assert.Equal("Critical", result.RiskLevel);
        Assert.True(result.IsAtRisk);
    }

    [Fact]
    public async Task OverdueAloneDoesNotReachCritical()
    {
        // Documents actual model behaviour: being past the deadline contributes 0.35 of the
        // 0.80 needed for Critical, so a merely-overdue order with an otherwise clean profile
        // lands well below that band. Encoded as a test so the distinction is not lost.
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-OVERDUE-ONLY", expectedDeliveryHoursFromNow: -1);

        var result = await TestSupport.NewPredictionService(context).ComputePredictionAsync(order);

        Assert.True(result.IsAtRisk);
        Assert.NotEqual("Critical", result.RiskLevel);
        Assert.True(result.RiskScore < PredictionService.CriticalThreshold);
    }

    // ─────────────────────────── The clean, safe case ───────────────────────────

    [Fact]
    public async Task LowPriorityOrder72HoursOutWithCleanHistory_IsLowAndNotAtRisk()
    {
        using var context = TestSupport.NewContext();

        // Spotless driver and route history: 5 completed, 0 breached.
        TestSupport.SeedHistory(
            context, count: 5, breachedCount: 0,
            driverId: 7, route: "Route-Clean", clientName: "Client-Clean");

        var order = TestSupport.NewOrder(
            1, "WB-CLEAN",
            expectedDeliveryHoursFromNow: 72,
            priority: "Low",
            route: "Route-Clean",
            clientName: "Client-Clean",
            driverId: 7);

        var result = await TestSupport.NewPredictionService(context).ComputePredictionAsync(order);

        Assert.Equal("Low", result.RiskLevel);
        Assert.False(result.IsAtRisk);
    }

    [Fact]
    public async Task CleanOrder_YieldsTheNoRiskFactorsNarrative()
    {
        using var context = TestSupport.NewContext();
        TestSupport.SeedHistory(
            context, count: 5, breachedCount: 0,
            driverId: 7, route: "Route-Clean", clientName: "Client-Clean");

        var order = TestSupport.NewOrder(
            1, "WB-NARRATIVE",
            expectedDeliveryHoursFromNow: 96,
            priority: "Low",
            route: "Route-Clean",
            clientName: "Client-Clean",
            driverId: 7);

        var result = await TestSupport.NewPredictionService(context).ComputePredictionAsync(order);

        Assert.Equal("• No severe risk factors identified. On schedule.", result.RiskReason);
        Assert.Equal("No action required. On schedule.", result.RecommendedAction);
    }

    // ─────────────────────────── Driver factor ───────────────────────────

    [Fact]
    public async Task UnassignedDriver_ScoresHigherThanAssignedDriverWithoutHistory()
    {
        // The unassigned penalty is 0.8 versus the 0.2 default for an assigned driver with no
        // usable history, so the weighted gap must be exactly (0.8 - 0.2) * 0.15 = 0.09.
        using var unassignedContext = TestSupport.NewContext();
        var unassigned = await TestSupport.NewPredictionService(unassignedContext)
            .ComputePredictionAsync(TestSupport.NewOrder(1, "WB-NODRIVER", driverId: null));

        using var assignedContext = TestSupport.NewContext();
        var assigned = await TestSupport.NewPredictionService(assignedContext)
            .ComputePredictionAsync(TestSupport.NewOrder(1, "WB-DRIVER", driverId: 42));

        Assert.Equal(0.09, Math.Round(unassigned.RiskScore - assigned.RiskScore, 10));
        Assert.Contains("No driver has been assigned", unassigned.RiskReason);
    }

    [Fact]
    public async Task DriverWithFewerThanThreeCompletedOrders_FallsBackAndEarnsNoConfidenceBonus()
    {
        using var context = TestSupport.NewContext();

        // Two completed orders is below the >= 3 threshold, so the breach rate is not trusted.
        TestSupport.SeedHistory(
            context, count: 2, breachedCount: 2,
            driverId: 9, route: "Route-Sparse", clientName: "Client-Sparse");

        var order = TestSupport.NewOrder(
            1, "WB-SPARSE",
            route: "Route-Sparse",
            clientName: "Client-Sparse",
            driverId: 9);

        var result = await TestSupport.NewPredictionService(context).ComputePredictionAsync(order);

        // Had the 100%-breach rate been used, the driver factor would be 1.0 (0.15 weighted)
        // instead of the 0.2 default (0.03 weighted).
        var withDefaultDriverFactor = 0.2 * PredictionService.ScoringWeights.DriverHistory;
        var withTrustedBreachRate = 1.0 * PredictionService.ScoringWeights.DriverHistory;

        Assert.True(result.RiskScore < withTrustedBreachRate);
        Assert.True(result.RiskScore >= withDefaultDriverFactor);

        // hasDriverHistory stays false, so confidence gets neither the driver nor the route
        // bonus: base 0.60 only (weight parses to 0.0 and the client has < 3 orders).
        Assert.Equal(0.60, Math.Round(result.ConfidenceScore, 10));
    }

    // ─────────────────────────── Weight parsing ───────────────────────────

    [Theory]
    [InlineData("12.5 kg")]   // parses to 12.5
    [InlineData("7 kg")]      // parses to 7
    public async Task WeightAboveFiveKg_RaisesThePackageFactor(string weight)
    {
        using var heavyContext = TestSupport.NewContext();
        var heavy = await TestSupport.NewPredictionService(heavyContext)
            .ComputePredictionAsync(TestSupport.NewOrder(1, "WB-HEAVY", weight: weight));

        using var lightContext = TestSupport.NewContext();
        var light = await TestSupport.NewPredictionService(lightContext)
            .ComputePredictionAsync(TestSupport.NewOrder(1, "WB-LIGHT", weight: "0.0 kg"));

        Assert.True(heavy.RiskScore > light.RiskScore);
    }

    [Theory]
    [InlineData("0.0 kg")]
    [InlineData("not-a-weight")]  // malformed
    [InlineData("")]              // empty
    [InlineData("kg")]            // no digits
    public async Task UnparseableOrZeroWeight_IsTreatedAsZeroWithoutThrowing(string weight)
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-WEIGHT", weight: weight);

        var result = await TestSupport.NewPredictionService(context).ComputePredictionAsync(order);

        // weightKg == 0 means no package contribution and no +0.05 confidence bonus.
        Assert.Equal(0.60, Math.Round(result.ConfidenceScore, 10));
    }

    [Fact]
    public async Task ParsedWeightAboveZero_AddsTheConfidenceBonus()
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-WEIGHTED", weight: "12.5 kg");

        var result = await TestSupport.NewPredictionService(context).ComputePredictionAsync(order);

        Assert.Equal(0.65, Math.Round(result.ConfidenceScore, 10));
    }

    [Fact]
    public async Task HeavyPackage_IsCalledOutInTheRiskReason()
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-VERYHEAVY", weight: "20.0 kg");

        var result = await TestSupport.NewPredictionService(context).ComputePredictionAsync(order);

        Assert.Contains("Package is heavy", result.RiskReason);
    }

    // ─────────────────────────── Range invariants ───────────────────────────

    [Fact]
    public async Task RiskScoreAndConfidence_StayWithinBounds_AcrossAWideInputSweep()
    {
        var priorities = new[] { "High", "Medium", "Low", "Unknown", "" };
        var clientTypes = new[] { "VIP", "Express", "Corporate", "Standard", "" };
        var hourOffsets = new double[] { -240, -1, 0, 3, 11, 23, 47, 72, 1000 };
        var weights = new[] { "0.0 kg", "6 kg", "20 kg", "garbage" };
        var driverIds = new int?[] { null, 5 };
        var attempts = new[] { 0, 1, 2, 5 };
        var conditions = new[] { 0.0, 0.5, 1.0 };

        var id = 1;
        foreach (var priority in priorities)
        foreach (var clientType in clientTypes)
        foreach (var hours in hourOffsets)
        foreach (var weight in weights)
        foreach (var driverId in driverIds)
        foreach (var attempt in attempts)
        foreach (var condition in conditions)
        {
            using var context = TestSupport.NewContext();
            var order = TestSupport.NewOrder(
                id++, $"WB-SWEEP-{id}",
                expectedDeliveryHoursFromNow: hours,
                priority: priority,
                clientType: clientType,
                driverId: driverId,
                redeliveryAttempts: attempt,
                weight: weight,
                itemCount: attempt + 1);

            var result = await TestSupport.NewPredictionService(context, condition)
                .ComputePredictionAsync(order);

            Assert.InRange(result.RiskScore, 0.0, 1.0);
            Assert.InRange(result.ConfidenceScore, 0.50, 0.98);
            Assert.False(string.IsNullOrWhiteSpace(result.RiskReason));
            Assert.False(string.IsNullOrWhiteSpace(result.RecommendedAction));
            Assert.False(string.IsNullOrWhiteSpace(result.RiskLevel));
            Assert.Contains(result.RiskLevel, new[] { "Low", "Medium", "High", "Critical" });
        }
    }

    [Fact]
    public async Task MaximumAttainableScore_StaysBelowOne_DocumentingD9()
    {
        // Factor 7 tops out at 0.7 (0.021 of its 0.03 weight), so even a worst-case order
        // cannot reach 1.0 and the upper clamp is unreachable. Nothing should treat 1.0 as
        // attainable.
        using var context = TestSupport.NewContext();
        TestSupport.SeedHistory(
            context, count: 5, breachedCount: 5,
            driverId: 3, route: "Route-Awful", clientName: "Client-Awful");

        var order = TestSupport.NewOrder(
            1, "WB-WORST",
            expectedDeliveryHoursFromNow: -100,
            priority: "High",
            clientType: "VIP",
            route: "Route-Awful",
            clientName: "Client-Awful",
            driverId: 3,
            redeliveryAttempts: 5,
            weight: "50 kg",
            itemCount: 20);

        var result = await TestSupport.NewPredictionService(context, conditionsRisk: 1.0)
            .ComputePredictionAsync(order);

        Assert.Equal("Critical", result.RiskLevel);
        Assert.True(result.RiskScore < 1.0, $"expected < 1.0 but was {result.RiskScore}");
        Assert.True(result.RiskScore > 0.97, $"expected > 0.97 but was {result.RiskScore}");
    }
}
