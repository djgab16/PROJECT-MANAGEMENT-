using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/[controller]")]
    [Route("api/employees")]
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
    }
}
