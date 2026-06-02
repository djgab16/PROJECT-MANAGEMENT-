using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;

        public AuthService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<string?> LoginAsync(string employeeId, string password)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            if (employee == null) return null;

            // In real app we verify using BCrypt, here we return a stub token if valid
            bool isValid = BCrypt.Net.BCrypt.Verify(password, employee.PasswordHash);
            if (!isValid) return null;

            return "stub-jwt-token-for-dev";
        }

        public async Task<Employee?> GetProfileAsync(string employeeId)
        {
            return await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
        }
    }
}
