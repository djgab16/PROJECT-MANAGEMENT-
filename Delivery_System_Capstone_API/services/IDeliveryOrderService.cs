using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public interface IDeliveryOrderService
    {
        Task<IEnumerable<DeliveryOrder>> GetAllOrdersAsync();
        Task<DeliveryOrder?> GetOrderByIdAsync(int id);
        Task<DeliveryOrder> CreateOrderAsync(DeliveryOrder order);
        Task<DeliveryOrder?> UpdateOrderAsync(int id, DeliveryOrder order);
        Task<bool> DeleteOrderAsync(int id);
    }
}
