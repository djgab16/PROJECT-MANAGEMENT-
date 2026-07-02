using System.ComponentModel.DataAnnotations;

namespace SPXDeliveryAPI.Models
{
    public class Notification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "info"; // "alert", "success", "system", "info"

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? WaybillNo { get; set; }

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string Timestamp { get; set; } = string.Empty;

        [Required]
        public DateTime Date { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(100)]
        public string Source { get; set; } = string.Empty;

        public bool Read { get; set; } = false;

        [MaxLength(50)]
        public string? StatusBadge { get; set; }
    }
}
