using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Employee> Employees { get; set; }
        public DbSet<DeliveryOrder> DeliveryOrders { get; set; }
        public DbSet<DeliveryHistoryLog> DeliveryHistoryLogs { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<ActivityLog> ActivityLogs { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<AppTask> Tasks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Uniqueness indexes
            modelBuilder.Entity<DeliveryOrder>()
                .HasIndex(o => o.WaybillNo)
                .IsUnique();

            modelBuilder.Entity<Employee>()
                .HasIndex(e => e.EmployeeId)
                .IsUnique();

            // Set up cascade behaviors or constraints if necessary
            modelBuilder.Entity<RefreshToken>()
                .HasOne(t => t.Employee)
                .WithMany()
                .HasForeignKey(t => t.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AppTask>()
                .HasOne(t => t.Employee)
                .WithMany()
                .HasForeignKey(t => t.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
