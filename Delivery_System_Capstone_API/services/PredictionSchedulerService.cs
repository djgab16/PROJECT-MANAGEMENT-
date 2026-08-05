using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Services
{
    /// <summary>
    /// Periodically recomputes at-risk SLA predictions without operator intervention.
    /// </summary>
    /// <remarks>
    /// The SLA-remaining-time factor carries the largest weight in the scoring model
    /// (0.35) and decays continuously with wall-clock time. When predictions are only
    /// refreshed by a human pressing "Recompute SLA Risk", a stored RiskScore drifts
    /// further below the true risk the longer it sits, because the remaining hours keep
    /// shrinking while the persisted score does not. This service closes that gap.
    /// <para>
    /// Structure intentionally mirrors <see cref="DataRetentionService"/>: scoped service
    /// resolution per iteration, a try/catch inside the loop so a single failure can never
    /// terminate the service, and a cancellable delay at the end of each pass.
    /// </para>
    /// </remarks>
    public class PredictionSchedulerService : BackgroundService
    {
        private const int DefaultIntervalMinutes = 30;

        /// <summary>
        /// Lower bound on the recompute interval. Guards against a misconfigured 0 (or a
        /// negative value) turning the loop into a hot spin against the database.
        /// </summary>
        private const int MinimumIntervalMinutes = 5;

        private const int DefaultStartupDelaySeconds = 60;

        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<PredictionSchedulerService> _logger;
        private readonly IConfiguration _configuration;

        /// <summary>
        /// Non-blocking overlap guard. Acquired with a zero timeout so a tick that arrives
        /// while a recompute is still in flight is skipped rather than queued behind it.
        /// </summary>
        private readonly SemaphoreSlim _runGate = new SemaphoreSlim(1, 1);

        public PredictionSchedulerService(
            IServiceProvider serviceProvider,
            ILogger<PredictionSchedulerService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Honour the kill switch by logging once and exiting cleanly. Returning from
            // ExecuteAsync simply completes the hosted service; the application still starts.
            if (!IsSchedulerEnabled())
            {
                _logger.LogInformation(
                    "Prediction Scheduler Service is disabled (Predictions:SchedulerEnabled = false). No automatic recomputes will run.");
                return;
            }

            var interval = ResolveInterval();
            var startupDelay = ResolveStartupDelay();

            _logger.LogInformation(
                "Prediction Scheduler Service is starting. Interval: {IntervalMinutes} minute(s), startup delay: {StartupDelaySeconds}s.",
                interval.TotalMinutes,
                startupDelay.TotalSeconds);

            // Stagger the first run so the scheduler does not contend with application
            // warm-up, migrations and seeding.
            if (startupDelay > TimeSpan.Zero)
            {
                try
                {
                    await Task.Delay(startupDelay, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Prediction Scheduler Service stopped during its startup delay.");
                    return;
                }
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunScheduledRecomputeAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    // Shutdown requested mid-run: expected, not an error.
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while executing the scheduled prediction recompute.");
                }

                try
                {
                    await Task.Delay(interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }

            _logger.LogInformation("Prediction Scheduler Service is stopping.");
        }

        private async Task RunScheduledRecomputeAsync(CancellationToken stoppingToken)
        {
            if (!_runGate.Wait(0))
            {
                _logger.LogWarning(
                    "A prediction recompute is still in flight. Skipping this scheduled tick to avoid overlapping runs.");
                return;
            }

            try
            {
                var stopwatch = Stopwatch.StartNew();

                using var scope = _serviceProvider.CreateScope();
                var predictionService = scope.ServiceProvider.GetRequiredService<IPredictionService>();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var processedCount = await predictionService.RunPredictionsAsync();

                stopwatch.Stop();

                // Audit trail: every recompute writes an ActivityLog row, manual or scheduled.
                // The "AutoRun-" reference prefix distinguishes these from the "Run-" prefix
                // written by POST /api/predictions/run, so scheduled and operator-triggered
                // runs stay separable in the activity feed.
                var activityLog = new ActivityLog
                {
                    Timestamp = DateTime.UtcNow,
                    UserName = "System Scheduler",
                    UserRole = "SYSTEM",
                    UserInitials = "SY",
                    UserColor = "#3b82f6",
                    Action = "Prediction",
                    Description =
                        $"Automated scheduled recompute (no operator involved). Recomputed at-risk SLA predictions for {processedCount} active orders in {stopwatch.ElapsedMilliseconds}ms.",
                    Reference = $"AutoRun-{DateTime.UtcNow:yyyyMMddHHmmss}"
                };

                await context.ActivityLogs.AddAsync(activityLog, stoppingToken);
                await context.SaveChangesAsync(stoppingToken);

                _logger.LogInformation(
                    "Scheduled prediction recompute completed. Processed {ProcessedCount} active order(s) in {ElapsedMs}ms.",
                    processedCount,
                    stopwatch.ElapsedMilliseconds);
            }
            finally
            {
                _runGate.Release();
            }
        }

        /// <summary>
        /// Reads Predictions:SchedulerEnabled, defaulting to enabled when absent or unparseable.
        /// </summary>
        private bool IsSchedulerEnabled()
        {
            return _configuration.GetValue<bool?>("Predictions:SchedulerEnabled") ?? true;
        }

        /// <summary>
        /// Reads Predictions:RecomputeIntervalMinutes with a safe fallback and a hard floor.
        /// </summary>
        private TimeSpan ResolveInterval()
        {
            var configured =
                _configuration.GetValue<int?>("Predictions:RecomputeIntervalMinutes")
                ?? DefaultIntervalMinutes;

            if (configured < MinimumIntervalMinutes)
            {
                _logger.LogWarning(
                    "Predictions:RecomputeIntervalMinutes is {ConfiguredMinutes}, which is below the supported floor. Clamping to {FloorMinutes} minute(s).",
                    configured,
                    MinimumIntervalMinutes);

                configured = MinimumIntervalMinutes;
            }

            return TimeSpan.FromMinutes(configured);
        }

        /// <summary>
        /// Reads Predictions:SchedulerStartupDelaySeconds. Exists so the delay can be shortened
        /// in development and integration checks without weakening the interval floor.
        /// Negative values are treated as no delay.
        /// </summary>
        private TimeSpan ResolveStartupDelay()
        {
            var configured =
                _configuration.GetValue<int?>("Predictions:SchedulerStartupDelaySeconds")
                ?? DefaultStartupDelaySeconds;

            return configured <= 0 ? TimeSpan.Zero : TimeSpan.FromSeconds(configured);
        }

        public override void Dispose()
        {
            _runGate.Dispose();
            base.Dispose();
        }
    }
}
