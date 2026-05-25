using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Data;

/// <summary>
/// Seeds the database with initial employees and sample delivery orders
/// matching the frontend mockData.ts exactly.
/// Call from Program.cs: await DbSeeder.SeedAsync(app);
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        try
        {
            await db.Database.MigrateAsync();

            if (await db.Employees.AnyAsync())
            {
                logger.LogInformation("Database already seeded, skipping.");
                return;
            }

            logger.LogInformation("Seeding database...");

            // ─── Employees ─────────────────────────────────────────────────────
            // Passwords: all seeded with "Password123!" (bcrypt) — change in production
            var passwordHash = BCrypt.Net.BCrypt.HashPassword("Password123!");

            var employees = new List<Employee>
            {
                new() {
                    EmployeeId = "EMP-001", Name = "Taromaru Rex Gabriel",
                    Role = "SUPER ADMIN", SystemAccess = "All Systems",
                    Status = "Active", PasswordHash = passwordHash
                },
                new() {
                    EmployeeId = "EMP-002", Name = "Kenneth D. Yulip",
                    Role = "ADMIN", SystemAccess = "Operations",
                    Status = "Active", PasswordHash = passwordHash
                },
                new() {
                    EmployeeId = "EMP-003", Name = "John Angelo M. Reveche",
                    Role = "OP. TEAM", SystemAccess = "Delivery Tracker",
                    Status = "Active", PasswordHash = passwordHash
                },
                new() {
                    EmployeeId = "EMP-004", Name = "Hermione B. Benitez",
                    Role = "OP. TEAM", SystemAccess = "Operations",
                    Status = "Pending", PasswordHash = passwordHash
                },
                new() {
                    EmployeeId = "EMP-005", Name = "David Jr. M. Gabriel",
                    Role = "ADMIN", SystemAccess = "Delivery Tracker",
                    Status = "Locked", PasswordHash = passwordHash
                },
                // Drivers referenced in delivery orders
                new() {
                    EmployeeId = "DRV-001", Name = "Conag, Reca M.",
                    Role = "DRIVER", SystemAccess = "Delivery Tracker",
                    Status = "Active", PasswordHash = passwordHash
                },
                new() {
                    EmployeeId = "DRV-002", Name = "Panaligan, Sofia Q.",
                    Role = "DRIVER", SystemAccess = "Delivery Tracker",
                    Status = "Active", PasswordHash = passwordHash
                },
                new() {
                    EmployeeId = "DRV-003", Name = "Dumlao, Jhoyce A.",
                    Role = "DRIVER", SystemAccess = "Delivery Tracker",
                    Status = "Active", PasswordHash = passwordHash
                },
            };

            await db.Employees.AddRangeAsync(employees);
            await db.SaveChangesAsync();

            // Grab saved employees to use as FKs
            var superAdmin = await db.Employees.FirstAsync(e => e.EmployeeId == "EMP-001");
            var encoder    = await db.Employees.FirstAsync(e => e.EmployeeId == "EMP-005");
            var drvConag   = await db.Employees.FirstAsync(e => e.EmployeeId == "DRV-001");
            var drvPana    = await db.Employees.FirstAsync(e => e.EmployeeId == "DRV-002");
            var drvDumlao  = await db.Employees.FirstAsync(e => e.EmployeeId == "DRV-003");

            // ─── Delivery Orders ───────────────────────────────────────────────
            var orders = new List<DeliveryOrder>
            {
                new() {
                    WaybillNo = "SPX-2026-0841", ClientName = "Lazada Philippines",
                    ClientType = "Corporate", ContactNumber = "0917-123-4567",
                    SenderAddress = "Rockwell Dr., Brgy. Poblacion, Makati City, Metro Manila",
                    RecipientName = "Dela Cruz, Maria", RecipientContact = "0932-987-6543",
                    RecipientAddress = "142 Roces Ave., Brgy. Paligsahan, Quezon City",
                    Area = "Quezon City", Landmark = "Near Sct. Alcaraz St.",
                    DriverId = drvConag.Id, Status = "In Transit", PodStatus = "Not Submitted",
                    PackageType = "Parcel", PackageDescription = "Electronics — Shopee order #LZD-88201",
                    ItemCount = 2, Weight = "1.2 kg", DeclaredValue = "₱ 2,500.00",
                    SpecialInstructions = "Fragile, handle with care", Route = "Quezon City",
                    OrderDate = new DateTime(2026, 3, 29), ExpectedDelivery = new DateTime(2026, 3, 31),
                    EncodedById = encoder.Id, DateEncoded = new DateTime(2026, 3, 29, 8, 5, 0),
                    LastUpdated = new DateTime(2026, 3, 29, 9, 41, 0), UpdatedById = drvConag.Id
                },
                new() {
                    WaybillNo = "SPX-2026-0845", ClientName = "Lazada Philippines",
                    ClientType = "Corporate", ContactNumber = "0917-123-4567",
                    SenderAddress = "Rockwell Dr., Brgy. Poblacion, Makati City",
                    RecipientName = "Ocampo, Cecilia", RecipientContact = "0918-555-1234",
                    RecipientAddress = "Brgy. Sta. Mesa Heights, QC",
                    Area = "Caloocan City", DriverId = drvConag.Id,
                    Status = "Delivered", PodStatus = "Submitted",
                    PackageType = "Parcel", PackageDescription = "Fashion accessories",
                    ItemCount = 1, Weight = "0.5 kg", DeclaredValue = "₱ 890.00", Route = "Caloocan City",
                    OrderDate = new DateTime(2026, 3, 29), ExpectedDelivery = new DateTime(2026, 3, 30),
                    DateCompleted = new DateTime(2026, 3, 29, 9, 52, 0),
                    EncodedById = encoder.Id, DateEncoded = new DateTime(2026, 3, 29, 8, 10, 0),
                    LastUpdated = new DateTime(2026, 3, 29, 9, 52, 0), UpdatedById = drvConag.Id
                },
                new() {
                    WaybillNo = "SPX-2026-0812", ClientName = "Shopee Express",
                    ClientType = "Corporate", ContactNumber = "0917-555-9876",
                    SenderAddress = "Ayala Ave., Makati City",
                    RecipientName = "Santos, Jose", RecipientContact = "0920-111-2222",
                    RecipientAddress = "Ayala Ave., Makati",
                    Area = "Makati City", DriverId = drvPana.Id,
                    Status = "Completed", PodStatus = "Submitted",
                    PackageType = "Parcel", PackageDescription = "Home appliance",
                    ItemCount = 1, Weight = "3.2 kg", DeclaredValue = "₱ 4,500.00", Route = "Makati City",
                    OrderDate = new DateTime(2026, 3, 28), ExpectedDelivery = new DateTime(2026, 3, 29),
                    DateCompleted = new DateTime(2026, 3, 28, 14, 14, 0),
                    EncodedById = encoder.Id, DateEncoded = new DateTime(2026, 3, 28, 7, 0, 0),
                    LastUpdated = new DateTime(2026, 3, 28, 14, 14, 0), UpdatedById = drvPana.Id
                },
                new() {
                    WaybillNo = "SPX-2026-0798", ClientName = "TikTok Shop",
                    ClientType = "Corporate", ContactNumber = "0917-333-4444",
                    SenderAddress = "BGC High St., Taguig",
                    RecipientName = "Lim, Robert", RecipientContact = "0921-333-4567",
                    RecipientAddress = "BGC High St., Taguig",
                    Area = "Taguig City", DriverId = drvDumlao.Id,
                    Status = "Completed", PodStatus = "No POD",
                    PackageType = "Document", PackageDescription = "Legal documents",
                    ItemCount = 1, Weight = "0.3 kg", DeclaredValue = "₱ 200.00", Route = "Taguig City",
                    OrderDate = new DateTime(2026, 3, 28), ExpectedDelivery = new DateTime(2026, 3, 29),
                    DateCompleted = new DateTime(2026, 3, 28, 11, 5, 0),
                    EncodedById = encoder.Id, DateEncoded = new DateTime(2026, 3, 28, 8, 0, 0),
                    LastUpdated = new DateTime(2026, 3, 28, 11, 5, 0), UpdatedById = drvDumlao.Id
                },
                new() {
                    WaybillNo = "SPX-2026-0755", ClientName = "Shopee Express",
                    ClientType = "Corporate", ContactNumber = "0917-555-9876",
                    SenderAddress = "Kanlaon St., Mandaluyong",
                    RecipientName = "Garcia, Ella", RecipientContact = "0922-777-8888",
                    RecipientAddress = "Kanlaon St., Mandaluyong",
                    Area = "Mandaluyong", DriverId = drvPana.Id,
                    Status = "Completed", PodStatus = "Submitted",
                    PackageType = "Parcel", PackageDescription = "Clothing",
                    ItemCount = 3, Weight = "1.5 kg", DeclaredValue = "₱ 1,800.00", Route = "Mandaluyong",
                    OrderDate = new DateTime(2026, 3, 27), ExpectedDelivery = new DateTime(2026, 3, 28),
                    DateCompleted = new DateTime(2026, 3, 27, 16, 30, 0),
                    EncodedById = encoder.Id, DateEncoded = new DateTime(2026, 3, 27, 9, 0, 0),
                    LastUpdated = new DateTime(2026, 3, 27, 16, 30, 0), UpdatedById = drvPana.Id
                },
                new() {
                    WaybillNo = "SPX-2026-0801", ClientName = "Shopee Express",
                    ClientType = "Corporate", ContactNumber = "0917-555-9876",
                    SenderAddress = "Marikina City", RecipientName = "Torres, Miguel",
                    RecipientContact = "0924-666-7777", RecipientAddress = "Marikina City",
                    Area = "Marikina City", DriverId = null,
                    Status = "Pending", PodStatus = "Not Submitted",
                    PackageType = "Parcel", PackageDescription = "Mixed items",
                    ItemCount = 4, Weight = "2.5 kg", DeclaredValue = "₱ 1,500.00", Route = "Marikina City",
                    OrderDate = new DateTime(2026, 3, 26), ExpectedDelivery = new DateTime(2026, 3, 28),
                    EncodedById = encoder.Id, DateEncoded = new DateTime(2026, 3, 26, 10, 0, 0),
                    LastUpdated = new DateTime(2026, 3, 26, 10, 0, 0), UpdatedById = superAdmin.Id
                },
                new() {
                    WaybillNo = "SPX-2026-0829", ClientName = "Shopee Express",
                    ClientType = "Corporate", ContactNumber = "0917-555-9876",
                    SenderAddress = "Caloocan City", RecipientName = "Reyes, Anna",
                    RecipientContact = "0925-888-9999", RecipientAddress = "Caloocan City",
                    Area = "Caloocan City", DriverId = drvConag.Id,
                    Status = "Pending", PodStatus = "Not Submitted",
                    PackageType = "Parcel", PackageDescription = "Beauty products",
                    ItemCount = 2, Weight = "0.8 kg", DeclaredValue = "₱ 950.00", Route = "Caloocan City",
                    OrderDate = new DateTime(2026, 3, 27), ExpectedDelivery = new DateTime(2026, 3, 29),
                    EncodedById = encoder.Id, DateEncoded = new DateTime(2026, 3, 27, 9, 0, 0),
                    LastUpdated = new DateTime(2026, 3, 27, 9, 0, 0), UpdatedById = superAdmin.Id
                },
            };

            await db.DeliveryOrders.AddRangeAsync(orders);
            await db.SaveChangesAsync();

            // ─── Seed Notifications ────────────────────────────────────────────
            var savedOrder801 = await db.DeliveryOrders.FirstAsync(o => o.WaybillNo == "SPX-2026-0801");
            var savedOrder845 = await db.DeliveryOrders.FirstAsync(o => o.WaybillNo == "SPX-2026-0845");
            var savedOrder841 = await db.DeliveryOrders.FirstAsync(o => o.WaybillNo == "SPX-2026-0841");
            var savedOrder829 = await db.DeliveryOrders.FirstAsync(o => o.WaybillNo == "SPX-2026-0829");

            var notifications = new List<Notification>
            {
                new() { Type = "alert",   Title = "Failed Pickup Alert",  WaybillNo = "SPX-2026-0801",
                        Description = "Package not picked up for 3 days. Marikina City. Immediate action required.",
                        Source = "Automated Alert", StatusBadge = "Urgent", DeliveryOrderId = savedOrder801.Id,
                        CreatedAt = new DateTime(2026, 3, 29, 10, 15, 0) },
                new() { Type = "success", Title = "POD Submitted",        WaybillNo = "SPX-2026-0845",
                        Description = "Conag, Reca M. submitted proof of delivery. Delivery auto-marked as Completed.",
                        Source = "Conag, Reca M.", StatusBadge = "Success", DeliveryOrderId = savedOrder845.Id,
                        CreatedAt = new DateTime(2026, 3, 29, 10, 12, 0) },
                new() { Type = "info",    Title = "Status Updated",       WaybillNo = "SPX-2026-0841",
                        Description = "Delivery status changed from Pending → In Transit by Conag, Reca M.",
                        Source = "Conag, Reca M.", StatusBadge = "In Transit", DeliveryOrderId = savedOrder841.Id,
                        CreatedAt = new DateTime(2026, 3, 29, 10, 11, 0) },
                new() { Type = "alert",   Title = "Failed Pickup Alert",  WaybillNo = "SPX-2026-0829",
                        Description = "Package not picked up for 2 days. Caloocan City. Please coordinate with assigned driver.",
                        Source = "Automated Alert", StatusBadge = "Urgent", DeliveryOrderId = savedOrder829.Id,
                        CreatedAt = new DateTime(2026, 3, 29, 10, 0, 0) },
                new() { Type = "system",  Title = "System Notice",
                        Description = "Daily delivery summary generated. 61 deliveries completed. 3 failed pickups. View Reports for full breakdown.",
                        Source = "System", StatusBadge = "System",
                        CreatedAt = new DateTime(2026, 3, 28, 18, 59, 0) },
            };

            await db.Notifications.AddRangeAsync(notifications);

            // ─── Seed Activity Logs ────────────────────────────────────────────
            var activityLogs = new List<ActivityLog>
            {
                new() { EmployeeId = encoder.Id, Action = "Update",
                        Description = "Updated delivery status of SPX-2026-99205 to In Transit",
                        Reference = "SPX-2026-99205", UserRoleSnapshot = "OP. TEAM",
                        Timestamp = new DateTime(2026, 3, 29, 10, 22, 0) },
                new() { EmployeeId = drvConag.Id, Action = "POD Upload",
                        Description = "Uploaded proof of delivery for SPX-2026-99201 — Recipient: J. Santos",
                        Reference = "SPX-2026-99201", UserRoleSnapshot = "DRIVER",
                        Timestamp = new DateTime(2026, 3, 29, 10, 18, 0) },
                new() { EmployeeId = encoder.Id, Action = "Assign",
                        Description = "Assigned driver Panaligan, S. to order SPX-2026-99205",
                        Reference = "SPX-2026-99205", UserRoleSnapshot = "OP. TEAM",
                        Timestamp = new DateTime(2026, 3, 29, 10, 5, 0) },
                new() { EmployeeId = encoder.Id, Action = "Create",
                        Description = "Created new delivery order SPX-2026-99210 for client SM Supermalls",
                        Reference = "SPX-2026-99210", UserRoleSnapshot = "OP. TEAM",
                        Timestamp = new DateTime(2026, 3, 29, 9, 55, 0) },
                new() { EmployeeId = drvConag.Id, Action = "POD Upload",
                        Description = "Uploaded proof of delivery for SPX-2026-99289 — Recipient: L. Tan",
                        Reference = "SPX-2026-99289", UserRoleSnapshot = "DRIVER",
                        Timestamp = new DateTime(2026, 3, 29, 9, 42, 0) },
                new() { EmployeeId = drvPana.Id, Action = "Update",
                        Description = "Updated delivery status of SPX-2026-99187 to Failed Pickup",
                        Reference = "SPX-2026-99187", UserRoleSnapshot = "DRIVER",
                        Timestamp = new DateTime(2026, 3, 29, 9, 30, 0) },
                new() { EmployeeId = superAdmin.Id, Action = "Archive",
                        Description = "Auto-archived completed delivery SPX-2026-99145 — Lazada Philippines",
                        Reference = "SPX-2026-99145", UserRoleSnapshot = "SUPER ADMIN",
                        Timestamp = new DateTime(2026, 3, 29, 9, 14, 0) },
                new() { EmployeeId = drvDumlao.Id, Action = "Login",
                        Description = "User Dumlao, J. logged in to the Delivery Tracker System",
                        UserRoleSnapshot = "DRIVER",
                        Timestamp = new DateTime(2026, 3, 29, 8, 50, 0) },
            };

            await db.ActivityLogs.AddRangeAsync(activityLogs);
            await db.SaveChangesAsync();

            logger.LogInformation("Database seeded successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }
}
