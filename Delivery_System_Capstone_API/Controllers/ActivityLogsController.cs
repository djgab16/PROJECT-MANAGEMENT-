using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/activity-logs")]
    [ApiController]
    [Authorize]
    public class ActivityLogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ActivityLogsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var logs = await _context.ActivityLogs
                .OrderByDescending(l => l.Id)
                .ToListAsync();
            return Ok(logs);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ActivityLog log)
        {
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var userName = User.Identity?.Name;
            var employeeId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            log.UserName = userName ?? "Unknown User";
            log.UserRole = userRole ?? "DRIVER";

            // Find current employee initials and color
            var initials = "TD";
            var color = "#00A99D";

            if (!string.IsNullOrEmpty(employeeId))
            {
                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
                if (employee != null)
                {
                    initials = employee.Initials;
                    color = employee.Color;
                }
            }

            log.UserInitials = initials;
            log.UserColor = color;

            if (log.Timestamp == default)
            {
                log.Timestamp = DateTime.UtcNow;
            }

            await _context.ActivityLogs.AddAsync(log);
            await _context.SaveChangesAsync();

            return Ok(log);
        }
    }
}
