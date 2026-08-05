using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Tests;

/// <summary>
/// Task 3: the background recompute scheduler.
/// </summary>
/// <remarks>
/// Driving the hosted service through StartAsync/StopAsync is how the "stops cleanly with no
/// unobserved-task exceptions" requirement is verified. Killing the host process (which is what
/// a force-terminate does) cannot demonstrate graceful cancellation.
/// </remarks>
public class PredictionSchedulerTests
{
    private static ServiceProvider BuildProvider(
        string databaseName,
        params (string Key, string Value)[] settings)
    {
        var services = new ServiceCollection();

        services.AddSingleton<IConfiguration>(TestSupport.Config(settings));
        services.AddLogging(b => b.SetMinimumLevel(LogLevel.Debug));

        services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(databaseName));
        services.AddSingleton<IPredictionCache>(_ => TestSupport.NewCache());
        services.AddScoped<ISlaService>(sp => new SlaService(sp.GetRequiredService<IConfiguration>()));
        services.AddScoped<IExternalConditionsService>(_ => new StubConditionsService(0.0));
        services.AddScoped<IPredictionService, PredictionService>();

        return services.BuildServiceProvider();
    }

    private static async Task SeedActiveOrderAsync(ServiceProvider provider)
    {
        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.DeliveryOrders.Add(TestSupport.NewOrder(1, "WB-SCHED"));
        await context.SaveChangesAsync();
    }

    private static async Task<int> AutoRunCountAsync(ServiceProvider provider)
    {
        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.ActivityLogs.CountAsync(a => a.Reference!.StartsWith("AutoRun-"));
    }

    [Fact]
    public async Task DisabledScheduler_PerformsNoRunsAndStopsCleanly()
    {
        var db = $"sched-disabled-{Guid.NewGuid():N}";
        using var provider = BuildProvider(db,
            ("Predictions:SchedulerEnabled", "false"),
            ("Predictions:SchedulerStartupDelaySeconds", "0"));

        await SeedActiveOrderAsync(provider);

        var service = new PredictionSchedulerService(
            provider,
            provider.GetRequiredService<ILogger<PredictionSchedulerService>>(),
            provider.GetRequiredService<IConfiguration>());

        await service.StartAsync(CancellationToken.None);
        await Task.Delay(500);
        await service.StopAsync(CancellationToken.None);

        Assert.Equal(0, await AutoRunCountAsync(provider));

        // ExecuteAsync returned normally rather than faulting.
        Assert.NotNull(service.ExecuteTask);
        Assert.Equal(TaskStatus.RanToCompletion, service.ExecuteTask!.Status);
    }

    [Fact]
    public async Task EnabledScheduler_RunsOnceAndWritesAnAutoRunAuditRow()
    {
        var db = $"sched-enabled-{Guid.NewGuid():N}";
        using var provider = BuildProvider(db,
            ("Predictions:SchedulerEnabled", "true"),
            ("Predictions:SchedulerStartupDelaySeconds", "0"),
            ("Predictions:RecomputeIntervalMinutes", "30"));

        await SeedActiveOrderAsync(provider);

        var service = new PredictionSchedulerService(
            provider,
            provider.GetRequiredService<ILogger<PredictionSchedulerService>>(),
            provider.GetRequiredService<IConfiguration>());

        await service.StartAsync(CancellationToken.None);
        await WaitForAutoRunsAsync(provider, atLeast: 1);
        await service.StopAsync(CancellationToken.None);

        Assert.Equal(1, await AutoRunCountAsync(provider));

        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var log = await context.ActivityLogs.SingleAsync(a => a.Reference!.StartsWith("AutoRun-"));

        Assert.Equal("System Scheduler", log.UserName);
        Assert.Equal("SYSTEM", log.UserRole);
        Assert.Equal("SY", log.UserInitials);
        Assert.Equal("#3b82f6", log.UserColor);
        Assert.Equal("Prediction", log.Action);
        Assert.StartsWith("AutoRun-", log.Reference);

        // Must be distinguishable from a manual run, which uses the bare "Run-" prefix.
        Assert.False(
            log.Reference!.StartsWith("Run-", StringComparison.Ordinal),
            "scheduled runs must not use the manual 'Run-' reference prefix");
        Assert.Contains("Automated", log.Description);
        Assert.True(log.Reference!.Length <= 50);
        Assert.True(log.UserInitials.Length <= 2);
        Assert.True(log.UserColor.Length <= 7);
    }

    [Fact]
    public async Task StoppingMidLifetime_CancelsCleanlyWithoutFaulting()
    {
        var db = $"sched-stop-{Guid.NewGuid():N}";
        using var provider = BuildProvider(db,
            ("Predictions:SchedulerEnabled", "true"),
            ("Predictions:SchedulerStartupDelaySeconds", "0"),
            ("Predictions:RecomputeIntervalMinutes", "30"));

        await SeedActiveOrderAsync(provider);

        var service = new PredictionSchedulerService(
            provider,
            provider.GetRequiredService<ILogger<PredictionSchedulerService>>(),
            provider.GetRequiredService<IConfiguration>());

        await service.StartAsync(CancellationToken.None);
        await WaitForAutoRunsAsync(provider, atLeast: 1);

        // The service is now parked in its interval delay; stopping must unwind the
        // OperationCanceledException internally rather than surfacing it.
        await service.StopAsync(CancellationToken.None);

        Assert.NotNull(service.ExecuteTask);
        Assert.Equal(TaskStatus.RanToCompletion, service.ExecuteTask!.Status);
        Assert.Null(service.ExecuteTask.Exception);

        service.Dispose();
    }

    [Fact]
    public async Task MisconfiguredZeroInterval_IsClampedInsteadOfHotLooping()
    {
        // A 0-minute interval must not spin. Clamped to the 5-minute floor, so only the first
        // run can occur inside this window.
        var db = $"sched-clamp-{Guid.NewGuid():N}";
        using var provider = BuildProvider(db,
            ("Predictions:SchedulerEnabled", "true"),
            ("Predictions:SchedulerStartupDelaySeconds", "0"),
            ("Predictions:RecomputeIntervalMinutes", "0"));

        await SeedActiveOrderAsync(provider);

        var service = new PredictionSchedulerService(
            provider,
            provider.GetRequiredService<ILogger<PredictionSchedulerService>>(),
            provider.GetRequiredService<IConfiguration>());

        await service.StartAsync(CancellationToken.None);
        await WaitForAutoRunsAsync(provider, atLeast: 1);
        await Task.Delay(2000);
        await service.StopAsync(CancellationToken.None);

        // An unclamped 0-minute interval would have produced many runs in two seconds.
        Assert.Equal(1, await AutoRunCountAsync(provider));
    }

    [Fact]
    public async Task StartupDelayIsHonoured()
    {
        var db = $"sched-delay-{Guid.NewGuid():N}";
        using var provider = BuildProvider(db,
            ("Predictions:SchedulerEnabled", "true"),
            ("Predictions:SchedulerStartupDelaySeconds", "30"),
            ("Predictions:RecomputeIntervalMinutes", "5"));

        await SeedActiveOrderAsync(provider);

        var service = new PredictionSchedulerService(
            provider,
            provider.GetRequiredService<ILogger<PredictionSchedulerService>>(),
            provider.GetRequiredService<IConfiguration>());

        await service.StartAsync(CancellationToken.None);
        await Task.Delay(1500);

        // Still inside the 30s startup delay, so nothing has run yet.
        Assert.Equal(0, await AutoRunCountAsync(provider));

        await service.StopAsync(CancellationToken.None);
        Assert.Equal(TaskStatus.RanToCompletion, service.ExecuteTask!.Status);
    }

    private static async Task WaitForAutoRunsAsync(ServiceProvider provider, int atLeast, int timeoutMs = 15000)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < deadline)
        {
            if (await AutoRunCountAsync(provider) >= atLeast)
            {
                return;
            }

            await Task.Delay(100);
        }

        throw new TimeoutException($"Expected at least {atLeast} AutoRun row(s) within {timeoutMs}ms.");
    }
}
