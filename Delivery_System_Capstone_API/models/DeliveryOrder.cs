using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace SPXDeliveryAPI.Models
{
    public class DeliveryOrder
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string WaybillNo { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string ClientName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ClientType { get; set; } = "Standard";

        [MaxLength(20)]
        public string ContactNumber { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ContactPerson { get; set; }

        [Required]
        public string SenderAddress { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? SenderUnit { get; set; }

        [MaxLength(200)]
        public string? SenderStreet { get; set; }

        [MaxLength(100)]
        public string? SenderBarangay { get; set; }

        [MaxLength(100)]
        public string? SenderCity { get; set; }

        [Required]
        [MaxLength(100)]
        public string RecipientName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string RecipientContact { get; set; } = string.Empty;

        [Required]
        public string RecipientAddress { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? RecipientUnit { get; set; }

        [MaxLength(200)]
        public string? RecipientStreet { get; set; }

        [MaxLength(100)]
        public string? RecipientBarangay { get; set; }

        [MaxLength(100)]
        public string? RecipientCity { get; set; }

        [Required]
        [MaxLength(100)]
        public string Area { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Landmark { get; set; }

        [Required]
        [MaxLength(100)]
        public string Route { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // "Pending", "In Transit", "Delivered", "Completed", "Failed", "Returned"

        [MaxLength(20)]
        public string TaskType { get; set; } = "Delivery"; // "Delivery", "Pickup"

        [Required]
        [MaxLength(20)]
        public string PotStatus { get; set; } = "Not Submitted";

        [Required]
        [MaxLength(20)]
        public string PodStatus { get; set; } = "Not Submitted";

        [MaxLength(50)]
        public string PackageType { get; set; } = string.Empty;

        public string PackageDescription { get; set; } = string.Empty;

        public int ItemCount { get; set; } = 1;

        [MaxLength(20)]
        public string Weight { get; set; } = "0.0 kg";

        [MaxLength(50)]
        public string DeclaredValue { get; set; } = "₱ 0.00";

        public string? PotImage { get; set; } // base64 payload or URL path
        public string? PodImage { get; set; } // base64 payload or URL path

        // Redelivery fields
        public DateTime? RedeliveryScheduledDate { get; set; }
        public string? RedeliveryRemarks { get; set; }
        public int RedeliveryAttemptCount { get; set; } = 0;
        public int? RedeliveryDriverId { get; set; }
        public string? RedeliveryStatus { get; set; } = "None"; // "None", "Pending Approval", "Approved", "Rejected"
        public DateTime? RedeliveryRequestedDate { get; set; }

        // GPS coordinates
        public double? LiveLatitude { get; set; }
        public double? LiveLongitude { get; set; }
        public DateTime? LastLiveUpdate { get; set; }

        public double? RecipientLatitude { get; set; }
        public double? RecipientLongitude { get; set; }

        // Failure reasoning
        public string? FailureReason { get; set; }
        public string? FailureRemarks { get; set; }

        // Priority
        [MaxLength(10)]
        public string Priority { get; set; } = "Medium"; // "Low", "Medium", "High"

        public string? SpecialInstructions { get; set; }

        // Dates and Audits
        [Required]
        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime ExpectedDelivery { get; set; } = DateTime.UtcNow;

        public DateTime? DateCompleted { get; set; }

        public bool IsArchived { get; set; } = false;
        public DateTime? CompletedAt { get; set; }
        public string? ArchivedReason { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public string? ArchivedBy { get; set; }

        [Required]
        [MaxLength(100)]
        public string EncodedBy { get; set; } = string.Empty;

        [Required]
        public DateTime DateEncoded { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(100)]
        public string UpdatedBy { get; set; } = string.Empty;

        [NotMapped]
        public CoordinateModel? RecipientCoordinates { get; set; }

        [NotMapped]
        public CoordinateModel? GpsCoordinates { get; set; }

        [NotMapped]
        public LiveCoordinateModel? LiveCoordinates { get; set; }

        // Relationships
        public int? DriverId { get; set; }
        [ForeignKey("DriverId")]
        [ValidateNever]
        public virtual Employee? Driver { get; set; }

        [ForeignKey("RedeliveryDriverId")]
        [ValidateNever]
        public virtual Employee? RedeliveryDriver { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }

    public class CoordinateModel
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
    }

    public class LiveCoordinateModel
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
        public string LastUpdated { get; set; } = string.Empty;
    }
}
