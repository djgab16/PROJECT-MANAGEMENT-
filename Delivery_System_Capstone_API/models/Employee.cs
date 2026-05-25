using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models;

public class Employee
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Human-readable employee ID (e.g. "EMP-001"). Unique, used as login username.
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string EmployeeId { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Role { get; set; } = string.Empty; // SUPER ADMIN | ADMIN | OP. TEAM | DRIVER

    [Required]
    [MaxLength(100)]
    public string SystemAccess { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Active"; // Active | Pending | Locked

    [Required]
    public string PasswordHash { get; set; } = string.Empty; // Bcrypt hash

    public int FailedLoginAttempts { get; set; } = 0;

    public DateTime? LockedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<DeliveryOrder> EncodedOrders { get; set; } = [];
    public ICollection<DeliveryOrder> AssignedOrders { get; set; } = [];
    public ICollection<ActivityLog> ActivityLogs { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
