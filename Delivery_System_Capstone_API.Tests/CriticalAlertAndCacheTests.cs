using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Models;
using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Tests;

/// <summary>
/// Task 7 (Critical-escalation alerts) and Task 6 (aggregate cache eviction).
/// </summary>
public class CriticalAlertAndCacheTests
{
    /// <summary>An order profile that scores Critical: overdue, high priority, repeatedly
    /// failed, unassigned driver.</summary>
    private static DeliveryOrder CriticalOrder(int id = 1, string waybill = "WB-CRIT-1")
        => TestSupport.NewOrder(
            id, waybill,
            expectedDeliveryHoursFromNow: -12,
            priority: "High",
            driverId: null,
            redeliveryAttempts: 2);

    private static async Task<int> AlertCountAsync(SPXDeliveryAPI.Data.AppDbContext context, string waybill)
        => await context.Notifications
            .CountAsync(n => n.WaybillNo == waybill && n.StatusBadge == "Critical");

    [Fact]
    public async Task CrossingIntoCritical_RaisesExactlyOneAlert()
    {
        using var context = TestSupport.NewContext();
        var order = CriticalOrder();
        context.DeliveryOrders.Add(order);
        await context.SaveChangesAsync();

        var service = TestSupport.NewPredictionService(context, conditionsRisk: 0.5);
        await service.RunPredictionsAsync();

        Assert.Equal("Critical", (await context.DeliveryPredictions.SingleAsync()).RiskLevel);
        Assert.Equal(1, await AlertCountAsync(context, order.WaybillNo));

        var alert = await context.Notifications.SingleAsync();
        Assert.Equal("alert", alert.Type);
        Assert.Equal("Critical", alert.StatusBadge);
        Assert.Equal("SLA Prediction Engine", alert.Source);
        Assert.Equal(order.WaybillNo, alert.WaybillNo);
        Assert.False(alert.Read);
        Assert.Contains(order.WaybillNo, alert.Title);
        Assert.True(alert.Title.Length <= 200);
        Assert.True(alert.WaybillNo!.Length <= 50);
        Assert.True(alert.Source.Length <= 100);
        Assert.False(string.IsNullOrWhiteSpace(alert.Description));
        Assert.False(string.IsNullOrWhiteSpace(alert.Timestamp));
    }

    [Fact]
    public async Task TenConsecutiveRunsWhileStillCritical_RaiseNoAdditionalAlerts()
    {
        using var context = TestSupport.NewContext();
        var order = CriticalOrder();
        context.DeliveryOrders.Add(order);
        await context.SaveChangesAsync();

        var service = TestSupport.NewPredictionService(context, conditionsRisk: 0.5);

        await service.RunPredictionsAsync();
        Assert.Equal(1, await AlertCountAsync(context, order.WaybillNo));

        // The scheduler runs every 30 minutes by default; a naive implementation would add an
        // alert on each pass and flood the feed.
        for (var i = 0; i < 10; i++)
        {
            await service.RunPredictionsAsync();
        }

        Assert.Equal("Critical", (await context.DeliveryPredictions.SingleAsync()).RiskLevel);
        Assert.Equal(1, await AlertCountAsync(context, order.WaybillNo));
    }

    [Fact]
    public async Task RecoveryThenReEscalation_RaisesASecondAlert()
    {
        using var context = TestSupport.NewContext();
        var order = CriticalOrder();
        context.DeliveryOrders.Add(order);
        await context.SaveChangesAsync();

        var service = TestSupport.NewPredictionService(context, conditionsRisk: 0.5);

        // 1. Escalate.
        await service.RunPredictionsAsync();
        Assert.Equal(1, await AlertCountAsync(context, order.WaybillNo));

        // 2. Recover: comfortably inside SLA, low priority, no failed attempts.
        order.ExpectedDelivery = DateTime.UtcNow.AddHours(96);
        order.Priority = "Low";
        order.RedeliveryAttemptCount = 0;
        order.DriverId = 5;
        await context.SaveChangesAsync();

        await service.RunPredictionsAsync();
        var recovered = await context.DeliveryPredictions.SingleAsync();
        Assert.NotEqual("Critical", recovered.RiskLevel);
        Assert.Equal(1, await AlertCountAsync(context, order.WaybillNo));

        // 3. Escalate again — a genuinely new transition.
        order.ExpectedDelivery = DateTime.UtcNow.AddHours(-12);
        order.Priority = "High";
        order.RedeliveryAttemptCount = 2;
        order.DriverId = null;
        await context.SaveChangesAsync();

        await service.RunPredictionsAsync();
        Assert.Equal("Critical", (await context.DeliveryPredictions.SingleAsync()).RiskLevel);
        Assert.Equal(2, await AlertCountAsync(context, order.WaybillNo));
    }

