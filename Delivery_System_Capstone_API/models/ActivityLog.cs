using System.ComponentModel.DataAnnotations;

namespace SPXDeliveryAPI.Models
{
    public class ActivityLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string UserName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string UserRole { get; set; } = string.Empty;

        [MaxLength(2)]
        public string UserInitials { get; set; } = string.Empty;

        [MaxLength(7)]
        public string UserColor { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Action { get; set; } = string.Empty; // "Create", "Update", "POT Upload", "Login", etc.

        [Required]
        public string Description { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Reference { get; set; }
    }
}
