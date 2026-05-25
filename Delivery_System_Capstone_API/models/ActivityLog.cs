using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models;

public class ActivityLog
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [ForeignKey(nameof(EmployeeId))]
    public Employee Employee { get; set; } = null!;

    [Required]
    [MaxLength(30)]
    public string Action { get; set; } = string.Empty; // Create | Update | Assign | POD Upload | Login | Archive | Delete

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// e.g. Waybill number or Employee ID being acted on
    /// </summary>
    [MaxLength(50)]
    public string? Reference { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Captured at log time (in case employee role changes later)
    /// </summary>
    [MaxLength(50)]
    public string UserRoleSnapshot { get; set; } = string.Empty;
}
