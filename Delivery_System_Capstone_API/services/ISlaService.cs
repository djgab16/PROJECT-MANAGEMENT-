using System;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public interface ISlaService
    {
        DateTime ParseDate(string? dateStr, DateTime defaultDate);
        int GetSlaHours(string? priority);
        bool IsSlaBreached(DeliveryOrder order);
        double GetRemainingSlaHours(DeliveryOrder order);
        double GetRemainingSlaPercentage(DeliveryOrder order);
        string FormatDuration(TimeSpan timeSpan);
    }
}
