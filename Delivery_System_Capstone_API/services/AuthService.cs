using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SPXDeliveryAPI.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<LoginResult?> LoginAsync(string employeeId, string password, string ipAddress)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            if (employee == null) return null;

            // Check if account is locked
            if (employee.Status == "Locked")
            {
                if (employee.LockoutEnd.HasValue && employee.LockoutEnd.Value > DateTime.UtcNow)
                {
                    throw new Exception("Account locked due to multiple failed attempts.");
                }
                else if (employee.LockoutEnd.HasValue && employee.LockoutEnd.Value <= DateTime.UtcNow)
                {
                    // Lockout expired, unlock the account
                    employee.Status = "Active";
                    employee.FailedAttempts = 0;
                    employee.LockoutEnd = null;
                    await _context.SaveChangesAsync();
                }
            }

            bool isValid = BCrypt.Net.BCrypt.Verify(password, employee.PasswordHash);
            
            if (!isValid)
            {
                employee.FailedAttempts++;
                if (employee.FailedAttempts >= 3)
                {
                    employee.Status = "Locked";
                    employee.LockoutEnd = DateTime.UtcNow.AddMinutes(15); // Lock for 15 minutes
                    await _context.SaveChangesAsync();
                    throw new Exception("Account locked due to multiple failed attempts.");
                }
                await _context.SaveChangesAsync();
                return null;
            }

            // Successful login, reset failed attempts
            employee.FailedAttempts = 0;
            employee.Status = "Active";
            employee.LockoutEnd = null;
            await _context.SaveChangesAsync();

            // Generate JWT Token
            var accessToken = GenerateJwtToken(employee);

            // Generate Refresh Token
            var refreshToken = new RefreshToken
            {
                Token = GenerateRefreshToken(),
                Expires = DateTime.UtcNow.AddDays(7),
                Created = DateTime.UtcNow,
                CreatedByIp = ipAddress,
                EmployeeId = employee.Id
            };

            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();

            return new LoginResult
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken.Token
            };
        }

        public async Task<Employee?> GetProfileAsync(string employeeId)
        {
            return await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
        }

        public async Task<LoginResult?> RefreshTokenAsync(string token, string ipAddress)
        {
            var refreshToken = await _context.RefreshTokens
                .Include(t => t.Employee)
                .FirstOrDefaultAsync(t => t.Token == token);

            if (refreshToken == null || !refreshToken.IsActive)
            {
                return null; // Token not found or already inactive (expired/revoked)
            }

            // Token Rotation: Revoke old refresh token and replace it with a new one
            var newRefreshToken = new RefreshToken
            {
                Token = GenerateRefreshToken(),
                Expires = DateTime.UtcNow.AddDays(7),
                Created = DateTime.UtcNow,
                CreatedByIp = ipAddress,
                EmployeeId = refreshToken.EmployeeId
            };

            refreshToken.Revoked = DateTime.UtcNow;
            refreshToken.RevokedByIp = ipAddress;
            refreshToken.ReplacedByToken = newRefreshToken.Token;

            await _context.RefreshTokens.AddAsync(newRefreshToken);
            await _context.SaveChangesAsync();

            // Generate new Access Token
            var accessToken = GenerateJwtToken(refreshToken.Employee);

            return new LoginResult
            {
                AccessToken = accessToken,
                RefreshToken = newRefreshToken.Token
            };
        }

        public async Task<bool> RevokeTokenAsync(string token, string ipAddress)
        {
            var refreshToken = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.Token == token);
            if (refreshToken == null || !refreshToken.IsActive)
            {
                return false;
            }

            refreshToken.Revoked = DateTime.UtcNow;
            refreshToken.RevokedByIp = ipAddress;

            await _context.SaveChangesAsync();
            return true;
        }

        private string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        private string GenerateJwtToken(Employee employee)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, employee.EmployeeId),
                new Claim(ClaimTypes.Name, employee.Name),
                new Claim(ClaimTypes.Role, employee.Role)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(15), // Short access token lifespan
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
