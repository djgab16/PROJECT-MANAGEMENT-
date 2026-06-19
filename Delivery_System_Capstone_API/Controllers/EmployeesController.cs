using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EmployeesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var employees = await _context.Employees
                .Select(e => new
                {
                    e.Id,
                    e.EmployeeId,
                    e.Name,
                    e.Role,
                    e.SystemAccess,
                    e.Status,
                    e.Initials,
                    e.Color
                })
                .ToListAsync();

            return Ok(employees);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EmployeeInputModel input)
        {
            if (string.IsNullOrWhiteSpace(input.EmployeeId) || string.IsNullOrWhiteSpace(input.Name))
            {
                return BadRequest(new { message = "Employee ID and Name are required." });
            }

            if (await _context.Employees.AnyAsync(e => e.EmployeeId == input.EmployeeId))
            {
                return BadRequest(new { message = "Employee ID already exists." });
            }

            // Generate initials
            string initials = "";
            var parts = input.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
            {
                initials = (parts[0][0].ToString() + parts[^1][0].ToString()).ToUpper();
            }
            else if (parts.Length == 1)
            {
                initials = parts[0].Substring(0, Math.Min(2, parts[0].Length)).ToUpper();
            }

            // Assign color tag
            var colors = new[] { "#FFB547", "#01B574", "#00A99D", "#4318FF", "#868CFF", "#FF708B", "#FFA800" };
            var random = new Random();
            string color = colors[random.Next(colors.Length)];

            var newEmployee = new SPXDeliveryAPI.Models.Employee
            {
                EmployeeId = input.EmployeeId,
                Name = input.Name,
                Role = input.Role,
                SystemAccess = input.SystemAccess,
                Status = input.Status,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"), // Default password hashed
                Initials = initials,
                Color = color
            };

            await _context.Employees.AddAsync(newEmployee);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { id = newEmployee.Id }, new
            {
                newEmployee.Id,
                newEmployee.EmployeeId,
                newEmployee.Name,
                newEmployee.Role,
                newEmployee.SystemAccess,
                newEmployee.Status,
                newEmployee.Initials,
                newEmployee.Color
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] EmployeeInputModel input)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null)
            {
                return NotFound(new { message = "Employee not found." });
            }

            if (string.IsNullOrWhiteSpace(input.Name))
            {
                return BadRequest(new { message = "Name is required." });
            }

            employee.Name = input.Name;
            employee.Role = input.Role;
            employee.SystemAccess = input.SystemAccess;
            employee.Status = input.Status;

            // Re-generate initials if name changed
            string initials = "";
            var parts = input.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
            {
                initials = (parts[0][0].ToString() + parts[^1][0].ToString()).ToUpper();
            }
            else if (parts.Length == 1)
            {
                initials = parts[0].Substring(0, Math.Min(2, parts[0].Length)).ToUpper();
            }
            employee.Initials = initials;

            _context.Employees.Update(employee);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                employee.Id,
                employee.EmployeeId,
                employee.Name,
                employee.Role,
                employee.SystemAccess,
                employee.Status,
                employee.Initials,
                employee.Color
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null)
            {
                return NotFound(new { message = "Employee not found." });
            }

            // Prevent deleting last admin if applicable, but keep general restriction simple
            if (employee.Role == "ADMIN" && await _context.Employees.CountAsync(e => e.Role == "ADMIN") <= 1)
            {
                return BadRequest(new { message = "Cannot delete the last remaining Admin." });
            }

            // Set references in delivery orders to null to avoid constraint violations
            var orders = await _context.DeliveryOrders.Where(o => o.DriverId == id).ToListAsync();
            foreach (var order in orders)
            {
                order.DriverId = null;
            }

            var redeliveryOrders = await _context.DeliveryOrders.Where(o => o.RedeliveryDriverId == id).ToListAsync();
            foreach (var order in redeliveryOrders)
            {
                order.RedeliveryDriverId = null;
            }

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Employee removed successfully." });
        }
    }

    public class EmployeeInputModel
    {
        public string EmployeeId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string SystemAccess { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
    }
}
