using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public class DeliveryOrderService : IDeliveryOrderService
    {
        private readonly AppDbContext _context;

        public DeliveryOrderService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<DeliveryOrder>> GetAllOrdersAsync()
        {
            return await _context.DeliveryOrders.Include(o => o.Driver).ToListAsync();
        }

        public async Task<DeliveryOrder?> GetOrderByIdAsync(int id)
        {
            return await _context.DeliveryOrders.Include(o => o.Driver).FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<DeliveryOrder> CreateOrderAsync(DeliveryOrder order)
        {
            // Auto-generate waybill: SPX-YYYY-XXXX (where XXXX is a unique daily sequential number or random)
            // For simplicity in this demo, use a random 4 digit string, or a sequential logic based on year
            var year = DateTime.UtcNow.Year;
            var count = await _context.DeliveryOrders.CountAsync(o => o.WaybillNo.StartsWith($"SPX-{year}")) + 1;
            order.WaybillNo = $"SPX-{year}-{count:D4}";

            order.Status = "Pending";
            order.PotStatus = "Not Submitted";
            order.PodStatus = "Not Submitted";
            order.DateEncoded = DateTime.UtcNow.ToString("O");
            order.LastUpdated = DateTime.UtcNow.ToString("O");

            await _context.DeliveryOrders.AddAsync(order);
            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<DeliveryOrder?> UpdateOrderAsync(int id, DeliveryOrder updatedOrder)
        {
            var order = await _context.DeliveryOrders.FindAsync(id);
            if (order == null) return null;

            // Update all modifiable fields according to Sprint 2 PB-008
            order.Status = updatedOrder.Status;
            order.ClientName = updatedOrder.ClientName;
            order.ClientType = updatedOrder.ClientType;
            order.ContactNumber = updatedOrder.ContactNumber;
            order.SenderAddress = updatedOrder.SenderAddress;
            order.RecipientName = updatedOrder.RecipientName;
            order.RecipientContact = updatedOrder.RecipientContact;
            order.RecipientAddress = updatedOrder.RecipientAddress;
            order.Area = updatedOrder.Area;
            order.Landmark = updatedOrder.Landmark;
            order.Route = updatedOrder.Route;
            order.TaskType = updatedOrder.TaskType;
            order.PackageType = updatedOrder.PackageType;
            order.PackageDescription = updatedOrder.PackageDescription;
            order.ItemCount = updatedOrder.ItemCount;
            order.Weight = updatedOrder.Weight;
            order.DeclaredValue = updatedOrder.DeclaredValue;
            order.Priority = updatedOrder.Priority;
            order.SpecialInstructions = updatedOrder.SpecialInstructions;
            order.ExpectedDelivery = updatedOrder.ExpectedDelivery;
            order.DriverId = updatedOrder.DriverId;

            // GPS
            if (updatedOrder.LiveLatitude.HasValue) order.LiveLatitude = updatedOrder.LiveLatitude;
            if (updatedOrder.LiveLongitude.HasValue) order.LiveLongitude = updatedOrder.LiveLongitude;
            if (!string.IsNullOrEmpty(updatedOrder.LastLiveUpdate)) order.LastLiveUpdate = updatedOrder.LastLiveUpdate;

            // POD / POT Updates
            if (!string.IsNullOrEmpty(updatedOrder.PotImage))
            {
                order.PotImage = updatedOrder.PotImage;
                order.PotStatus = "Submitted";
            }
            
            if (!string.IsNullOrEmpty(updatedOrder.PodImage))
            {
                order.PodImage = updatedOrder.PodImage;
                order.PodStatus = "Submitted";
                // Sprint 3 PB-021: Automatically mark delivery as 'Completed' after POD
                order.Status = "Completed";
                order.DateCompleted = DateTime.UtcNow.ToString("O");
            }

            // Failure handling
            if (!string.IsNullOrEmpty(updatedOrder.FailureReason))
            {
                order.FailureReason = updatedOrder.FailureReason;
                order.FailureRemarks = updatedOrder.FailureRemarks;
                order.Status = "Failed";
            }

            // Redelivery handling
            if (!string.IsNullOrEmpty(updatedOrder.RedeliveryScheduledDate))
            {
                order.RedeliveryScheduledDate = updatedOrder.RedeliveryScheduledDate;
                order.RedeliveryRemarks = updatedOrder.RedeliveryRemarks;
                order.RedeliveryAttemptCount = updatedOrder.RedeliveryAttemptCount;
                order.RedeliveryDriverId = updatedOrder.RedeliveryDriverId;
                order.Status = "Pending"; // Resets status
            }

            order.LastUpdated = DateTime.UtcNow.ToString("O");
            order.UpdatedBy = updatedOrder.UpdatedBy;

            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<bool> DeleteOrderAsync(int id)
        {
            var order = await _context.DeliveryOrders.FindAsync(id);
            if (order == null) return false;

            // Sprint 2 PB-009: Cancel delivery order instead of hard delete, unless required
            order.Status = "Cancelled";
            order.LastUpdated = DateTime.UtcNow.ToString("O");

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
