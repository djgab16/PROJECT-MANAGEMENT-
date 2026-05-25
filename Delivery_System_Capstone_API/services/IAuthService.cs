using SPXDeliveryAPI.DTOs.Auth;

namespace SPXDeliveryAPI.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, string ipAddress);
    Task<LoginResponse> RefreshTokenAsync(string refreshToken, string ipAddress);
    Task LogoutAsync(string refreshToken);
}
