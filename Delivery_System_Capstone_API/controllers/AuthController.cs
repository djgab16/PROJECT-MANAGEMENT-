using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using SPXDeliveryAPI.DTOs.Auth;
using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService, ILogger<AuthController> logger) : ControllerBase
{
    // ─── POST /api/auth/login ──────────────────────────────────────────────────
    /// <summary>Login with Employee ID and password. Returns JWT access token + refresh token.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(AuthErrorResponse), StatusCodes.Status423Locked)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var ip       = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var response = await authService.LoginAsync(request, ip);
            return Ok(response);
        }
        catch (InvalidOperationException ex) when (ex.Message == "ACCOUNT_LOCKED")
        {
            return StatusCode(423, new AuthErrorResponse
            {
                Message = "Your account has been locked due to too many failed login attempts.",
                Reason  = "ACCOUNT_LOCKED"
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(423, new AuthErrorResponse
            {
                Message = ex.Message,
                Reason  = "ACCOUNT_PENDING"
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new AuthErrorResponse { Message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during login for {EmployeeId}", request.EmployeeId);
            return StatusCode(500, new AuthErrorResponse { Message = "An unexpected error occurred." });
        }
    }

    // ─── POST /api/auth/refresh ────────────────────────────────────────────────
    /// <summary>Exchange a valid refresh token for a new access token + refresh token pair.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var ip       = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var response = await authService.RefreshTokenAsync(request.RefreshToken, ip);
            return Ok(response);
        }
        catch (InvalidOperationException ex) when (ex.Message == "ACCOUNT_LOCKED")
        {
            return StatusCode(423, new AuthErrorResponse
            {
                Message = "Account is locked.",
                Reason  = "ACCOUNT_LOCKED"
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new AuthErrorResponse { Message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during token refresh.");
            return StatusCode(500, new AuthErrorResponse { Message = "An unexpected error occurred." });
        }
    }

    // ─── POST /api/auth/logout ─────────────────────────────────────────────────
    /// <summary>Revokes the current refresh token. Always returns 200 for security.</summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request)
    {
        try
        {
            await authService.LogoutAsync(request.RefreshToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Error during logout (swallowed).");
        }

        return Ok(new { message = "Logged out successfully." });
    }

    // ─── GET /api/auth/me ──────────────────────────────────────────────────────
    /// <summary>Returns the current logged-in employee's info from the JWT claims.</summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(EmployeeInfoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IActionResult Me()
    {
        var employeeId   = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        var name         = User.FindFirst(ClaimTypes.Name)?.Value;
        var role         = User.FindFirst(ClaimTypes.Role)?.Value;
        var systemAccess = User.FindFirst("systemAccess")?.Value ?? string.Empty;
        var status       = User.FindFirst("status")?.Value ?? string.Empty;

        if (employeeId is null)
            return Unauthorized();

        return Ok(new EmployeeInfoResponse
        {
            EmployeeId   = employeeId,
            Name         = name ?? string.Empty,
            Role         = role ?? string.Empty,
            SystemAccess = systemAccess,
            Status       = status
        });
    }
}
