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
                var token = await _authService.LoginAsync(request.EmployeeId, request.Password);
                if (token == null)
                {
                    return Unauthorized(new { message = "Invalid credentials or account is locked." });
                }

                return Ok(new { token });
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
