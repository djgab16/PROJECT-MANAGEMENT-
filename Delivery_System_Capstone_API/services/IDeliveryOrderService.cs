using SPXDeliveryAPI.DTOs.DeliveryOrders;

namespace SPXDeliveryAPI.Services;

public interface IDeliveryOrderService
{
    Task<DeliveryOrderListResponse> GetAllAsync(DeliveryOrderFilterRequest filter);
    Task<DeliveryOrderResponse> GetByIdAsync(int id);
    Task<DeliveryOrderResponse> GetByWaybillAsync(string waybillNo);
    Task<DeliveryOrderResponse> CreateAsync(CreateDeliveryOrderRequest request, int encodedById);
    Task<DeliveryOrderResponse> UpdateAsync(int id, UpdateDeliveryOrderRequest request, int updatedById);
    Task<DeliveryOrderResponse> UpdateStatusAsync(int id, UpdateStatusRequest request, int updatedById);
    Task<DeliveryOrderResponse> AssignDriverAsync(int id, AssignDriverRequest request, int updatedById);
    Task<DeliveryOrderResponse> UploadPodAsync(int id, IFormFile file, int updatedById);
    Task ArchiveAsync(int id, int updatedById);
    Task RestoreAsync(int id, int updatedById);
    Task DeleteAsync(int id, int deletedById);
    Task<List<DeliveryHistoryResponse>> GetHistoryAsync(int id);
}
