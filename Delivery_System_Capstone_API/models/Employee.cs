using System.ComponentModel.DataAnnotations;

namespace SPXDeliveryAPI.Models
{
    public class Employee
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string EmployeeId { get; set; } = string.Empty; // e.g. "EMP-001"

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = string.Empty; // "SUPER ADMIN", "ADMIN", "OP. TEAM", "DRIVER", "CLIENT"

        [Required]
        [MaxLength(100)]
        public string SystemAccess { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active"; // "Active", "Pending", "Locked"

        public int FailedAttempts { get; set; } = 0;

        public DateTime? LockoutEnd { get; set; }

        [MaxLength(2)]
        public string Initials { get; set; } = string.Empty;

        [MaxLength(7)]
        public string Color { get; set; } = "#6B7280"; // hex color tag
    }
}
