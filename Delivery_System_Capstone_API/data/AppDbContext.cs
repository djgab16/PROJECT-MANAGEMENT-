using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Models;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

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
        public DbSet<DeliveryPrediction> DeliveryPredictions { get; set; }

        public override int SaveChanges()
        {
            ValidateEntities();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            ValidateEntities();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void ValidateEntities()
        {
            var entries = ChangeTracker.Entries<DeliveryOrder>()
                .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

            foreach (var entry in entries)
            {
                var order = entry.Entity;

                // 1. Validation for Delivered / Completed states
                if (order.Status == "Delivered" || order.Status == "Completed")
                {
                    if (!order.DateCompleted.HasValue)
                    {
                        throw new InvalidOperationException($"Delivered/Completed order {order.WaybillNo} must have a delivery timestamp (DateCompleted).");
                    }
                    
                    if (order.TaskType == "Delivery")
                    {
                        if (string.IsNullOrWhiteSpace(order.PodImage))
                        {
                            throw new InvalidOperationException($"Delivered/Completed home delivery order {order.WaybillNo} must have a Proof of Delivery (POD) image.");
                        }
                        if (!order.DriverId.HasValue)
                        {
                            throw new InvalidOperationException($"Delivered/Completed home delivery order {order.WaybillNo} must have a driver assigned.");
                        }
                    }
                    else if (order.TaskType == "Pickup")
                    {
                        if (string.IsNullOrWhiteSpace(order.PotImage))
                        {
                            throw new InvalidOperationException($"Picked Up office order {order.WaybillNo} must have a Proof of Transaction (POT) image.");
                        }
                    }
                }

                // 2. A Pickup order cannot have a driver assigned
                if (order.TaskType == "Pickup" && order.DriverId.HasValue && order.DriverId.Value > 0)
                {
                    throw new InvalidOperationException($"Pickup order {order.WaybillNo} cannot have a driver assigned.");
                }

                // 3. Status change constraints (Only for modified entities)
                if (entry.State == EntityState.Modified)
                {
                    var originalStatus = entry.Property(o => o.Status).OriginalValue;

                    // A Cancelled order cannot later become Delivered or Completed
                    if (originalStatus == "Cancelled" && (order.Status == "Delivered" || order.Status == "Completed"))
                    {
                        throw new InvalidOperationException($"Cancelled order {order.WaybillNo} cannot transition to Delivered or Completed.");
                    }

                    // A Delivered/Completed order cannot become Cancelled
                    if ((originalStatus == "Delivered" || originalStatus == "Completed") && order.Status == "Cancelled")
                    {
                        throw new InvalidOperationException($"Delivered or Completed order {order.WaybillNo} cannot transition to Cancelled.");
                    }
                }
            }
        }

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

            // Configure Optimization indexes
            modelBuilder.Entity<DeliveryOrder>()
                .HasIndex(o => o.Status);

            modelBuilder.Entity<DeliveryOrder>()
                .HasIndex(o => o.DriverId);

            modelBuilder.Entity<DeliveryOrder>()
                .HasIndex(o => o.IsArchived);

            modelBuilder.Entity<DeliveryOrder>()
                .HasIndex(o => o.RedeliveryStatus);

            modelBuilder.Entity<DeliveryOrder>()
                .HasIndex(o => o.TaskType);

            modelBuilder.Entity<DeliveryOrder>()
                .HasIndex(o => o.DateEncoded);

            modelBuilder.Entity<DeliveryOrder>()
                .HasIndex(o => o.LastUpdated);

            modelBuilder.Entity<DeliveryOrder>()
                .HasIndex(o => o.ArchivedAt);

            modelBuilder.Entity<Notification>()
                .HasIndex(n => n.Date);

            modelBuilder.Entity<ActivityLog>()
                .HasIndex(a => a.Timestamp);

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

            modelBuilder.Entity<DeliveryPrediction>()
                .HasIndex(p => p.DeliveryOrderId)
                .IsUnique();

            modelBuilder.Entity<DeliveryPrediction>()
                .HasOne(p => p.DeliveryOrder)
                .WithMany()
                .HasForeignKey(p => p.DeliveryOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
