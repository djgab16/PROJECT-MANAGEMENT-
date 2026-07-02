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
                var notificationsToDelete = await context.Notifications
                    .Where(n => n.Date < oneYearAgo)
                    .ToListAsync();

                if (notificationsToDelete.Any())
                {
                    context.Notifications.RemoveRange(notificationsToDelete);
                    _logger.LogInformation($"Purged {notificationsToDelete.Count} notifications older than 1 year.");
                }

                // 2. Purge Activity logs older than 7 years (2555 days)
                var sevenYearsAgo = now.AddYears(-7);
                var logsToDelete = await context.ActivityLogs
                    .Where(a => a.Timestamp < sevenYearsAgo)
                    .ToListAsync();

                if (logsToDelete.Any())
                {
                    context.ActivityLogs.RemoveRange(logsToDelete);
                    _logger.LogInformation($"Purged {logsToDelete.Count} activity logs older than 7 years.");
                }

                // 3. Purge GPS Coordinates older than 90 days
                var ninetyDaysAgo = now.AddDays(-90);
                var ordersToPurge = await context.DeliveryOrders
                    .Where(o => (o.LiveLatitude != null || o.LiveLongitude != null || o.LastLiveUpdate != null) &&
                                (o.LastLiveUpdate < ninetyDaysAgo || (o.LastLiveUpdate == null && o.LastUpdated < ninetyDaysAgo)))
                    .ToListAsync();

                if (ordersToPurge.Any())
                {
                    foreach (var order in ordersToPurge)
                    {
                        order.LiveLatitude = null;
                        order.LiveLongitude = null;
                        order.LastLiveUpdate = null;
                    }

                    _logger.LogInformation($"Purged GPS coordinate history for {ordersToPurge.Count} orders older than 90 days.");
                }

                if (notificationsToDelete.Any() || logsToDelete.Any() || ordersToPurge.Any())
                {
                    await context.SaveChangesAsync();
                }
            }
        }
    }
}
