using System.ComponentModel.DataAnnotations;

namespace SPXDeliveryAPI.DTOs.DeliveryOrders;

// ─── Request DTOs ──────────────────────────────────────────────────────────────

public class CreateDeliveryOrderRequest
{
    [Required] [MaxLength(150)] public string ClientName { get; set; } = string.Empty;
    [MaxLength(50)]  public string ClientType { get; set; } = "Corporate";
    [MaxLength(20)]  public string ContactNumber { get; set; } = string.Empty;
    [Required] [MaxLength(300)] public string SenderAddress { get; set; } = string.Empty;
    [Required] [MaxLength(150)] public string RecipientName { get; set; } = string.Empty;
    [MaxLength(20)]  public string RecipientContact { get; set; } = string.Empty;
    [Required] [MaxLength(300)] public string RecipientAddress { get; set; } = string.Empty;
    [MaxLength(100)] public string Area { get; set; } = string.Empty;
    [MaxLength(150)] public string? Landmark { get; set; }
    [MaxLength(300)] public string Route { get; set; } = string.Empty;
    public int? DriverId { get; set; }
    [MaxLength(50)]  public string PackageType { get; set; } = "Parcel";
    [MaxLength(300)] public string PackageDescription { get; set; } = string.Empty;
    public int ItemCount { get; set; } = 1;
    [MaxLength(20)]  public string Weight { get; set; } = string.Empty;
    [MaxLength(30)]  public string DeclaredValue { get; set; } = string.Empty;
    [MaxLength(500)] public string? SpecialInstructions { get; set; }
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime ExpectedDelivery { get; set; }
}

public class UpdateDeliveryOrderRequest
{
    [MaxLength(150)] public string? ClientName { get; set; }
    [MaxLength(50)]  public string? ClientType { get; set; }
    [MaxLength(20)]  public string? ContactNumber { get; set; }
    [MaxLength(300)] public string? SenderAddress { get; set; }
    [MaxLength(150)] public string? RecipientName { get; set; }
    [MaxLength(20)]  public string? RecipientContact { get; set; }
    [MaxLength(300)] public string? RecipientAddress { get; set; }
    [MaxLength(100)] public string? Area { get; set; }
    [MaxLength(150)] public string? Landmark { get; set; }
    [MaxLength(300)] public string? Route { get; set; }
    [MaxLength(50)]  public string? PackageType { get; set; }
    [MaxLength(300)] public string? PackageDescription { get; set; }
    public int? ItemCount { get; set; }
    [MaxLength(20)]  public string? Weight { get; set; }
    [MaxLength(30)]  public string? DeclaredValue { get; set; }
    [MaxLength(500)] public string? SpecialInstructions { get; set; }
    public DateTime? ExpectedDelivery { get; set; }
}

public class UpdateStatusRequest
{
    [Required]
    [RegularExpression("Pending|In Transit|Delivered|Completed|Failed|Returned",
        ErrorMessage = "Invalid status value.")]
    public string Status { get; set; } = string.Empty;
    [MaxLength(500)] public string? Notes { get; set; }
}

public class AssignDriverRequest
{
    [Required] public int DriverId { get; set; }
}

public class DeliveryOrderFilterRequest
{
    public string? Status { get; set; }
    public string? PodStatus { get; set; }
    public string? Area { get; set; }
    public string? ClientName { get; set; }
    public string? Search { get; set; }
    public bool? IsArchived { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

// ─── Response DTOs ─────────────────────────────────────────────────────────────

public class DeliveryOrderResponse
{
    public int Id { get; set; }
    public string WaybillNo { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string ClientType { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public string SenderAddress { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientContact { get; set; } = string.Empty;
    public string RecipientAddress { get; set; } = string.Empty;
    public string Area { get; set; } = string.Empty;
    public string? Landmark { get; set; }
    public string Route { get; set; } = string.Empty;
    public DriverSummary? Driver { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PodStatus { get; set; } = string.Empty;
    public string PackageType { get; set; } = string.Empty;
    public string PackageDescription { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public string Weight { get; set; } = string.Empty;
    public string DeclaredValue { get; set; } = string.Empty;
    public string? SpecialInstructions { get; set; }
    public string? PodImagePath { get; set; }
    public DateTime OrderDate { get; set; }
    public DateTime ExpectedDelivery { get; set; }
    public DateTime? DateCompleted { get; set; }
    public string EncodedBy { get; set; } = string.Empty;
    public DateTime DateEncoded { get; set; }
    public DateTime LastUpdated { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
    public bool IsArchived { get; set; }
}

public class DriverSummary
{
    public int Id { get; set; }
    public string EmployeeId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class DeliveryOrderListResponse
{
    public List<DeliveryOrderResponse> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public class DeliveryHistoryResponse
{
    public int Id { get; set; }
    public string FromStatus { get; set; } = string.Empty;
    public string ToStatus { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string ChangedBy { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
}
