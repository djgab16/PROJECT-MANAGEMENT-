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
            return await _context.DeliveryOrders.ToListAsync();
        }

        public async Task<DeliveryOrder?> GetOrderByIdAsync(int id)
        {
            return await _context.DeliveryOrders.FindAsync(id);
        }

        public async Task<DeliveryOrder> CreateOrderAsync(DeliveryOrder order)
        {
            await _context.DeliveryOrders.AddAsync(order);
            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<DeliveryOrder?> UpdateOrderAsync(int id, DeliveryOrder updatedOrder)
        {
            var order = await _context.DeliveryOrders.FindAsync(id);
            if (order == null) return null;

            // Simple map
            order.Status = updatedOrder.Status;
            order.LastUpdated = updatedOrder.LastUpdated;
            order.UpdatedBy = updatedOrder.UpdatedBy;

            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<bool> DeleteOrderAsync(int id)
        {
            var order = await _context.DeliveryOrders.FindAsync(id);
            if (order == null) return false;

            _context.DeliveryOrders.Remove(order);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
