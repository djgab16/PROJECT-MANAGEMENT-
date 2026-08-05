using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Tests;

/// <summary>
/// Tests for factor 8's replacement signal.
/// </summary>
/// <remarks>
/// All timestamps here are explicit fixed instants rather than offsets from now, so the
/// day-of-week and time-of-day behaviour is asserted deterministically. Local time is UTC+8
/// (Asia/Manila), matching the Predictions:LocalUtcOffsetHours default.
/// </remarks>
public class ConditionsServiceTests
{
    // 2026-08-01 is a Saturday, so 2026-08-04 is a Tuesday and 2026-08-08 a Saturday.
    // Local = UTC + 8.
    private static readonly DateTime TuesdayLocal0200Utc = new(2026, 8, 3, 18, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime TuesdayLocal0800Utc = new(2026, 8, 4, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime TuesdayLocal1300Utc = new(2026, 8, 4, 5, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime SaturdayLocal0800Utc = new(2026, 8, 8, 0, 0, 0, DateTimeKind.Utc);

    private static LocalHistoryConditionsService NewService(SPXDeliveryAPI.Data.AppDbContext context)
        => new(context, TestSupport.Config(("Predictions:LocalUtcOffsetHours", "8")));

    [Fact]
    public void FixtureTimestamps_MapToTheIntendedLocalDaysAndHours()
    {
        // Self-check so a wrong fixture date cannot silently invalidate the tests below.
        Assert.Equal(DayOfWeek.Tuesday, TuesdayLocal0800Utc.AddHours(8).DayOfWeek);
        Assert.Equal(8, TuesdayLocal0800Utc.AddHours(8).Hour);
        Assert.Equal(DayOfWeek.Tuesday, TuesdayLocal0200Utc.AddHours(8).DayOfWeek);
        Assert.Equal(2, TuesdayLocal0200Utc.AddHours(8).Hour);
        Assert.Equal(DayOfWeek.Saturday, SaturdayLocal0800Utc.AddHours(8).DayOfWeek);
    }

    [Fact]
    public async Task RiskIsAlwaysNormalisedToTheUnitInterval()
    {
        using var context = TestSupport.NewContext();
        var snapshot = await NewService(context).CreateSnapshotAsync();

        foreach (var hour in Enumerable.Range(0, 24))
        {
            var instant = new DateTime(2026, 8, 4, hour, 0, 0, DateTimeKind.Utc);
            var risk = snapshot.GetConditionsRisk("Route-A", "Area-A", instant);
            Assert.InRange(risk, 0.0, 1.0);
        }
    }

    [Fact]
    public async Task TimeOfDayChangesTheRisk_RushHourVersusOvernight()
    {
        using var context = TestSupport.NewContext();
        var snapshot = await NewService(context).CreateSnapshotAsync();

        var overnight = snapshot.GetConditionsRisk("Route-A", "Area-A", TuesdayLocal0200Utc);
        var rushHour = snapshot.GetConditionsRisk("Route-A", "Area-A", TuesdayLocal0800Utc);
        var midday = snapshot.GetConditionsRisk("Route-A", "Area-A", TuesdayLocal1300Utc);

        // With no history, historical = 0.2 fallback (0.11 weighted) for all three, so the
        // differences come purely from the congestion window.
        Assert.Equal(0.11, Math.Round(overnight, 10));   // congestion 0.0
        Assert.Equal(0.36, Math.Round(rushHour, 10));    // congestion 1.0 -> +0.25
        Assert.Equal(0.16, Math.Round(midday, 10));      // congestion 0.2 -> +0.05

        Assert.True(rushHour > midday);
        Assert.True(midday > overnight);
    }

    [Fact]
    public async Task WeekendRaisesTheRiskRelativeToTheSameHourOnAWeekday()
    {
        using var context = TestSupport.NewContext();
        var snapshot = await NewService(context).CreateSnapshotAsync();

        var weekday = snapshot.GetConditionsRisk("Route-A", "Area-A", TuesdayLocal0800Utc);
        var weekend = snapshot.GetConditionsRisk("Route-A", "Area-A", SaturdayLocal0800Utc);

        Assert.Equal(0.36, Math.Round(weekday, 10));
        Assert.Equal(0.56, Math.Round(weekend, 10));  // +0.20 calendar weight
    }

    [Fact]
    public async Task DifferentRoutesAtDifferentTimesProduceDifferentValues()
    {
        // The headline requirement: factor 8 must actually discriminate. The old
        // implementation returned 0.2 on weekdays and 0.533 at weekends for every order
        // regardless of route or hour.
        using var context = TestSupport.NewContext();

        // Route-Bad: every completed delivery breached. Route-Good: none did.
        TestSupport.SeedHistory(
            context, count: 6, breachedCount: 6,
            driverId: 1, route: "Route-Bad", clientName: "Client-1",
            startId: 2000, area: "Area-Bad");

        TestSupport.SeedHistory(
            context, count: 6, breachedCount: 0,
            driverId: 2, route: "Route-Good", clientName: "Client-2",
            startId: 3000, area: "Area-Good");

        var snapshot = await NewService(context).CreateSnapshotAsync();

        var badAtRushHour = snapshot.GetConditionsRisk("Route-Bad", "Area-Bad", TuesdayLocal0800Utc);
        var goodOvernight = snapshot.GetConditionsRisk("Route-Good", "Area-Good", TuesdayLocal0200Utc);

        Assert.NotEqual(badAtRushHour, goodOvernight);
        Assert.True(
            badAtRushHour > goodOvernight,
            $"expected the historically-breaching route at rush hour ({badAtRushHour}) " +
            $"to exceed the clean route overnight ({goodOvernight})");
    }

    [Fact]
    public async Task RouteHistoryShiftsRiskIndependentlyOfTheClock()
    {
        using var context = TestSupport.NewContext();

        TestSupport.SeedHistory(
            context, count: 6, breachedCount: 6,
            driverId: 1, route: "Route-Bad", clientName: "Client-1",
            startId: 2000, area: "Area-Bad");

        TestSupport.SeedHistory(
            context, count: 6, breachedCount: 0,
            driverId: 2, route: "Route-Good", clientName: "Client-2",
            startId: 3000, area: "Area-Good");

        var snapshot = await NewService(context).CreateSnapshotAsync();

        // Same instant for both, so only the route history differs.
        var bad = snapshot.GetConditionsRisk("Route-Bad", "Area-Bad", TuesdayLocal0800Utc);
        var good = snapshot.GetConditionsRisk("Route-Good", "Area-Good", TuesdayLocal0800Utc);

        Assert.True(bad > good, $"bad={bad} good={good}");

        // 100% breach rate contributes 0.55; 0% contributes 0. Both share congestion 0.25.
        Assert.Equal(0.80, Math.Round(bad, 10));
        Assert.Equal(0.25, Math.Round(good, 10));
    }

    [Fact]
    public async Task AreaIsUsedAsAFallbackWhenRouteIsMissing()
    {
        // Confirms the area parameter is genuinely part of the resolution chain rather than
        // decorative.
        using var context = TestSupport.NewContext();

        TestSupport.SeedHistory(
            context, count: 6, breachedCount: 6,
            driverId: 1, route: "Route-Bad", clientName: "Client-1",
            startId: 2000, area: "Area-Bad");

        // A clean second group so the global fallback rate (50%) is distinguishable from
        // Area-Bad's own rate (100%). Without it both resolve to the same number and the test
        // could not tell an area hit from a global fallback.
        TestSupport.SeedHistory(
            context, count: 6, breachedCount: 0,
            driverId: 2, route: "Route-Good", clientName: "Client-2",
            startId: 3000, area: "Area-Good");

        var snapshot = await NewService(context).CreateSnapshotAsync();

        var viaArea = snapshot.GetConditionsRisk(null, "Area-Bad", TuesdayLocal0800Utc);
        var viaNothing = snapshot.GetConditionsRisk(null, null, TuesdayLocal0800Utc);

        // Area-Bad resolves on its own 100% rate: 0.55 + 0.25 congestion.
        Assert.Equal(0.80, Math.Round(viaArea, 10));

        // With neither key, the global 6/12 = 50% rate applies: 0.275 + 0.25 congestion.
        Assert.Equal(0.525, Math.Round(viaNothing, 10));
    }

    [Fact]
    public async Task SparseHistoryFallsBackRatherThanTrustingATinySample()
    {
        using var context = TestSupport.NewContext();

        // Two orders is below the >= 3 minimum-sample threshold.
        TestSupport.SeedHistory(
            context, count: 2, breachedCount: 2,
            driverId: 1, route: "Route-Sparse", clientName: "Client-1",
            startId: 4000, area: "Area-Sparse");

        var snapshot = await NewService(context).CreateSnapshotAsync();
        var risk = snapshot.GetConditionsRisk("Route-Sparse", "Area-Sparse", TuesdayLocal0200Utc);

        // Global history is also below the threshold, so the 0.2 default applies: 0.11.
        Assert.Equal(0.11, Math.Round(risk, 10));
    }

    [Fact]
    public async Task ConfiguredUtcOffsetShiftsTheLocalWindows()
    {
        using var context = TestSupport.NewContext();

        // At UTC+0 the same instant is 00:00 local (overnight) rather than 08:00 (rush hour).
        var utcService = new LocalHistoryConditionsService(
            context, TestSupport.Config(("Predictions:LocalUtcOffsetHours", "0")));

        var snapshot = await utcService.CreateSnapshotAsync();
        var risk = snapshot.GetConditionsRisk("Route-A", "Area-A", TuesdayLocal0800Utc);

        Assert.Equal(0.11, Math.Round(risk, 10));  // congestion 0.0 overnight
    }
}
