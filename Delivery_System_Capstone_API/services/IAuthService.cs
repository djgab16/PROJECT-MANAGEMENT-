using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public interface IAuthService
    {
        Task<string?> LoginAsync(string employeeId, string password);
        Task<Employee?> GetProfileAsync(string employeeId);
    }
}
