using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "OpTeamAndAbove")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("analytics")]
        public async Task<IActionResult> GetAnalytics()
        {
            // ─── Query strategy ───────────────────────────────────────────────────────
            // Narrow projection rather than full entities. This previously issued
            // `DeliveryOrders.ToListAsync()` with no projection, materialising every column of
            // every row — including PotImage and PodImage, two nvarchar(max) base64 payloads —
            // to read the six fields below. Matches the projection discipline already used in
            // PredictionsController.
            //
            // Date arithmetic and the day-of-week bucketing below stay in memory deliberately:
            // SQL Server translates DateTime subtraction through DATEDIFF, which truncates to
            // whole units and would shift the rounded average reported below.
            var orders = await _context.DeliveryOrders
                .AsNoTracking()
                .Select(o => new
                {
                    o.Status,
                    o.TaskType,
                    o.PotStatus,
                    o.OrderDate,
                    o.DateCompleted,
                    o.LastUpdated
                })
                .ToListAsync();

            var totalCount = orders.Count;
            var terminalOrders = orders.Where(o => 
                o.Status == "Completed" || 
                o.Status == "Delivered" || 
                (o.Status == "Picked Up" && o.TaskType == "Pickup") || 
                o.Status == "Failed" || 
                o.Status == "Returned" ||
                o.Status == "Cancelled"
            ).ToList();

            var completedCount = orders.Count(o => o.Status == "Completed" || o.Status == "Delivered" || (o.Status == "Picked Up" && o.TaskType == "Pickup"));
            var failedCount = orders.Count(o => o.Status == "Failed");
            var successRate = terminalOrders.Count > 0 ? $"{(int)Math.Round((double)completedCount / terminalOrders.Count * 100)}%" : "0%";
            var potSubmittedCount = orders.Count(o => o.PotStatus == "Submitted");

            // ─── Average delivery duration ────────────────────────────────────────────
            // Was the literal 3.5. That constant was a placeholder, not a measurement, and it
            // reported the same figure regardless of the data in the database.
            //
            // Deliberately uses the same definition as SlaSummaryDto.AverageDeliveryDurationHours
            // (see PredictionsController.BuildSlaSummaryAsync): the mean elapsed time from
            // OrderDate to DateCompleted across orders that reached a terminal state and carry a
            // completion timestamp. Reusing that definition rather than inventing a second one
            // keeps the analytics endpoint and the SLA dashboard from reporting two different
            // "average delivery time" values for the same dataset.
            //
            // Orders without a DateCompleted are excluded rather than treated as zero, so an
            // in-flight backlog cannot drag the average down. An empty set reports 0.
            var completedWithTimestamps = orders
                .Where(o => o.DateCompleted.HasValue
                         && (o.Status == "Delivered"
                          || o.Status == "Completed"
                          || o.Status == "Failed"
                          || o.Status == "Returned"))
                .ToList();

            var averageDeliveryTimeHours = completedWithTimestamps.Count > 0
                ? Math.Round(
                    completedWithTimestamps.Average(o => (o.DateCompleted!.Value - o.OrderDate).TotalHours),
                    1)
                : 0.0;

            var days = new[] { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
            var dailyActivity = new List<object>();

            for (int i = 0; i < 7; i++)
            {
                var dayName = days[i];
                var countWeekday = 0;
                var countWeekend = 0;
                var countPeak = 0;

                foreach (var order in orders)
                {
                    if (order.Status == "Pending") continue;

                    DateTime date = order.DateCompleted ?? order.LastUpdated;
                    if ((int)date.DayOfWeek == i)
                    {
                        bool isWeekend = date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday;
                        bool isPeak = date.Hour >= 16 || date.Hour <= 8;

                        if (isWeekend) countWeekend++;
                        else countWeekday++;
                        
                        if (isPeak) countPeak++;
                    }
                }

                dailyActivity.Add(new
                {
                    day = dayName,
                    weekdayCount = countWeekday,
                    weekendCount = countWeekend,
                    peakCount = countPeak
                });
            }

            // Align Sunday to the end of the weekly list for front-end graph rendering
            var sunday = dailyActivity[0];
            dailyActivity.RemoveAt(0);
            dailyActivity.Add(sunday);

            return Ok(new
            {
                totalCount,
                successRate,
                failedCount,
                potSubmittedCount,
                averageDeliveryTimeHours,
                dailyActivity
            });
        }
    }
}
