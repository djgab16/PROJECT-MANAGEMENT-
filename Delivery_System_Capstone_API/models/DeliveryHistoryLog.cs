using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models;

/// <summary>
/// Tracks every status change or field update on a DeliveryOrder.
/// Powers the /delivery-orders/:id/history route.
/// </summary>
public class DeliveryHistoryLog
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int DeliveryOrderId { get; set; }

    [ForeignKey(nameof(DeliveryOrderId))]
    public DeliveryOrder DeliveryOrder { get; set; } = null!;

    [Required]
    [MaxLength(20)]
    public string FromStatus { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string ToStatus { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Notes { get; set; }

    public int ChangedById { get; set; }

    [ForeignKey(nameof(ChangedById))]
    public Employee ChangedBy { get; set; } = null!;

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}
