using System.Threading.Tasks;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public interface IPredictionService
    {
        Task<PredictionResultDto> ComputePredictionAsync(DeliveryOrder order);
        Task<int> RunPredictionsAsync();
    }
}
