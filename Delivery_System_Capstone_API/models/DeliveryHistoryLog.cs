using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models
{
    public class DeliveryHistoryLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DeliveryOrderId { get; set; }

        [ForeignKey("DeliveryOrderId")]
        public virtual DeliveryOrder DeliveryOrder { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string FromStatus { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ToStatus { get; set; } = string.Empty;

        public string? Notes { get; set; }

        [Required]
        [MaxLength(100)]
        public string ChangedBy { get; set; } = string.Empty;

        [Required]
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
}
