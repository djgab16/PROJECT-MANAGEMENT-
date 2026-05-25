using System.ComponentModel.DataAnnotations;

namespace SPXDeliveryAPI.DTOs.Auth;

// ─── Request DTOs ──────────────────────────────────────────────────────────────

public class LoginRequest
{
    [Required(ErrorMessage = "Employee ID is required.")]
    public string EmployeeId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

// ─── Response DTOs ─────────────────────────────────────────────────────────────

public class LoginResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public EmployeeInfoResponse Employee { get; set; } = null!;
}

public class EmployeeInfoResponse
{
    public string EmployeeId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string SystemAccess { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class AuthErrorResponse
{
    public string Message { get; set; } = string.Empty;
    public string? Reason { get; set; }
}
