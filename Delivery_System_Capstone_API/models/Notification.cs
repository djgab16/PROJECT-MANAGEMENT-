using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models;

public class Notification
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = string.Empty; // alert | success | system | info

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? WaybillNo { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? StatusBadge { get; set; } // Urgent | Success | In Transit | New | etc.

    /// <summary>
    /// Who/what generated this notification (employee name or "System" / "Automated Alert")
    /// </summary>
    [MaxLength(150)]
    public string Source { get; set; } = "System";

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Optional: link back to the delivery order if applicable
    /// </summary>
    public int? DeliveryOrderId { get; set; }

    [ForeignKey(nameof(DeliveryOrderId))]
    public DeliveryOrder? DeliveryOrder { get; set; }
}
