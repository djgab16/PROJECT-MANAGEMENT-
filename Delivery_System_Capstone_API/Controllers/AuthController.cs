using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SPXDeliveryAPI.Services;
using System.Security.Claims;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        public class LoginRequest
        {
            public string EmployeeId { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var ipAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
                var result = await _authService.LoginAsync(request.EmployeeId, request.Password, ipAddress);
                if (result == null)
                {
                    return Unauthorized(new { message = "Invalid credentials or account is locked." });
                }

                return Ok(new { token = result.AccessToken, refreshToken = result.RefreshToken });
            }
            catch (Exception ex)
            {
                if (ex.Message == "Account locked due to multiple failed attempts.")
                {
                    return StatusCode(423, new { message = ex.Message }); // 423 Locked
                }
                return Unauthorized(new { message = "Invalid credentials." });
            }
        }

        public class RefreshRequest
        {
            public string RefreshToken { get; set; } = string.Empty;
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
        {
            if (string.IsNullOrEmpty(request.RefreshToken))
            {
                return BadRequest(new { message = "Refresh token is required." });
            }

            var ipAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var result = await _authService.RefreshTokenAsync(request.RefreshToken, ipAddress);
            if (result == null)
            {
                return Unauthorized(new { message = "Invalid or expired refresh token." });
            }

            return Ok(new { accessToken = result.AccessToken, refreshToken = result.RefreshToken });
        }

        public class RevokeTokenRequest
        {
            public string RefreshToken { get; set; } = string.Empty;
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RevokeTokenRequest request)
        {
            var ipAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var token = request.RefreshToken;

            if (string.IsNullOrEmpty(token))
            {
                return BadRequest(new { message = "Token is required." });
            }

            var result = await _authService.RevokeTokenAsync(token, ipAddress);
            if (!result)
            {
                return NotFound(new { message = "Token not found or already inactive." });
            }

            return Ok(new { message = "Token revoked successfully." });
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var employeeId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(employeeId)) return Unauthorized();

            var profile = await _authService.GetProfileAsync(employeeId);
            if (profile == null) return NotFound();

            // Return safe profile data (excluding password hash)
            return Ok(new
            {
                profile.Id,
                profile.EmployeeId,
                profile.Name,
                profile.Role,
                profile.SystemAccess,
                profile.Status,
                profile.Initials,
                profile.Color
            });
        }
    }
}
