using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SPXDeliveryAPI.Models;
using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // All endpoints require authentication by default
    public class DeliveryOrderController : ControllerBase
    {
        private readonly IDeliveryOrderService _service;

        public DeliveryOrderController(IDeliveryOrderService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var orders = await _service.GetAllOrdersAsync();
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
        [Authorize(Policy = "OpTeamAndAbove")] // PB-005: Operations Team creates order
        public async Task<IActionResult> Create([FromBody] DeliveryOrder order)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            var createdOrder = await _service.CreateOrderAsync(order);
            return CreatedAtAction(nameof(GetById), new { id = createdOrder.Id }, createdOrder);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] DeliveryOrder order)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var updatedOrder = await _service.UpdateOrderAsync(id, order);
            if (updatedOrder == null) return NotFound(new { message = "Order not found." });

            return Ok(updatedOrder);
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "OpTeamAndAbove")] // PB-009: Operations Team cancels order
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteOrderAsync(id);
            if (!success) return NotFound(new { message = "Order not found." });

            return NoContent();
        }

        [HttpPost("upload-pod")]
        [Authorize(Policy = "AnyRole")] // Driver or above can upload POD
        public async Task<IActionResult> UploadPod([FromForm] int id, [FromForm] string base64Image)
        {
            // PB-022 Validate Image Format/Size (handled mostly in frontend/API if using FileUpload)
            // Here we assume it's sent as a Base64 string for simplicity or file upload logic
            // Since requirements say JPEG/PNG and <5MB, let's implement basic checks
            
            if (string.IsNullOrEmpty(base64Image))
                return BadRequest("Image is required.");

            // Approximate size check (Base64 is ~33% larger than binary)
            var sizeInBytes = base64Image.Length * 0.75;
            if (sizeInBytes > 5 * 1024 * 1024)
                return BadRequest("File size exceeds 5MB limit.");

            if (!base64Image.StartsWith("data:image/jpeg") && !base64Image.StartsWith("data:image/png"))
                return BadRequest("Unsupported format. Only JPEG or PNG are allowed.");

            var order = await _service.GetOrderByIdAsync(id);
            if (order == null) return NotFound(new { message = "Order not found." });

            order.PodImage = base64Image;
            order.UpdatedBy = User.Identity?.Name ?? "Unknown";

            var updatedOrder = await _service.UpdateOrderAsync(id, order);
            return Ok(updatedOrder);
        }
    }
}
