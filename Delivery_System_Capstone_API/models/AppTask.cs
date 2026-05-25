using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models;

public class AppTask
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Pending"; // Pending | In Progress | Completed

    [MaxLength(20)]
    public string Priority { get; set; } = "Normal"; // Low | Normal | High | Urgent

    public int CreatedById { get; set; }

    [ForeignKey(nameof(CreatedById))]
    public Employee CreatedBy { get; set; } = null!;

    public int? AssignedToId { get; set; }

    [ForeignKey(nameof(AssignedToId))]
    public Employee? AssignedTo { get; set; }

    public DateTime? DueDate { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Optional link to a delivery order
    /// </summary>
    [MaxLength(30)]
    public string? WaybillRef { get; set; }
}
