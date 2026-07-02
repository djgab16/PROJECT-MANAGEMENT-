using SPXDeliveryAPI.Models;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Services
{
    public class LoginResult
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
    }

    public interface IAuthService
    {
        Task<LoginResult?> LoginAsync(string employeeId, string password, string ipAddress);
        Task<Employee?> GetProfileAsync(string employeeId);
        Task<LoginResult?> RefreshTokenAsync(string token, string ipAddress);
        Task<bool> RevokeTokenAsync(string token, string ipAddress);
    }
}
