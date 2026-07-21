using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public class PredictionService : IPredictionService
    {
        private readonly AppDbContext _context;
        private readonly ISlaService _slaService;

        public PredictionService(AppDbContext context, ISlaService slaService)
        {
            _context = context;
            _slaService = slaService;
        }

        public async Task<PredictionResultDto> ComputePredictionAsync(DeliveryOrder order)
        {
            // Compute historical profiles for just this order's route, driver, and client
            var driverPerf = await _context.DeliveryOrders
                .Where(o => o.DriverId != null && o.DriverId == order.DriverId && (o.Status == "Delivered" || o.Status == "Completed" || o.Status == "Failed" || o.Status == "Returned"))
                .GroupBy(o => o.DriverId)
                .Select(g => new {
                    DriverId = g.Key!.Value,
                    Total = g.Count(),
                    Breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned")
                })
                .ToDictionaryAsync(x => x.DriverId, x => (x.Total, x.Breached));

            var routePerf = await _context.DeliveryOrders
                .Where(o => !string.IsNullOrEmpty(o.Route) && o.Route == order.Route && (o.Status == "Delivered" || o.Status == "Completed" || o.Status == "Failed" || o.Status == "Returned"))
                .GroupBy(o => o.Route)
                .Select(g => new {
                    Route = g.Key,
                    Total = g.Count(),
                    Breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned")
                })
                .ToDictionaryAsync(x => x.Route, x => (x.Total, x.Breached), StringComparer.OrdinalIgnoreCase);

            var clientPerf = await _context.DeliveryOrders
                .Where(o => !string.IsNullOrEmpty(o.ClientName) && o.ClientName == order.ClientName && (o.Status == "Delivered" || o.Status == "Completed" || o.Status == "Failed" || o.Status == "Returned"))
                .GroupBy(o => o.ClientName)
                .Select(g => new {
                    ClientName = g.Key,
                    Total = g.Count(),
                    Breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned")
                })
                .ToDictionaryAsync(x => x.ClientName, x => (x.Total, x.Breached), StringComparer.OrdinalIgnoreCase);

            return ComputePredictionInternal(order, driverPerf, routePerf, clientPerf);
        }

        public async Task<int> RunPredictionsAsync()
        {
            // 1. Fetch active, non-archived orders
            var activeOrders = await _context.DeliveryOrders
                .Include(o => o.Driver)
                .Where(o => !o.IsArchived 
                         && o.Status != "Delivered" 
                         && o.Status != "Completed" 
                         && o.Status != "Failed" 
                         && o.Status != "Returned"
                         && o.Status != "Cancelled")
                .ToListAsync();

            if (!activeOrders.Any())
            {
                return 0;
            }

            // 2. Fetch historical aggregated profiles once to avoid N+1 queries
            var driverPerf = await _context.DeliveryOrders
                .Where(o => o.DriverId != null && (o.Status == "Delivered" || o.Status == "Completed" || o.Status == "Failed" || o.Status == "Returned"))
                .GroupBy(o => o.DriverId)
                .Select(g => new {
                    DriverId = g.Key!.Value,
                    Total = g.Count(),
                    Breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned")
                })
                .ToDictionaryAsync(x => x.DriverId, x => (x.Total, x.Breached));

            var routePerf = await _context.DeliveryOrders
                .Where(o => !string.IsNullOrEmpty(o.Route) && (o.Status == "Delivered" || o.Status == "Completed" || o.Status == "Failed" || o.Status == "Returned"))
                .GroupBy(o => o.Route)
                .Select(g => new {
                    Route = g.Key,
                    Total = g.Count(),
                    Breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned")
                })
                .ToDictionaryAsync(x => x.Route, x => (x.Total, x.Breached), StringComparer.OrdinalIgnoreCase);

            var clientPerf = await _context.DeliveryOrders
                .Where(o => !string.IsNullOrEmpty(o.ClientName) && (o.Status == "Delivered" || o.Status == "Completed" || o.Status == "Failed" || o.Status == "Returned"))
                .GroupBy(o => o.ClientName)
                .Select(g => new {
                    ClientName = g.Key,
                    Total = g.Count(),
                    Breached = g.Count(o => o.DateCompleted > o.ExpectedDelivery || o.Status == "Failed" || o.Status == "Returned")
                })
                .ToDictionaryAsync(x => x.ClientName, x => (x.Total, x.Breached), StringComparer.OrdinalIgnoreCase);

            // Fetch existing predictions once to avoid N+1 updates
            var existingPredictions = await _context.DeliveryPredictions
                .ToDictionaryAsync(p => p.DeliveryOrderId);

            foreach (var order in activeOrders)
            {
                var result = ComputePredictionInternal(order, driverPerf, routePerf, clientPerf);

                if (existingPredictions.TryGetValue(order.Id, out var existing))
                {
                    existing.RiskScore = result.RiskScore;
                    existing.RiskLevel = result.RiskLevel;
                    existing.ConfidenceScore = result.ConfidenceScore;
                    existing.IsAtRisk = result.IsAtRisk;
                    existing.RiskReason = result.RiskReason;
                    existing.RecommendedAction = result.RecommendedAction;
                    existing.PredictedAt = DateTime.UtcNow;
                    _context.DeliveryPredictions.Update(existing);
                }
                else
                {
                    var newPred = new DeliveryPrediction
                    {
                        DeliveryOrderId = order.Id,
                        RiskScore = result.RiskScore,
                        RiskLevel = result.RiskLevel,
                        ConfidenceScore = result.ConfidenceScore,
                        IsAtRisk = result.IsAtRisk,
                        RiskReason = result.RiskReason,
                        RecommendedAction = result.RecommendedAction,
                        PredictedAt = DateTime.UtcNow
                    };
                    await _context.DeliveryPredictions.AddAsync(newPred);
                }
            }

            await _context.SaveChangesAsync();
            return activeOrders.Count;
        }

        private PredictionResultDto ComputePredictionInternal(
            DeliveryOrder order,
            Dictionary<int, (int Total, int Breached)> driverPerf,
            Dictionary<string, (int Total, int Breached)> routePerf,
            Dictionary<string, (int Total, int Breached)> clientPerf)
        {
            var now = DateTime.UtcNow;
            
            // ─── 1. SLA Remaining Time Factor (Weight: 0.35) ───
            double remainingHours = (order.ExpectedDelivery - now).TotalHours;
            double slaTimeScore = 0.0;
            if (remainingHours <= 0)
            {
                slaTimeScore = 1.0; // Already breached
            }
            else if (remainingHours <= 6)
            {
                slaTimeScore = 0.9;
            }
            else if (remainingHours <= 12)
            {
                slaTimeScore = 0.7;
            }
            else if (remainingHours <= 24)
            {
                slaTimeScore = 0.4;
            }
            else if (remainingHours <= 48)
            {
                slaTimeScore = 0.2;
            }
            else
            {
                slaTimeScore = 0.0;
            }

            // ─── 2. Delivery Priority Factor (Weight: 0.15) ───
            double priorityScore = order.Priority.ToLowerInvariant().Trim() switch
            {
                "high" => 1.0,
                "medium" => 0.5,
                "low" => 0.1,
                _ => 0.3
            };

            // ─── 3. Redelivery Attempts Factor (Weight: 0.15) ───
            double redeliveryScore = 0.0;
            if (order.RedeliveryAttemptCount >= 2)
            {
                redeliveryScore = 1.0;
            }
            else if (order.RedeliveryAttemptCount == 1)
            {
                redeliveryScore = 0.6;
            }

            // ─── 4. Driver Historical Performance Factor (Weight: 0.15) ───
            double driverScore = 0.2; // Default fallback
            double driverBreachRate = 0.0;
            bool hasDriverHistory = false;

            if (order.DriverId.HasValue)
            {
                if (driverPerf.TryGetValue(order.DriverId.Value, out var dp) && dp.Total >= 3)
                {
                    driverBreachRate = (double)dp.Breached / dp.Total;
                    driverScore = driverBreachRate;
                    hasDriverHistory = true;
                }
            }
            else
            {
                driverScore = 0.8; // Unassigned active order represents a high delay risk
            }

            // ─── 5. Route Historical Performance Factor (Weight: 0.10) ───
            double routeScore = 0.2; // Default fallback
            double routeBreachRate = 0.0;
            bool hasRouteHistory = false;

            if (!string.IsNullOrEmpty(order.Route))
            {
                if (routePerf.TryGetValue(order.Route, out var rp) && rp.Total >= 3)
                {
                    routeBreachRate = (double)rp.Breached / rp.Total;
                    routeScore = routeBreachRate;
                    hasRouteHistory = true;
                }
            }

            // ─── 6. Item Count and Package Weight Factor (Weight: 0.05) ───
            double weightKg = 0;
            if (!string.IsNullOrWhiteSpace(order.Weight))
            {
                var cleanWeight = new string(order.Weight.Where(c => char.IsDigit(c) || c == '.').ToArray());
                double.TryParse(cleanWeight, out weightKg);
            }

            double packageScore = 0.0;
            if (weightKg > 15 || order.ItemCount > 8)
            {
                packageScore = 1.0;
            }
            else if (weightKg > 5 || order.ItemCount > 3)
            {
                packageScore = 0.4;
            }

            // ─── 7. Client Type Factor (Weight: 0.03) ───
            double clientScore = order.ClientType.ToLowerInvariant().Trim() switch
            {
                "vip" => 0.7,
                "express" => 0.5,
                "corporate" => 0.3,
                _ => 0.1
            };

            // ─── 8. Placeholders Factor (Weekend/Holiday, Traffic, Weather) (Weight: 0.02) ───
            double weekendFactor = (now.DayOfWeek == DayOfWeek.Saturday || now.DayOfWeek == DayOfWeek.Sunday) ? 0.5 : 0.0;
            double trafficPlaceholder = 0.2; // Simulated traffic risk
            double weatherPlaceholder = 0.1; // Simulated weather risk
            double placeholdersScore = (weekendFactor + trafficPlaceholder + weatherPlaceholder) / 1.5; // normalized

            // ─── Compute Weighted Risk Score ───
            double riskScore = (slaTimeScore * 0.35) + 
                               (priorityScore * 0.15) + 
                               (redeliveryScore * 0.15) + 
                               (driverScore * 0.15) + 
                               (routeScore * 0.10) + 
                               (packageScore * 0.05) + 
                               (clientScore * 0.03) + 
                               (placeholdersScore * 0.02);

            // Clamp risk score to [0.0, 1.0]
            riskScore = Math.Clamp(riskScore, 0.0, 1.0);

            // ─── Determine Risk Level ───
            string riskLevel = "Low";
            if (riskScore >= 0.8)
            {
                riskLevel = "Critical";
            }
            else if (riskScore >= 0.6)
            {
                riskLevel = "High";
            }
            else if (riskScore >= 0.35)
            {
                riskLevel = "Medium";
            }

            // Is At Risk flag (includes Medium, High, and Critical risk levels)
            bool isAtRisk = riskScore >= 0.35 || remainingHours <= 0;

            // ─── Compute Confidence Score (0.0 to 1.0) ───
            // High confidence relies on how much historical profile data we have
            double confidence = 0.60; // Base confidence
            if (hasDriverHistory) confidence += 0.15;
            if (hasRouteHistory) confidence += 0.15;
            if (weightKg > 0) confidence += 0.05;
            if (clientPerf.TryGetValue(order.ClientName, out var cp) && cp.Total >= 3) confidence += 0.05;
            confidence = Math.Clamp(confidence, 0.50, 0.98); // cap below 100% since it's a prediction

            // ─── Compile Risk Reasons ───
            var reasons = new List<string>();
            if (remainingHours <= 0)
            {
                reasons.Add("Expected delivery deadline has passed (Breached).");
            }
            else if (remainingHours <= 12)
            {
                reasons.Add($"SLA deadline is very short ({remainingHours:F1} hours remaining).");
            }

            if (!order.DriverId.HasValue)
            {
                reasons.Add("No driver has been assigned to this active order.");
            }
            else if (hasDriverHistory && driverBreachRate > 0.3)
            {
                reasons.Add($"Assigned driver has a high historical SLA breach rate ({driverBreachRate:P0}).");
            }

            if (hasRouteHistory && routeBreachRate > 0.3)
            {
                reasons.Add($"Delivery route is historically delayed ({routeBreachRate:P0} breach rate).");
            }

            if (order.RedeliveryAttemptCount > 0)
            {
                reasons.Add($"Order has failed delivery {order.RedeliveryAttemptCount} time(s) previously.");
            }

            if (order.Priority.Equals("High", StringComparison.OrdinalIgnoreCase))
            {
                reasons.Add("High priority shipment has a strict SLA window.");
            }

            if (weightKg > 15)
            {
                reasons.Add("Package is heavy (> 15 kg), which may slow down transport.");
            }

            string riskReasonStr = reasons.Any() 
                ? string.Join("\n", reasons.Select(r => $"• {r}")) 
                : "• No severe risk factors identified. On schedule.";

            // ─── Compile Recommended Action ───
            string recommendedAction = "No action required. On schedule.";
            if (remainingHours <= 0)
            {
                recommendedAction = "Escalate order delivery status and contact client with update.";
            }
            else if (!order.DriverId.HasValue)
            {
                recommendedAction = "Assign an experienced driver to this order immediately.";
            }
            else if (hasDriverHistory && driverBreachRate > 0.3)
            {
                recommendedAction = "Consider reassigning order to a driver with a higher SLA on-time rating.";
            }
            else if (order.RedeliveryAttemptCount >= 2)
            {
                recommendedAction = "Contact recipient to confirm availability and address details before next delivery attempt.";
            }
            else if (order.Priority.Equals("High", StringComparison.OrdinalIgnoreCase) && remainingHours <= 6)
            {
                recommendedAction = "Prioritize loading and routing. Send immediate alert to driver.";
            }
            else if (riskScore >= 0.35)
            {
                recommendedAction = "Monitor delivery progress closely. Request location updates from driver.";
            }

            return new PredictionResultDto
            {
                RiskScore = riskScore,
                RiskLevel = riskLevel,
                ConfidenceScore = confidence,
                IsAtRisk = isAtRisk,
                RiskReason = riskReasonStr,
                RecommendedAction = recommendedAction
            };
        }
    }
}
