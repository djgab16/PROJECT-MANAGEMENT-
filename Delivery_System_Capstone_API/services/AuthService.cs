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

        public async Task<string?> LoginAsync(string employeeId, string password)
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
            return GenerateJwtToken(employee);
        }

        public async Task<Employee?> GetProfileAsync(string employeeId)
        {
            return await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
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
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
