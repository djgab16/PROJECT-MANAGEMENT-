using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models
{
    public class RefreshToken
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Token { get; set; } = string.Empty;

        [Required]
        public DateTime Expires { get; set; }

        public bool IsExpired => DateTime.UtcNow >= Expires;

        public DateTime Created { get; set; }

        [Required]
        public string CreatedByIp { get; set; } = string.Empty;

        public DateTime? Revoked { get; set; }

        public string? RevokedByIp { get; set; }

        public string? ReplacedByToken { get; set; }

        public bool IsActive => Revoked == null && !IsExpired;

        [Required]
        public int EmployeeId { get; set; }

        [ForeignKey("EmployeeId")]
        public virtual Employee Employee { get; set; } = null!;
    }
}
