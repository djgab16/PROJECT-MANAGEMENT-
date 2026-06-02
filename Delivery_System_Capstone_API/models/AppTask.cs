using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SPXDeliveryAPI.Models
{
    public class AppTask
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // "Pending", "In Progress", "Completed"

        [Required]
        public int EmployeeId { get; set; }

        [ForeignKey("EmployeeId")]
        public virtual Employee Employee { get; set; } = null!;
    }
}
