using System;
using System.Globalization;
using Microsoft.Extensions.Configuration;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public class SlaService : ISlaService
    {
        private readonly IConfiguration _configuration;

        public SlaService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public DateTime ParseDate(string? dateStr, DateTime defaultDate)
        {
            if (string.IsNullOrWhiteSpace(dateStr))
            {
                return defaultDate;
            }

            var cleanStr = dateStr.Trim();

            // Try standard parse
            if (DateTime.TryParse(cleanStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                return parsed.ToUniversalTime();
            }

            // Fallback formats from SafeDateTimeConverter
            string[] formats = new[]
            {
                "yyyy-MM-ddTHH:mm:ss.fffZ",
                "yyyy-MM-ddTHH:mm:ss.ffffffZ",
                "yyyy-MM-ddTHH:mm:ssZ",
                "yyyy-MM-ddTHH:mm:ss.fffzzz",
                "yyyy-MM-ddTHH:mm:ss",
                "yyyy-MM-dd",
                "MMMM dd, yyyy",
                "M/d/yyyy, h:mm:ss tt",
                "MM/dd/yyyy, hh:mm:ss tt",
                "M/d/yyyy h:mm:ss tt",
                "MM/dd/yyyy hh:mm:ss tt"
            };

            foreach (var format in formats)
            {
                if (DateTime.TryParseExact(cleanStr, format, CultureInfo.InvariantCulture, 
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var exactParsed))
                {
                    return exactParsed.ToUniversalTime();
                }
            }

            return defaultDate;
        }

        public int GetSlaHours(string? priority)
        {
            if (string.IsNullOrWhiteSpace(priority))
            {
                return GetConfiguredThreshold("Default", 48);
            }

            var cleanPriority = priority.Trim();
            return cleanPriority.ToLowerInvariant() switch
            {
                "high" => GetConfiguredThreshold("High", 24),
                "medium" => GetConfiguredThreshold("Medium", 48),
                "low" => GetConfiguredThreshold("Low", 72),
                _ => GetConfiguredThreshold("Default", 48)
            };
        }

        private int GetConfiguredThreshold(string key, int defaultValue)
        {
            var configVal = _configuration[$"SlaThresholds:{key}"];
            if (int.TryParse(configVal, out var result))
            {
                return result;
            }
            return defaultValue;
        }

        public bool IsSlaBreached(DeliveryOrder order)
        {
            if (order.Status == "Failed" || order.Status == "Returned")
            {
                return true;
            }

            if (order.DateCompleted.HasValue)
            {
                return order.DateCompleted.Value > order.ExpectedDelivery;
            }

            if (order.Status != "Cancelled" && DateTime.UtcNow > order.ExpectedDelivery)
            {
                return true;
            }

            return false;
        }

        public double GetRemainingSlaHours(DeliveryOrder order)
        {
            if (order.DateCompleted.HasValue)
            {
                return (order.ExpectedDelivery - order.DateCompleted.Value).TotalHours;
            }
            return (order.ExpectedDelivery - DateTime.UtcNow).TotalHours;
        }

        public double GetRemainingSlaPercentage(DeliveryOrder order)
        {
            var remainingHours = GetRemainingSlaHours(order);
            var totalDuration = order.ExpectedDelivery - order.OrderDate;
            var totalHours = totalDuration.TotalHours;

            if (totalHours <= 0)
            {
                totalHours = GetSlaHours(order.Priority);
            }

            return (remainingHours / totalHours) * 100.0;
        }

        public string FormatDuration(TimeSpan timeSpan)
        {
            if (timeSpan <= TimeSpan.Zero)
            {
                var abs = timeSpan.Duration();
                if (abs.TotalDays >= 1) 
                    return $"Breached by {(int)abs.TotalDays}d {abs.Hours}h";
                if (abs.TotalHours >= 1) 
                    return $"Breached by {(int)abs.TotalHours}h {abs.Minutes}m";
                return $"Breached by {abs.Minutes}m";
            }
            else
            {
                if (timeSpan.TotalDays >= 1)
                    return $"{(int)timeSpan.TotalDays}d {timeSpan.Hours}h";
                if (timeSpan.TotalHours >= 1)
                    return $"{(int)timeSpan.TotalHours}h {timeSpan.Minutes}m";
                return $"{timeSpan.Minutes}m";
            }
        }
    }
}
