using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SPXDeliveryAPI.DTOs.DeliveryOrders;
using SPXDeliveryAPI.Services;
using System.Security.Claims;

namespace SPXDeliveryAPI.Controllers;

[ApiController]
[Route("api/delivery-orders")]
[Authorize]
public class DeliveryOrdersController(
    IDeliveryOrderService service,
    ILogger<DeliveryOrdersController> logger) : ControllerBase
{
    // ─── GET /api/delivery-orders ──────────────────────────────────────────────
    /// <summary>Get all delivery orders with optional filters and pagination.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(DeliveryOrderListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] DeliveryOrderFilterRequest filter)
    {
        var result = await service.GetAllAsync(filter);
        return Ok(result);
    }

    // ─── GET /api/delivery-orders/{id} ────────────────────────────────────────
    /// <summary>Get a single delivery order by its database ID.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(DeliveryOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var result = await service.GetByIdAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── GET /api/delivery-orders/track?waybill=SPX-2026-0841 ─────────────────
    /// <summary>Track a delivery by waybill number. Used by /track and /search-waybill pages.</summary>
    [HttpGet("track")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(DeliveryOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Track([FromQuery] string waybill)
    {
        if (string.IsNullOrWhiteSpace(waybill))
            return BadRequest(new { message = "Waybill number is required." });

        try
        {
            var result = await service.GetByWaybillAsync(waybill);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── GET /api/delivery-orders/{id}/history ────────────────────────────────
    /// <summary>Get the full status change history for a delivery order.</summary>
    [HttpGet("{id:int}/history")]
    [ProducesResponseType(typeof(List<DeliveryHistoryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHistory(int id)
    {
        try
        {
            var result = await service.GetHistoryAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── POST /api/delivery-orders ────────────────────────────────────────────
    /// <summary>Create a new delivery order. Waybill number is auto-generated.</summary>
    [HttpPost]
    [Authorize(Policy = "OpTeamAndAbove")]
    [ProducesResponseType(typeof(DeliveryOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateDeliveryOrderRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var employeeId = GetCurrentEmployeeDbId();
            var result     = await service.CreateAsync(request, employeeId);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error creating delivery order.");
            return StatusCode(500, new { message = "An error occurred while creating the order." });
        }
    }

    // ─── PUT /api/delivery-orders/{id} ────────────────────────────────────────
    /// <summary>Update delivery order details (not status — use /status for that).</summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "OpTeamAndAbove")]
    [ProducesResponseType(typeof(DeliveryOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDeliveryOrderRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var employeeId = GetCurrentEmployeeDbId();
            var result     = await service.UpdateAsync(id, request, employeeId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error updating delivery order {Id}.", id);
            return StatusCode(500, new { message = "An error occurred while updating the order." });
        }
    }

    // ─── PATCH /api/delivery-orders/{id}/status ───────────────────────────────
    /// <summary>Update only the delivery status. Automatically logs history and creates notification.</summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(DeliveryOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var employeeId = GetCurrentEmployeeDbId();
            var result     = await service.UpdateStatusAsync(id, request, employeeId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error updating status for order {Id}.", id);
            return StatusCode(500, new { message = "An error occurred while updating the status." });
        }
    }

    // ─── PATCH /api/delivery-orders/{id}/assign-driver ────────────────────────
    /// <summary>Assign or reassign a driver to a delivery order.</summary>
    [HttpPatch("{id:int}/assign-driver")]
    [Authorize(Policy = "OpTeamAndAbove")]
    [ProducesResponseType(typeof(DeliveryOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignDriver(int id, [FromBody] AssignDriverRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var employeeId = GetCurrentEmployeeDbId();
            var result     = await service.AssignDriverAsync(id, request, employeeId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error assigning driver to order {Id}.", id);
            return StatusCode(500, new { message = "An error occurred while assigning the driver." });
        }
    }

    // ─── POST /api/delivery-orders/{id}/pod ───────────────────────────────────
    /// <summary>Upload a POD (Proof of Delivery) image. Accepts JPG, PNG, WEBP. Max 5MB.</summary>
    [HttpPost("{id:int}/pod")]
    [ProducesResponseType(typeof(DeliveryOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadPod(int id, IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        try
        {
            var employeeId = GetCurrentEmployeeDbId();
            var result     = await service.UploadPodAsync(id, file, employeeId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error uploading POD for order {Id}.", id);
            return StatusCode(500, new { message = "An error occurred while uploading the file." });
        }
    }

    // ─── PATCH /api/delivery-orders/{id}/archive ──────────────────────────────
    /// <summary>Archive a completed delivery order.</summary>
    [HttpPatch("{id:int}/archive")]
    [Authorize(Policy = "OpTeamAndAbove")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Archive(int id)
    {
        try
        {
            var employeeId = GetCurrentEmployeeDbId();
            await service.ArchiveAsync(id, employeeId);
            return Ok(new { message = "Order archived successfully." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── PATCH /api/delivery-orders/{id}/restore ──────────────────────────────
    /// <summary>Restore an archived delivery order back to active.</summary>
    [HttpPatch("{id:int}/restore")]
    [Authorize(Policy = "OpTeamAndAbove")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Restore(int id)
    {
        try
        {
            var employeeId = GetCurrentEmployeeDbId();
            await service.RestoreAsync(id, employeeId);
            return Ok(new { message = "Order restored successfully." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── DELETE /api/delivery-orders/{id} ────────────────────────────────────
    /// <summary>Permanently delete a delivery order. Super Admin only.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SuperAdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var employeeId = GetCurrentEmployeeDbId();
            await service.DeleteAsync(id, employeeId);
            return Ok(new { message = "Order permanently deleted." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error deleting order {Id}.", id);
            return StatusCode(500, new { message = "An error occurred while deleting the order." });
        }
    }

    // ─── Helper ───────────────────────────────────────────────────────────────
    private int GetCurrentEmployeeDbId()
    {
        var claim = User.FindFirst("employeeDbId")?.Value;
        if (claim is null || !int.TryParse(claim, out var id))
            throw new UnauthorizedAccessException("Could not determine the current employee.");
        return id;
    }
}
