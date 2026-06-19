using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Services
{
    public class DataRetentionService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DataRetentionService> _logger;

        public DataRetentionService(IServiceProvider serviceProvider, ILogger<DataRetentionService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Data Retention Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Data Retention Service is executing database cleanup tasks...");

                    await PurgeRetentionDataAsync();

                    _logger.LogInformation("Data Retention Service completed database cleanup tasks.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while executing data retention cleanups.");
                }

                // Wait 24 hours before next execution (or stoppingToken cancelled)
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }

            _logger.LogInformation("Data Retention Service is stopping.");
        }

        private async Task PurgeRetentionDataAsync()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var now = DateTime.UtcNow;

                // 1. Purge Notifications older than 1 year (365 days)
                var oneYearAgo = now.AddYears(-1);
                var notificationDates = await context.Notifications
                    .Select(n => new { n.Id, n.Date })
                    .ToListAsync();

                var notificationIdsToDelete = notificationDates
                    .Where(n => DateTime.TryParse(n.Date, out var parsedDate) && parsedDate < oneYearAgo)
                    .Select(n => n.Id)
                    .ToList();

                if (notificationIdsToDelete.Any())
                {
                    var toDelete = notificationIdsToDelete.Select(id => new Notification { Id = id }).ToList();
                    context.Notifications.RemoveRange(toDelete);
                    _logger.LogInformation($"Purged {notificationIdsToDelete.Count} notifications older than 1 year.");
                }

                // 2. Purge Activity logs older than 7 years (2555 days)
                var sevenYearsAgo = now.AddYears(-7);
                var activityLogTimestamps = await context.ActivityLogs
                    .Select(a => new { a.Id, a.Timestamp })
                    .ToListAsync();

                var activityLogIdsToDelete = activityLogTimestamps
                    .Where(a => DateTime.TryParse(a.Timestamp, out var parsedTimestamp) && parsedTimestamp < sevenYearsAgo)
                    .Select(a => a.Id)
                    .ToList();

                if (activityLogIdsToDelete.Any())
                {
                    var toDelete = activityLogIdsToDelete.Select(id => new ActivityLog { Id = id }).ToList();
                    context.ActivityLogs.RemoveRange(toDelete);
                    _logger.LogInformation($"Purged {activityLogIdsToDelete.Count} activity logs older than 7 years.");
                }

                // 3. Purge GPS Coordinates older than 90 days
                var ninetyDaysAgo = now.AddDays(-90);
                var ordersWithGps = await context.DeliveryOrders
                    .Where(o => o.LiveLatitude != null || o.LiveLongitude != null || o.LastLiveUpdate != null)
                    .Select(o => new { o.Id, o.LastLiveUpdate, o.LastUpdated })
                    .ToListAsync();

                var orderIdsToPurge = ordersWithGps
                    .Where(o =>
                    {
                        if (!string.IsNullOrEmpty(o.LastLiveUpdate))
                        {
                            return DateTime.TryParse(o.LastLiveUpdate, out var parsedUpdate) && parsedUpdate < ninetyDaysAgo;
                        }
                        if (!string.IsNullOrEmpty(o.LastUpdated))
                        {
                            return DateTime.TryParse(o.LastUpdated, out var parsedUpdated) && parsedUpdated < ninetyDaysAgo;
                        }
                        return true;
                    })
                    .Select(o => o.Id)
                    .ToList();

                if (orderIdsToPurge.Any())
                {
                    var ordersToUpdate = await context.DeliveryOrders
                        .Where(o => orderIdsToPurge.Contains(o.Id))
                        .ToListAsync();

                    foreach (var order in ordersToUpdate)
                    {
                        order.LiveLatitude = null;
                        order.LiveLongitude = null;
                        order.LastLiveUpdate = null;
                    }

                    _logger.LogInformation($"Purged GPS coordinate history for {ordersToUpdate.Count} orders older than 90 days.");
                }

                if (notificationIdsToDelete.Any() || activityLogIdsToDelete.Any() || orderIdsToPurge.Any())
                {
                    await context.SaveChangesAsync();
                }
            }
        }
    }
}
