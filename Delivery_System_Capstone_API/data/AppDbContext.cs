using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // ─── Tables ───────────────────────────────────────────────────────────────
    public DbSet<Employee> Employees { get; set; }
    public DbSet<DeliveryOrder> DeliveryOrders { get; set; }
    public DbSet<DeliveryHistoryLog> DeliveryHistoryLogs { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<ActivityLog> ActivityLogs { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<AppTask> Tasks { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ─── Employee ──────────────────────────────────────────────────────────
        builder.Entity<Employee>(e =>
        {
            e.HasIndex(x => x.EmployeeId).IsUnique();

            e.Property(x => x.Status)
             .HasDefaultValue("Active");

            e.Property(x => x.FailedLoginAttempts)
             .HasDefaultValue(0);
        });

        // ─── DeliveryOrder ─────────────────────────────────────────────────────
        builder.Entity<DeliveryOrder>(e =>
        {
            e.HasIndex(x => x.WaybillNo).IsUnique();

            e.Property(x => x.Status)
             .HasDefaultValue("Pending");

            e.Property(x => x.PodStatus)
             .HasDefaultValue("Not Submitted");

            e.Property(x => x.IsArchived)
             .HasDefaultValue(false);

            // Driver relationship — SET NULL on delete (orders survive driver removal)
            e.HasOne(x => x.Driver)
             .WithMany(d => d.AssignedOrders)
             .HasForeignKey(x => x.DriverId)
             .OnDelete(DeleteBehavior.SetNull);

            // EncodedBy — RESTRICT delete (can't delete employee who has orders)
            e.HasOne(x => x.EncodedBy)
             .WithMany(d => d.EncodedOrders)
             .HasForeignKey(x => x.EncodedById)
             .OnDelete(DeleteBehavior.Restrict);

            // UpdatedBy — NO ACTION (avoid multiple cascade paths in SQL Server)
            e.HasOne(x => x.UpdatedBy)
             .WithMany()
             .HasForeignKey(x => x.UpdatedById)
             .OnDelete(DeleteBehavior.NoAction);
        });

        // ─── DeliveryHistoryLog ────────────────────────────────────────────────
        builder.Entity<DeliveryHistoryLog>(e =>
        {
            e.HasOne(x => x.DeliveryOrder)
             .WithMany(d => d.HistoryLogs)
             .HasForeignKey(x => x.DeliveryOrderId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.ChangedBy)
             .WithMany()
             .HasForeignKey(x => x.ChangedById)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── Notification ──────────────────────────────────────────────────────
        builder.Entity<Notification>(e =>
        {
            e.Property(x => x.IsRead)
             .HasDefaultValue(false);

            e.HasOne(x => x.DeliveryOrder)
             .WithMany()
             .HasForeignKey(x => x.DeliveryOrderId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ─── ActivityLog ───────────────────────────────────────────────────────
        builder.Entity<ActivityLog>(e =>
        {
            e.HasOne(x => x.Employee)
             .WithMany(emp => emp.ActivityLogs)
             .HasForeignKey(x => x.EmployeeId)
             .OnDelete(DeleteBehavior.Restrict); // Keep logs even if employee is removed

            // Useful query indexes
            e.HasIndex(x => x.Timestamp);
            e.HasIndex(x => x.Action);
            e.HasIndex(x => x.Reference);
        });

        // ─── RefreshToken ──────────────────────────────────────────────────────
        builder.Entity<RefreshToken>(e =>
        {
            e.HasOne(x => x.Employee)
             .WithMany(emp => emp.RefreshTokens)
             .HasForeignKey(x => x.EmployeeId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(x => x.Token);
        });

        // ─── AppTask ───────────────────────────────────────────────────────────
        builder.Entity<AppTask>(e =>
        {
            e.HasOne(x => x.CreatedBy)
             .WithMany()
             .HasForeignKey(x => x.CreatedById)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.AssignedTo)
             .WithMany()
             .HasForeignKey(x => x.AssignedToId)
             .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
