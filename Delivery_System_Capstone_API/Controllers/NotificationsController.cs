using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NotificationsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var employeeId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var query = _context.Notifications.AsQueryable();

            if (userRole == "DRIVER")
            {
                var driverWaybills = await _context.DeliveryOrders
                    .Where(o => o.Driver != null && o.Driver.EmployeeId == employeeId)
                    .Select(o => o.WaybillNo)
                    .ToListAsync();

                query = query.Where(n => (n.WaybillNo != null && driverWaybills.Contains(n.WaybillNo)) || n.WaybillNo == null);
            }

            var notifications = await query
                .OrderByDescending(n => n.Id)
                .ToListAsync();
            return Ok(notifications);
        }

        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null) return NotFound(new { message = "Notification not found." });

            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var employeeId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (userRole == "DRIVER" && !string.IsNullOrEmpty(notification.WaybillNo))
            {
                var isAssigned = await _context.DeliveryOrders
                    .AnyAsync(o => o.WaybillNo == notification.WaybillNo && o.Driver != null && o.Driver.EmployeeId == employeeId);
                if (!isAssigned)
                {
                    return Forbid();
                }
            }

            notification.Read = true;
            await _context.SaveChangesAsync();
            return Ok(notification);
        }

        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var employeeId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            List<Notification> notifications;
            if (userRole == "DRIVER")
            {
                var driverWaybills = await _context.DeliveryOrders
                    .Where(o => o.Driver != null && o.Driver.EmployeeId == employeeId)
                    .Select(o => o.WaybillNo)
                    .ToListAsync();

                notifications = await _context.Notifications
                    .Where(n => !n.Read && ((n.WaybillNo != null && driverWaybills.Contains(n.WaybillNo)) || n.WaybillNo == null))
                    .ToListAsync();
            }
            else
            {
                notifications = await _context.Notifications.Where(n => !n.Read).ToListAsync();
            }

            foreach (var n in notifications)
            {
                n.Read = true;
            }
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "OpTeamAndAbove")]
        public async Task<IActionResult> Delete(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null) return NotFound(new { message = "Notification not found." });

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete]
        [Authorize(Policy = "OpTeamAndAbove")]
        public async Task<IActionResult> ClearAll()
        {
            var all = await _context.Notifications.ToListAsync();
            _context.Notifications.RemoveRange(all);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