    [Fact]
    public async Task NonCriticalOrders_RaiseNoAlerts()
    {
        using var context = TestSupport.NewContext();
        var order = TestSupport.NewOrder(1, "WB-CALM", expectedDeliveryHoursFromNow: 96, priority: "Low", driverId: 5);
        context.DeliveryOrders.Add(order);
        await context.SaveChangesAsync();

        await TestSupport.NewPredictionService(context).RunPredictionsAsync();

        Assert.NotEqual("Critical", (await context.DeliveryPredictions.SingleAsync()).RiskLevel);
        Assert.Empty(await context.Notifications.ToListAsync());
    }

    // ─────────────────────────── Cache behaviour ───────────────────────────

    [Fact]
    public async Task AggregateCache_ServesTheSecondCallWithoutReinvokingTheFactory()
    {
        var cache = TestSupport.NewCache();
        var factoryCalls = 0;

        Task<string> Factory()
        {
            factoryCalls++;
            return Task.FromResult($"value-{factoryCalls}");
        }

        var first = await cache.GetOrCreateAggregateAsync(PredictionCache.SlaSummaryKey, Factory);
        var second = await cache.GetOrCreateAggregateAsync(PredictionCache.SlaSummaryKey, Factory);

        Assert.Equal(1, factoryCalls);
        Assert.Equal("value-1", first);
        Assert.Equal("value-1", second);
    }

    [Fact]
    public async Task InvalidateAggregates_DropsBothCachedEndpoints()
    {
        var cache = TestSupport.NewCache();

        await cache.GetOrCreateAggregateAsync(PredictionCache.SlaSummaryKey, () => Task.FromResult("summary"));
        await cache.GetOrCreateAggregateAsync(PredictionCache.DriverPerformanceKey, () => Task.FromResult("drivers"));

        cache.InvalidateAggregates();

        var summaryRecomputed = false;
        var driversRecomputed = false;

        await cache.GetOrCreateAggregateAsync(PredictionCache.SlaSummaryKey, () =>
        {
            summaryRecomputed = true;
            return Task.FromResult("summary-2");
        });

        await cache.GetOrCreateAggregateAsync(PredictionCache.DriverPerformanceKey, () =>
        {
            driversRecomputed = true;
            return Task.FromResult("drivers-2");
        });

        Assert.True(summaryRecomputed, "sla-summary should have been evicted");
        Assert.True(driversRecomputed, "driver-performance should have been evicted");
    }

    [Fact]
    public async Task RunPredictions_EvictsTheAggregateCache()
    {
        // The centralisation requirement: eviction lives inside RunPredictionsAsync, so it fires
        // for the manual endpoint, the scheduler, and any future caller alike.
        using var context = TestSupport.NewContext();
        context.DeliveryOrders.Add(TestSupport.NewOrder(1, "WB-EVICT"));
        await context.SaveChangesAsync();

        var cache = TestSupport.NewCache();
        await cache.GetOrCreateAggregateAsync(PredictionCache.SlaSummaryKey, () => Task.FromResult("stale"));

        await TestSupport.NewPredictionService(context, cache: cache).RunPredictionsAsync();

        var recomputed = false;
        var value = await cache.GetOrCreateAggregateAsync(PredictionCache.SlaSummaryKey, () =>
        {
            recomputed = true;
            return Task.FromResult("fresh");
        });

        Assert.True(recomputed, "a recompute must invalidate the cached summary");
        Assert.Equal("fresh", value);
    }
}
