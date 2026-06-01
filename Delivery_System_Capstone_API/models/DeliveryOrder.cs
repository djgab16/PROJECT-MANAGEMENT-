using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models;

public class DeliveryOrder
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(30)]
    public string WaybillNo { get; set; } = string.Empty; // e.g. SPX-2026-0841

    // --- Client / Sender ---
    [Required]
    [MaxLength(150)]
    public string ClientName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ClientType { get; set; } = string.Empty; // Corporate | Individual

    [MaxLength(20)]
    public string ContactNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(300)]
    public string SenderAddress { get; set; } = string.Empty;

    // --- Recipient ---
    [Required]
    [MaxLength(150)]
    public string RecipientName { get; set; } = string.Empty;

    [MaxLength(20)]
    public string RecipientContact { get; set; } = string.Empty;

    [Required]
    [MaxLength(300)]
    public string RecipientAddress { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Area { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? Landmark { get; set; }

    [MaxLength(300)]
    public string Route { get; set; } = string.Empty;

    // --- Driver (FK to Employee) ---
    public int? DriverId { get; set; }

    [ForeignKey(nameof(DriverId))]
    public Employee? Driver { get; set; }

    // --- Status ---
    [Required]
    [MaxLength(20)]
    public string TaskType { get; set; } = "Delivery"; // Delivery | Pickup

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Pending"; // Pending | In Transit | Delivered | Completed | Failed | Returned

    [Required]
    [MaxLength(20)]
    public string PodStatus { get; set; } = "Not Submitted"; // Submitted | No POD | Not Submitted

    // --- Package Details ---
    [MaxLength(50)]
    public string PackageType { get; set; } = string.Empty; // Parcel | Document | Fragile

    [MaxLength(300)]
    public string PackageDescription { get; set; } = string.Empty;

    public int ItemCount { get; set; } = 1;

    [MaxLength(20)]
    public string Weight { get; set; } = string.Empty; // e.g. "1.2 kg"

    [MaxLength(30)]
    public string DeclaredValue { get; set; } = string.Empty; // e.g. "₱ 2,500.00"

    [MaxLength(500)]
    public string? SpecialInstructions { get; set; }

    // --- POD Image ---
    [MaxLength(500)]
    public string? PodImagePath { get; set; } // Stored file path / URL

    // --- Dates ---
    public DateTime OrderDate { get; set; }

    public DateTime ExpectedDelivery { get; set; }

    public DateTime? DateCompleted { get; set; }

    // --- Audit ---
    public int EncodedById { get; set; }

    [ForeignKey(nameof(EncodedById))]
    public Employee EncodedBy { get; set; } = null!;

    public DateTime DateEncoded { get; set; } = DateTime.UtcNow;

    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    public int UpdatedById { get; set; }

    [ForeignKey(nameof(UpdatedById))]
    public Employee UpdatedBy { get; set; } = null!;

    public bool IsArchived { get; set; } = false;

    public DateTime? ArchivedAt { get; set; }

    // --- Live Geolocation Telemetry Tracking ---
    public double? LiveLatitude { get; set; }
    public double? LiveLongitude { get; set; }
    public double? RecipientLatitude { get; set; }
    public double? RecipientLongitude { get; set; }
    public DateTime? LastLiveUpdate { get; set; }

    // --- Re-delivery Scheduling (PB-010) ---
    public DateTime? RedeliveryScheduledDate { get; set; }

    public int? RedeliveryDriverId { get; set; }

    [ForeignKey(nameof(RedeliveryDriverId))]
    public Employee? RedeliveryDriver { get; set; }

    [MaxLength(500)]
    public string? RedeliveryRemarks { get; set; }

    public int RedeliveryAttemptCount { get; set; } = 0;

    // Navigation
    public ICollection<DeliveryHistoryLog> HistoryLogs { get; set; } = [];
}
