using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using SPXDeliveryAPI.Services;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/predictions")]
    [ApiController]
    [Authorize(Policy = "OpTeamAndAbove")]
    public class PredictionsController : ControllerBase
    {
        private readonly IPredictionService _predictionService;
        private readonly ISlaService _slaService;
        private readonly AppDbContext _context;

        public PredictionsController(
            IPredictionService predictionService,
            ISlaService slaService,
            AppDbContext context)
        {
            _predictionService = predictionService;
            _slaService = slaService;
            _context = context;
        }

        [HttpPost("run")]
        public async Task<IActionResult> RunPredictions()
        {
            var stopwatch = Stopwatch.StartNew();

            int processedCount = await _predictionService.RunPredictionsAsync();

            stopwatch.Stop();
            var durationMs = stopwatch.ElapsedMilliseconds;

            var username = User.Identity?.Name ?? "Operations Team";
            var employeeId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            var initials = employee?.Initials ?? "OP";
            var color = employee?.Color ?? "#3b82f6";
            var role = employee?.Role ?? "OP. TEAM";

            var activityLog = new ActivityLog
            {
                Timestamp = DateTime.UtcNow,
                UserName = username,
                UserRole = role,
                UserInitials = initials,
                UserColor = color,
                Action = "Prediction",
                Description = $"Recomputed at-risk SLA predictions. Processed {processedCount} active orders in {durationMs}ms.",
                Reference = $"Run-{DateTime.UtcNow:yyyyMMddHHmmss}"
            };

            await _context.ActivityLogs.AddAsync(activityLog);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Predictions recomputed successfully.",
                ordersProcessed = processedCount,
                durationMs = durationMs
            });
        }

        [HttpGet("at-risk")]
        public async Task<IActionResult> GetAtRiskOrders()
        {
            var now = DateTime.UtcNow;

            var atRiskOrders = await _context.DeliveryPredictions
                .Include(p => p.DeliveryOrder)
                .ThenInclude(o => o!.Driver)
                .Where(p => !p.DeliveryOrder!.IsArchived 
                         && p.DeliveryOrder.Status != "Delivered" 
                         && p.DeliveryOrder.Status != "Completed" 
                         && p.DeliveryOrder.Status != "Failed" 
                         && p.DeliveryOrder.Status != "Returned")
                .AsNoTracking()
                .Select(p => new AtRiskOrderDto
                {
                    Id = p.Id,
                    DeliveryOrderId = p.DeliveryOrderId,
                    WaybillNo = p.DeliveryOrder!.WaybillNo,
                    ClientName = p.DeliveryOrder.ClientName,
                    ClientType = p.DeliveryOrder.ClientType,
                    Area = p.DeliveryOrder.Area,
                    Route = p.DeliveryOrder.Route,
                    Priority = p.DeliveryOrder.Priority,
                    Status = p.DeliveryOrder.Status,
                    DriverName = p.DeliveryOrder.Driver != null ? p.DeliveryOrder.Driver.Name : "Unassigned",
                    SlaRemainingHours = (p.DeliveryOrder.ExpectedDelivery - now).TotalHours,
                    SlaRemainingPercentage = (p.DeliveryOrder.ExpectedDelivery - now).TotalHours /
                        Math.Max(1.0, (p.DeliveryOrder.ExpectedDelivery - p.DeliveryOrder.OrderDate).TotalHours) * 100.0,
                    TimeUntilBreach = "",
                    RiskLevel = p.RiskLevel,
                    RiskScore = p.RiskScore,
                    ConfidenceScore = p.ConfidenceScore,
                    RiskReason = p.RiskReason,
                    RecommendedAction = p.RecommendedAction,
                    PredictedAt = p.PredictedAt
                })
                .ToListAsync();

            foreach (var order in atRiskOrders)
            {
                var remainingSpan = TimeSpan.FromHours(order.SlaRemainingHours);
                order.TimeUntilBreach = _slaService.FormatDuration(remainingSpan);

                // Predict arrival in days/hours based on risk level
                double predictedHours = order.SlaRemainingHours;
                if (order.RiskLevel == "Critical") predictedHours += 18.5;
                else if (order.RiskLevel == "High") predictedHours += 10.0;
                else if (order.RiskLevel == "Medium") predictedHours += 3.5;
                else predictedHours = Math.Max(0.5, predictedHours - 4.0);

                if (predictedHours <= 0)
                {
                    var absDays = Math.Abs(predictedHours) / 24.0;
                    order.PredictedArrival = absDays >= 1.0 
                        ? $"Delayed by {absDays:F1} days" 
                        : $"Delayed by {Math.Abs(predictedHours):F1} hrs";
                }
                else
                {
                    var days = predictedHours / 24.0;
                    order.PredictedArrival = days >= 1.0 
                        ? $"In {days:F1} days" 
                        : $"In {predictedHours:F1} hrs";
                }
            }

            return Ok(atRiskOrders);
        }

        [HttpGet("completed")]
        public async Task<IActionResult> GetCompletedOrders()
        {
            var now = DateTime.UtcNow;

            var completedOrders = await _context.DeliveryOrders
                .Include(o => o.Driver)
                .Where(o => !o.IsArchived 
                         && (o.Status == "Delivered" 
                          || o.Status == "Completed" 
                          || o.Status == "Failed" 
                          || o.Status == "Returned"))
                .AsNoTracking()
                .OrderByDescending(o => o.DateCompleted ?? o.LastUpdated)
                .Select(o => new AtRiskOrderDto
                {
                    Id = o.Id,
                    DeliveryOrderId = o.Id,
                    WaybillNo = o.WaybillNo,
                    ClientName = o.ClientName,
                    ClientType = o.ClientType,
                    Area = o.Area,
                    Route = o.Route,
                    Priority = o.Priority,
                    Status = o.Status,
                    DriverName = o.Driver != null ? o.Driver.Name : "Unassigned",
                    SlaRemainingHours = o.DateCompleted.HasValue && o.DateCompleted.Value > o.ExpectedDelivery 
                        ? (o.DateCompleted.Value - o.ExpectedDelivery).TotalHours 
                        : 0,
                    SlaRemainingPercentage = 0,
                    TimeUntilBreach = "",
                    RiskLevel = (o.DateCompleted.HasValue && o.DateCompleted.Value > o.ExpectedDelivery) || o.Status == "Failed" || o.Status == "Returned" 
                        ? "High" 
                        : "Low",
                    RiskScore = (o.DateCompleted.HasValue && o.DateCompleted.Value > o.ExpectedDelivery) || o.Status == "Failed" || o.Status == "Returned" 
                        ? 1.0 
                        : 0.0,
                    ConfidenceScore = 1.0,
                    RiskReason = o.FailureReason ?? "",
                    RecommendedAction = o.Status == "Delivered" || o.Status == "Completed" ? "Delivery Successful" : "Delivery Breached / Failed",
                    PredictedAt = o.DateCompleted ?? o.LastUpdated
                })
                .ToListAsync();

            foreach (var order in completedOrders)
            {
                var origOrder = await _context.DeliveryOrders.FindAsync(order.DeliveryOrderId);
                if (origOrder != null && origOrder.DateCompleted.HasValue)
                {
                    var duration = origOrder.DateCompleted.Value - origOrder.OrderDate;
                    var days = duration.TotalHours / 24.0;
                    
                    if (origOrder.Status == "Delivered" || origOrder.Status == "Completed")
                    {
                        order.PredictedArrival = days >= 1.0 
                            ? $"Delivered in {days:F1} days" 
                            : $"Delivered in {duration.TotalHours:F1} hrs";
                    }
                    else if (origOrder.Status == "Failed")
                    {
                        order.PredictedArrival = days >= 1.0 
                            ? $"Failed after {days:F1} days" 
                            : $"Failed after {duration.TotalHours:F1} hrs";
                    }
                    else
                    {
                        order.PredictedArrival = days >= 1.0 
                            ? $"Returned after {days:F1} days" 
                            : $"Returned after {duration.TotalHours:F1} hrs";
                    }
                }
                else
                {
                    order.PredictedArrival = "Completed";
                }
            }

            return Ok(completedOrders);
        }

        [HttpGet("sla-summary")]
        public async Task<IActionResult> GetSlaSummary()
        {
            var now = DateTime.UtcNow;

            var orders = await _context.DeliveryOrders
                .AsNoTracking()
                .ToListAsync();

            var activeOrders = orders.Where(o => 
                !o.IsArchived && 
                o.Status != "Delivered" && 
                o.Status != "Completed" && 
                o.Status != "Failed" && 
                o.Status != "Returned" &&
                o.Status != "Cancelled"
            ).ToList();

            var completedOrders = orders.Where(o => 
                o.Status == "Delivered" || 
                o.Status == "Completed" || 
                o.Status == "Failed" || 
                o.Status == "Returned"
            ).ToList();

            var totalCompleted = completedOrders.Count;
            var completedOnTime = completedOrders.Count(o => 
                o.DateCompleted <= o.ExpectedDelivery && 
                o.Status != "Failed" && 
                o.Status != "Returned"
            );
            var overallOnTimePercentage = totalCompleted > 0 
                ? (double)completedOnTime / totalCompleted * 100.0 
                : 100.0;

            var slaBreachesCount = orders.Count(o =>
                (o.DateCompleted.HasValue && o.DateCompleted.Value > o.ExpectedDelivery) ||
                o.Status == "Failed" ||
                o.Status == "Returned" ||
                (!o.DateCompleted.HasValue && o.ExpectedDelivery < now && o.Status != "Cancelled")
            );

            var atRiskCount = await _context.DeliveryPredictions
                .CountAsync(p => p.IsAtRisk && !p.DeliveryOrder!.IsArchived);

            var breachedOrders = orders.Where(o =>
                (o.DateCompleted.HasValue && o.DateCompleted.Value > o.ExpectedDelivery) ||
                o.Status == "Failed" ||
                o.Status == "Returned" ||
                (!o.DateCompleted.HasValue && o.ExpectedDelivery < now && o.Status != "Cancelled")
            ).ToList();

            double averageDelayHours = 0;
            if (breachedOrders.Any())
            {
                averageDelayHours = breachedOrders.Average(o => {
                    if (o.DateCompleted.HasValue) 
                        return (o.DateCompleted.Value - o.ExpectedDelivery).TotalHours;
                    return (now - o.ExpectedDelivery).TotalHours;
                });
            }

            var completedOnTimeOrLate = completedOrders.Where(o => o.DateCompleted.HasValue).ToList();
            double averageDeliveryDurationHours = 0;
            if (completedOnTimeOrLate.Any())
            {
                averageDeliveryDurationHours = completedOnTimeOrLate.Average(o => 
                    (o.DateCompleted!.Value - o.OrderDate).TotalHours
                );
            }

            var routeBreakdown = completedOrders
                .GroupBy(o => o.Route)
                .Select(g => {
                    var total = g.Count();
                    var breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned");
                    var onTime = total - breached;
                    
                    var breachedList = g.Where(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned").ToList();
                    double avgDelayHours = 0;
                    if (breachedList.Any())
                    {
                        avgDelayHours = breachedList.Average(o => {
                            if (o.DateCompleted.HasValue) return (o.DateCompleted.Value - o.ExpectedDelivery).TotalHours;
                            return (now - o.ExpectedDelivery).TotalHours;
                        });
                    }

                    return new RouteSlaPerformanceDto
                    {
                        Route = string.IsNullOrEmpty(g.Key) ? "Unknown Route" : g.Key,
                        TotalOrders = total,
                        BreachedCount = breached,
                        OnTimePercentage = total > 0 ? (double)onTime / total * 100.0 : 100.0,
                        AverageDelayHours = avgDelayHours
                    };
                })
                .OrderBy(r => r.OnTimePercentage)
                .ToList();

            var priorityBreakdown = completedOrders
                .GroupBy(o => o.Priority)
                .Select(g => {
                    var total = g.Count();
                    var breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned");
                    var onTime = total - breached;
                    return new PrioritySlaPerformanceDto
                    {
                        Priority = string.IsNullOrEmpty(g.Key) ? "Medium" : g.Key,
                        TotalOrders = total,
                        BreachedCount = breached,
                        OnTimePercentage = total > 0 ? (double)onTime / total * 100.0 : 100.0
                    };
                })
                .OrderByDescending(p => p.Priority)
                .ToList();

            var summary = new SlaSummaryDto
            {
                ActiveDeliveriesCount = activeOrders.Count,
                OverallOnTimePercentage = Math.Round(overallOnTimePercentage, 1),
                SlaBreachesCount = slaBreachesCount,
                AtRiskCount = atRiskCount,
                AverageDelayHours = Math.Round(averageDelayHours, 1),
                AverageDeliveryDurationHours = Math.Round(averageDeliveryDurationHours, 1),
                RouteBreakdown = routeBreakdown,
                PriorityBreakdown = priorityBreakdown
            };

            return Ok(summary);
        }

        [HttpGet("driver-performance")]
        public async Task<IActionResult> GetDriverPerformance()
        {
            var now = DateTime.UtcNow;

            var completedOrders = await _context.DeliveryOrders
                .Include(o => o.Driver)
                .Where(o => o.DriverId != null && (o.Status == "Delivered" || o.Status == "Completed" || o.Status == "Failed" || o.Status == "Returned"))
                .AsNoTracking()
                .ToListAsync();

            var driverPerformance = completedOrders
                .GroupBy(o => o.DriverId)
                .Select(g => {
                    var firstOrder = g.First();
                    var driverName = firstOrder.Driver != null ? firstOrder.Driver.Name : "Unknown Driver";
                    var total = g.Count();
                    var breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned");
                    var onTime = total - breached;

                    double averageDelayHours = 0;
                    var breachedList = g.Where(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned").ToList();
                    if (breachedList.Any())
                    {
                        averageDelayHours = breachedList.Average(o => {
                            if (o.DateCompleted.HasValue) return (o.DateCompleted.Value - o.ExpectedDelivery).TotalHours;
                            return (now - o.ExpectedDelivery).TotalHours;
                        });
                    }

                    return new DriverSlaPerformanceDto
                    {
                        DriverName = driverName,
                        OnTimePercentage = total > 0 ? Math.Round((double)onTime / total * 100.0, 1) : 100.0,
                        DeliveriesCount = total,
                        BreachedCount = breached,
                        AverageDelayHours = Math.Round(averageDelayHours, 1)
                    };
                })
                .OrderByDescending(d => d.OnTimePercentage)
                .ToList();

            return Ok(driverPerformance);
        }
    }
}
