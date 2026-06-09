using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using SPXDeliveryAPI.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/[controller]")]
    [Route("api/delivery-orders")]
    [Route("api/deliveryorder")]
    [ApiController]
    [Authorize]
    public class DeliveryOrderController : ControllerBase
    {
        private readonly IDeliveryOrderService _service;
        private readonly AppDbContext _context;

        public DeliveryOrderController(IDeliveryOrderService service, AppDbContext context)
        {
            _service = service;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool? isArchived, [FromQuery] string? status, [FromQuery] string? search)
        {
            var query = _context.DeliveryOrders.Include(o => o.Driver).AsQueryable();

            if (isArchived.HasValue)
            {
                query = query.Where(o => o.IsArchived == isArchived.Value);
            }

            if (!string.IsNullOrEmpty(status) && status != "All Status")
            {
                query = query.Where(o => o.Status == status);
            }

            if (!string.IsNullOrEmpty(search))
            {
                var q = search.ToLower().Trim();
                query = query.Where(o => o.WaybillNo.ToLower().Contains(q) 
                                      || o.RecipientName.ToLower().Contains(q) 
                                      || o.ClientName.ToLower().Contains(q));
            }

            var orders = await query.ToListAsync();
            return Ok(orders);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _service.GetOrderByIdAsync(id);
            if (order == null) return NotFound(new { message = "Order not found." });
            return Ok(order);
        }

        [HttpPost]
        [Authorize(Policy = "OpTeamAndAbove")]
        public async Task<IActionResult> Create([FromBody] DeliveryOrder order)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            try
            {
                order.EncodedBy = User.Identity?.Name ?? order.EncodedBy ?? "Operations Team";
                var createdOrder = await _service.CreateOrderAsync(order);
                return CreatedAtAction(nameof(GetById), new { id = createdOrder.Id }, createdOrder);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "OpTeamAndAbove")]
        public async Task<IActionResult> Update(int id, [FromBody] DeliveryOrder order)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                order.UpdatedBy = User.Identity?.Name ?? order.UpdatedBy ?? "System";
                var updatedOrder = await _service.UpdateOrderAsync(id, order);
                if (updatedOrder == null) return NotFound(new { message = "Order not found." });

                return Ok(updatedOrder);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "OpTeamAndAbove")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteOrderAsync(id);
            if (!success) return NotFound(new { message = "Order not found." });

            return NoContent();
        }

        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetHistory(int id)
        {
            var history = await _context.DeliveryHistoryLogs
                .Where(h => h.DeliveryOrderId == id)
                .OrderByDescending(h => h.Id)
                .Select(h => new
                {
                    h.Id,
                    h.FromStatus,
                    h.ToStatus,
                    h.Notes,
                    h.ChangedBy,
                    h.ChangedAt
                })
                .ToListAsync();

            return Ok(history);
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> PatchStatus(int id, [FromBody] StatusPatchModel model)
        {
            var order = await _service.GetOrderByIdAsync(id);
            if (order == null) return NotFound(new { message = "Order not found." });

            try
            {
                order.Status = model.Status;
                order.UpdatedBy = User.Identity?.Name ?? "System";
                order.FailureRemarks = model.Notes;
                order.RedeliveryRemarks = model.Notes;

                var updated = await _service.UpdateOrderAsync(id, order);
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/assign-driver")]
        [Authorize(Policy = "OpTeamAndAbove")]
        public async Task<IActionResult> AssignDriver(int id, [FromBody] DriverAssignmentModel model)
        {
            var order = await _service.GetOrderByIdAsync(id);
            if (order == null) return NotFound(new { message = "Order not found." });

            try
            {
                order.DriverId = model.DriverId;
                order.UpdatedBy = User.Identity?.Name ?? "System Admin";

                var updated = await _service.UpdateOrderAsync(id, order);
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/schedule-redelivery")]
        public async Task<IActionResult> ScheduleRedelivery(int id, [FromBody] RedeliveryModel model)
        {
            var order = await _service.GetOrderByIdAsync(id);
            if (order == null) return NotFound(new { message = "Order not found." });

            try
            {
                order.RedeliveryScheduledDate = model.RedeliveryDate;
                order.RedeliveryRemarks = model.Remarks;
                order.RedeliveryDriverId = model.DriverId;
                order.RedeliveryStatus = "Approved";
                order.Status = "Pending"; // Resets status to Pending for delivery attempt
                order.UpdatedBy = User.Identity?.Name ?? "System Admin";

                var updated = await _service.UpdateOrderAsync(id, order);
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/restore")]
        [Authorize(Policy = "OpTeamAndAbove")]
        public async Task<IActionResult> RestoreOrder(int id)
        {
            var order = await _service.GetOrderByIdAsync(id);
            if (order == null) return NotFound(new { message = "Order not found." });

            try
            {
                order.IsArchived = false;
                order.CompletedAt = null;
                order.ArchivedReason = null;
                order.Status = "Pending"; // Reset status to Pending to retry/reschedule E2E
                order.UpdatedBy = User.Identity?.Name ?? "System Admin";

                var updated = await _service.UpdateOrderAsync(id, order);
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/pod")]
        [Authorize(Policy = "AnyRole")]
        public async Task<IActionResult> UploadPod(int id, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("File is required.");
            
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest("File size exceeds 5MB limit.");

            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
                return BadRequest("Unsupported format. Only JPEG or PNG are allowed.");

            var order = await _service.GetOrderByIdAsync(id);
            if (order == null) return NotFound(new { message = "Order not found." });

            try
            {
                using (var ms = new MemoryStream())
                {
                    await file.CopyToAsync(ms);
                    var bytes = ms.ToArray();
                    var base64 = Convert.ToBase64String(bytes);
                    var mimeType = ext == ".png" ? "image/png" : "image/jpeg";
                    order.PodImage = $"data:{mimeType};base64,{base64}";
                }

                order.UpdatedBy = User.Identity?.Name ?? "Driver";
                order.Status = "Completed";

                var updated = await _service.UpdateOrderAsync(id, order);
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("track")]
        [AllowAnonymous]
        public async Task<IActionResult> Track([FromQuery] string waybill)
        {
            if (string.IsNullOrEmpty(waybill)) return BadRequest("Waybill is required.");

            var order = await _context.DeliveryOrders
                .Include(o => o.Driver)
                .FirstOrDefaultAsync(o => o.WaybillNo.ToLower() == waybill.Trim().ToLower());

            if (order == null) return NotFound(new { message = "Waybill not found" });

            var history = await _context.DeliveryHistoryLogs
                .Where(h => h.DeliveryOrderId == order.Id)
                .OrderBy(h => h.Id)
                .Select(h => new
                {
                    h.FromStatus,
                    h.ToStatus,
                    h.Notes,
                    h.ChangedBy,
                    h.ChangedAt
                })
                .ToListAsync();

            var events = new List<object>();
            events.Add(new
            {
                status = "Pending",
                timestamp = order.DateEncoded,
                description = "Order created and pending pickup."
            });

            foreach (var log in history)
            {
                events.Add(new
                {
                    status = log.ToStatus,
                    timestamp = log.ChangedAt,
                    description = log.Notes ?? $"Status changed to {log.ToStatus}."
                });
            }

            var response = new
            {
                id = order.Id.ToString(),
                waybillNo = order.WaybillNo,
                currentStatus = order.Status,
                currentStatusHeadline = $"Your package is {order.Status}",
                events = events,
                lastLocation = new { lat = order.LiveLatitude ?? 14.5995, lng = order.LiveLongitude ?? 120.9842 },
                potImage = order.PotImage ?? order.PodImage,
                liveCoordinates = order.LiveLatitude.HasValue && order.LiveLongitude.HasValue ? new
                {
                    lat = order.LiveLatitude.Value,
                    lng = order.LiveLongitude.Value,
                    lastUpdated = order.LastLiveUpdate ?? order.LastUpdated
                } : null,
                recipientCoordinates = order.RecipientLatitude.HasValue && order.RecipientLongitude.HasValue ? new
                {
                    lat = order.RecipientLatitude.Value,
                    lng = order.RecipientLongitude.Value
                } : null,
                recipientAddress = order.RecipientAddress,
                driverName = order.Driver?.Name,
                driverInitials = order.Driver?.Initials,
                driverColor = order.Driver?.Color ?? "#00A99D",
                redeliveryStatus = order.RedeliveryStatus ?? "None",
                redeliveryRequestedDate = order.RedeliveryRequestedDate,
                redeliveryRemarks = order.RedeliveryRemarks,
                taskType = order.TaskType
            };

            return Ok(response);
        }

        [HttpPost("track/reschedule")]
        [AllowAnonymous]
        public async Task<IActionResult> TrackReschedule([FromBody] TrackRescheduleModel model)
        {
            if (string.IsNullOrEmpty(model.WaybillNo)) return BadRequest("Waybill is required.");

            var order = await _context.DeliveryOrders
                .Include(o => o.Driver)
                .FirstOrDefaultAsync(o => o.WaybillNo.ToLower() == model.WaybillNo.Trim().ToLower());

            if (order == null) return NotFound(new { message = "Waybill not found" });

            if (order.Status != "Failed" && order.Status != "Cancelled")
            {
                return BadRequest("Re-delivery reschedule can only be requested for failed or cancelled orders.");
            }

            order.RedeliveryStatus = "Pending Approval";
            order.RedeliveryRequestedDate = DateTime.Parse(model.RequestedDate).ToString("MMMM dd, yyyy");
            order.RedeliveryRemarks = model.Remarks;
            order.UpdatedBy = "Client Portal";
            order.LastUpdated = DateTime.UtcNow.ToString("O");

            // Save history log
            var historyLog = new DeliveryHistoryLog
            {
                DeliveryOrderId = order.Id,
                FromStatus = order.Status,
                ToStatus = order.Status,
                Notes = $"Reschedule requested for {order.RedeliveryRequestedDate}. Remarks: {model.Remarks}",
                ChangedBy = "Client Portal",
                ChangedAt = DateTime.UtcNow.ToString("O")
            };
            await _context.DeliveryHistoryLogs.AddAsync(historyLog);

            // Save activity log
            var activityLog = new ActivityLog
            {
                Timestamp = DateTime.UtcNow.ToString("O"),
                UserName = "Client Portal",
                UserRole = "CLIENT",
                UserInitials = "CL",
                UserColor = "#7C3AED",
                Action = "Update",
                Description = $"Client requested re-delivery reschedule for {order.WaybillNo} on {order.RedeliveryRequestedDate}",
                Reference = order.WaybillNo
            };
            await _context.ActivityLogs.AddAsync(activityLog);

            // Create notification for admin/operations
            var notification = new Notification
            {
                Type = "alert",
                Title = "Reschedule Request Received",
                WaybillNo = order.WaybillNo,
                Description = $"Client requested a re-delivery attempt for waybill {order.WaybillNo} on {order.RedeliveryRequestedDate}. Remarks: {model.Remarks}",
                Timestamp = DateTime.UtcNow.ToString("t"),
                Date = DateTime.UtcNow.ToString("MM/dd/yyyy"),
                Source = "Client Portal",
                Read = false,
                StatusBadge = "New Request"
            };
            await _context.Notifications.AddAsync(notification);

            await _context.SaveChangesAsync();
            return Ok(new { message = "Reschedule request submitted successfully." });
        }

        [HttpPost("import")]
        [Authorize(Policy = "OpTeamAndAbove")]
        public async Task<IActionResult> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "No file uploaded." });

            var importedCount = 0;
            var errors = new List<string>();

            try
            {
                using (var stream = new MemoryStream())
                {
                    await file.CopyToAsync(stream);
                    using (var workbook = new XLWorkbook(stream))
                    {
                        var worksheet = workbook.Worksheets.FirstOrDefault();
                        if (worksheet == null) return BadRequest(new { message = "Workbook worksheet not found." });

                        var rows = worksheet.RangeUsed().RowsUsed().Skip(1);
                        foreach (var row in rows)
                        {
                            try
                            {
                                var order = new DeliveryOrder
                                {
                                    ClientName = row.Cell(1).GetValue<string>(),
                                    ClientType = row.Cell(2).GetValue<string>() ?? "Standard",
                                    ContactNumber = row.Cell(3).GetValue<string>(),
                                    SenderAddress = row.Cell(4).GetValue<string>(),
                                    RecipientName = row.Cell(5).GetValue<string>(),
                                    RecipientContact = row.Cell(6).GetValue<string>(),
                                    RecipientAddress = row.Cell(7).GetValue<string>(),
                                    Area = row.Cell(8).GetValue<string>(),
                                    Landmark = row.Cell(9).GetValue<string>(),
                                    Route = row.Cell(10).GetValue<string>(),
                                    TaskType = row.Cell(11).GetValue<string>() ?? "Delivery",
                                    PackageType = row.Cell(12).GetValue<string>() ?? "Parcel",
                                    PackageDescription = row.Cell(13).GetValue<string>() ?? "Bulk Imported Item",
                                    ItemCount = row.Cell(14).GetValue<int>() > 0 ? row.Cell(14).GetValue<int>() : 1,
                                    Weight = row.Cell(15).GetValue<string>() ?? "1.0 kg",
                                    DeclaredValue = row.Cell(16).GetValue<string>() ?? "₱ 0.00",
                                    ExpectedDelivery = row.Cell(17).GetValue<string>(),
                                    OrderDate = DateTime.UtcNow.ToString("MMMM dd, yyyy"),
                                    EncodedBy = User.Identity?.Name ?? "Operations Team"
                                };

                                if (string.IsNullOrEmpty(order.ExpectedDelivery))
                                {
                                    order.ExpectedDelivery = DateTime.UtcNow.AddDays(2).ToString("MMMM dd, yyyy");
                                }

                                await _service.CreateOrderAsync(order);
                                importedCount++;
                            }
                            catch (Exception ex)
                            {
                                errors.Add($"Row {row.RowNumber()}: {ex.Message}");
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Excel parsing failure: {ex.Message}" });
            }

            return Ok(new { importedCount, errors });
        }

        [HttpGet("{id}/waybill-pdf")]
        [AllowAnonymous]
        public async Task<IActionResult> GetWaybillPdf(int id)
        {
            var order = await _service.GetOrderByIdAsync(id);
            if (order == null) return NotFound("Order not found.");

            QuestPDF.Settings.License = LicenseType.Community;

            var pdfData = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A5.Landscape());
                    page.Margin(1, Unit.Centimetre);
                    page.Header().Text("SPEEDEX COURIER WAYBILL").Bold().FontSize(18).FontColor(Colors.Teal.Medium);
                    
                    page.Content().Column(col =>
                    {
                        col.Spacing(10);
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text($"Waybill No: {order.WaybillNo}").Bold().FontSize(14);
                                c.Item().Text($"Date: {order.OrderDate}");
                                c.Item().Text($"Expected Delivery: {order.ExpectedDelivery}");
                                c.Item().Text($"Task Type: {order.TaskType}");
                                c.Item().Text($"Priority: {order.Priority}");
                            });
                            
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("RECIPIENT DETAILS:").Bold();
                                c.Item().Text($"Name: {order.RecipientName}");
                                c.Item().Text($"Address: {order.RecipientAddress}");
                                c.Item().Text($"Contact: {order.RecipientContact}");
                                c.Item().Text($"Area: {order.Area}");
                            });
                        });
                        
                        col.Item().LineHorizontal(1);
                        
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("SENDER DETAILS:").Bold();
                                c.Item().Text($"Client: {order.ClientName}");
                                c.Item().Text($"Sender Address: {order.SenderAddress}");
                            });
                            
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("PACKAGE DETAILS:").Bold();
                                c.Item().Text($"Type: {order.PackageType}");
                                c.Item().Text($"Description: {order.PackageDescription}");
                                c.Item().Text($"Weight: {order.Weight} | Items: {order.ItemCount}");
                                c.Item().Text($"Declared Value: {order.DeclaredValue}");
                            });
                        });
                    });
                    
                    page.Footer().AlignCenter().Text("Thank you for choosing Speedex Courier!").Italic().FontSize(9);
                });
            }).GeneratePdf();

            return File(pdfData, "application/pdf", $"waybill_{order.WaybillNo}.pdf");
        }
    }

    public class StatusPatchModel
    {
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class DriverAssignmentModel
    {
        public int DriverId { get; set; }
    }

    public class RedeliveryModel
    {
        public string RedeliveryDate { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public int DriverId { get; set; }
    }

    public class TrackRescheduleModel
    {
        public string WaybillNo { get; set; } = string.Empty;
        public string RequestedDate { get; set; } = string.Empty;
        public string? Remarks { get; set; }
    }
}
