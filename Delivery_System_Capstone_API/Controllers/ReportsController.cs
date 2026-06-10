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
    [Route("api/reports")]
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
            var orders = await _context.DeliveryOrders.ToListAsync();

            var totalCount = orders.Count;
            var completedCount = orders.Count(o => o.Status == "Completed" || o.Status == "Delivered" || o.Status == "Picked Up");
            var failedCount = orders.Count(o => o.Status == "Failed");
            var successRate = totalCount > 0 ? $"{(int)Math.Round((double)completedCount / totalCount * 100)}%" : "0%";
            var potSubmittedCount = orders.Count(o => o.PotStatus == "Submitted");

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

                    var dateStr = order.DateCompleted ?? order.LastUpdated ?? order.OrderDate;
                    if (DateTime.TryParse(dateStr, out var date))
                    {
                        if ((int)date.DayOfWeek == i)
                        {
                            bool isWeekend = date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday;
                            bool isPeak = date.Hour >= 16 || date.Hour <= 8;

                            if (isWeekend) countWeekend++;
                            else countWeekday++;
                            
                            if (isPeak) countPeak++;
                        }
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
                averageDeliveryTimeHours = 3.5,
                dailyActivity
            });
        }
    }
}
