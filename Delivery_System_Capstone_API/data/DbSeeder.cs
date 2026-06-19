using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(IApplicationBuilder app)
        {
            using var serviceScope = app.ApplicationServices.CreateScope();
            var context = serviceScope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Apply EF Core migrations. The existing database already has __EFMigrationsHistory
            // recording InitialCreate, so this is a no-op on it (data preserved); a fresh database
            // is built correctly from the migrations instead of EnsureCreated (which bypasses them).
            await context.Database.MigrateAsync();

            // 1. Seed Employees
            // 1. Seed Employees (Idempotent / Upsert)
            var seedEmployees = new List<Employee>
            {
                new Employee
                {
                    EmployeeId = "EMP-001",
                    Name = "Carlos Mendoza",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "ADMIN",
                    SystemAccess = "All Systems",
                    Status = "Active",
                    Initials = "CM",
                    Color = "#FFB547"
                },
                new Employee
                {
                    EmployeeId = "EMP-002",
                    Name = "Maria Santos",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "OP. TEAM",
                    SystemAccess = "Operations",
                    Status = "Active",
                    Initials = "MS",
                    Color = "#01B574"
                },
                new Employee
                {
                    EmployeeId = "EMP-003",
                    Name = "Juan Dela Cruz",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "JD",
                    Color = "#00A99D"
                },
                new Employee
                {
                    EmployeeId = "EMP-004",
                    Name = "Alex Rodriguez",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "AR",
                    Color = "#7C3AED"
                }
            };

            foreach (var se in seedEmployees)
            {
                var existing = await context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == se.EmployeeId);
                if (existing == null)
                {
                    await context.Employees.AddAsync(se);
                }
                else
                {
                    existing.Name = se.Name;
                    existing.Initials = se.Initials;
                    existing.Color = se.Color;
                    context.Employees.Update(existing);
                }
            }
            await context.SaveChangesAsync();

            // Get driver references for foreign keys
            var driver = await context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == "EMP-003");

            // 2. Seed Delivery Orders
            if (!await context.DeliveryOrders.AnyAsync())
            {
                var orders = new List<DeliveryOrder>
                {
                    new DeliveryOrder
                    {
                        WaybillNo = "SPX-2026-0841",
                        ClientName = "Lazada Philippines",
                        ClientType = "Corporate",
                        ContactNumber = "0917-123-4567",
                        SenderAddress = "Rockwell Dr., Brgy. Poblacion, Makati City, Metro Manila",
                        RecipientName = "Dela Cruz, Maria",
                        RecipientContact = "0932-987-6543",
                        RecipientAddress = "142 Roces Ave., Brgy. Paligsahan, Quezon City",
                        Area = "Quezon City",
                        Landmark = "Near Sct. Alcaraz St.",
                        Route = "Quezon City",
                        Status = "In Transit",
                        TaskType = "Delivery",
                        PotStatus = "Not Submitted",
                        PodStatus = "Not Submitted",
                        PackageType = "Parcel",
                        PackageDescription = "Electronics — Shopee order #LZD-88201",
                        ItemCount = 2,
                        Weight = "1.2 kg",
                        DeclaredValue = "₱ 2,500.00",
                        SpecialInstructions = "Fragile, handle with care",
                        OrderDate = "March 29, 2026",
                        ExpectedDelivery = "March 31, 2026",
                        EncodedBy = "Kenneth D. Yulip",
                        DateEncoded = "3/29/2026, 8:05:00 AM",
                        LastUpdated = "3/29/2026, 9:41:00 AM",
                        UpdatedBy = "Juan Dela Cruz",
                        LiveLatitude = 14.6200,
                        LiveLongitude = 121.0180,
                        LastLiveUpdate = DateTime.UtcNow.ToString("g"),
                        RecipientLatitude = 14.6360,
                        RecipientLongitude = 121.0336,
                        DriverId = driver?.Id
                    },
                    new DeliveryOrder
                    {
                        WaybillNo = "SPX-2026-0845",
                        ClientName = "Lazada Philippines",
                        ClientType = "Corporate",
                        ContactNumber = "0917-123-4567",
                        SenderAddress = "Rockwell Dr., Brgy. Poblacion, Makati City",
                        RecipientName = "Ocampo, Cecilia",
                        RecipientContact = "0918-555-1234",
                        RecipientAddress = "Brgy. Sta. Mesa Heights, QC",
                        Area = "Caloocan City",
                        Route = "Caloocan City",
                        Status = "Pending",
                        TaskType = "Delivery",
                        PotStatus = "Not Submitted",
                        PodStatus = "Not Submitted",
                        PackageType = "Parcel",
                        PackageDescription = "Fashion accessories",
                        ItemCount = 1,
                        Weight = "0.5 kg",
                        DeclaredValue = "₱ 890.00",
                        OrderDate = "March 29, 2026",
                        ExpectedDelivery = "March 30, 2026",
                        EncodedBy = "Kenneth D. Yulip",
                        DateEncoded = "3/29/2026, 8:10:00 AM",
                        LastUpdated = "3/29/2026, 8:10:00 AM",
                        UpdatedBy = "Kenneth D. Yulip",
                        RecipientLatitude = 14.6288,
                        RecipientLongitude = 121.0028,
                        DriverId = driver?.Id
                    },
                    new DeliveryOrder
                    {
                        WaybillNo = "SPX-2026-0812",
                        ClientName = "Shopee Express",
                        ClientType = "Corporate",
                        ContactNumber = "0917-555-9876",
                        SenderAddress = "Ayala Ave., Makati City",
                        RecipientName = "Santos, Jose",
                        RecipientContact = "0920-111-2222",
                        RecipientAddress = "Ayala Ave., Makati",
                        Area = "Makati City",
                        Route = "Makati City",
                        Status = "Delivered",
                        TaskType = "Delivery",
                        PotStatus = "Submitted",
                        PodStatus = "Submitted",
                        PackageType = "Parcel",
                        PackageDescription = "Home appliance",
                        ItemCount = 1,
                        Weight = "3.2 kg",
                        DeclaredValue = "₱ 4,500.00",
                        OrderDate = "March 28, 2026",
                        ExpectedDelivery = "March 29, 2026",
                        DateCompleted = "3/28/2026, 2:14:00 PM",
                        EncodedBy = "Kenneth D. Yulip",
                        DateEncoded = "3/28/2026, 7:00:00 AM",
                        LastUpdated = "3/28/2026, 2:14:00 PM",
                        UpdatedBy = "Juan Dela Cruz",
                        LiveLatitude = 14.5547,
                        LiveLongitude = 121.0244,
                        LastLiveUpdate = "3/28/2026, 2:14:00 PM",
                        RecipientLatitude = 14.5547,
                        RecipientLongitude = 121.0244,
                        PodImage = "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=400",
                        DriverId = driver?.Id
                    },
                    new DeliveryOrder
                    {
                        WaybillNo = "SPX-2026-0801",
                        ClientName = "Shopee Express",
                        ClientType = "Corporate",
                        ContactNumber = "0917-555-9876",
                        SenderAddress = "Marikina City",
                        RecipientName = "Torres, Miguel",
                        RecipientContact = "0924-666-7777",
                        RecipientAddress = "Marikina City",
                        Area = "Marikina City",
                        Route = "Marikina City",
                        Status = "Pending",
                        TaskType = "Pickup",
                        PotStatus = "Not Submitted",
                        PodStatus = "Not Submitted",
                        PackageType = "Parcel",
                        PackageDescription = "Mixed items",
                        ItemCount = 4,
                        Weight = "2.5 kg",
                        DeclaredValue = "₱ 1,500.00",
                        OrderDate = "March 26, 2026",
                        ExpectedDelivery = "March 28, 2026",
                        EncodedBy = "Kenneth D. Yulip",
                        DateEncoded = "3/26/2026, 10:00:00 AM",
                        LastUpdated = "3/26/2026, 10:00:00 AM",
                        UpdatedBy = "Kenneth D. Yulip",
                        RecipientLatitude = 14.6299,
                        RecipientLongitude = 121.1001,
                        DriverId = null
                    }
                };

                await context.DeliveryOrders.AddRangeAsync(orders);
                await context.SaveChangesAsync();
            }

            // 3. Seed Notifications
            if (!await context.Notifications.AnyAsync())
            {
                var notifications = new List<Notification>
                {
                    new Notification
                    {
                        Type = "alert",
                        Title = "Failed Pickup Alert",
                        WaybillNo = "SPX-2026-0801",
                        Description = "Package not picked up for 3 days. Marikina City. Immediate action required.",
                        Timestamp = "10:15 AM",
                        Date = "3/29/2026",
                        Source = "Automated Alert",
                        Read = false,
                        StatusBadge = "Urgent"
                    },
                    new Notification
                    {
                        Type = "success",
                        Title = "POD Submitted",
                        WaybillNo = "SPX-2026-0845",
                        Description = "Juan Dela Cruz submitted proof of delivery. Delivery auto-marked as Completed.",
                        Timestamp = "10:12 AM",
                        Date = "3/29/2026",
                        Source = "Juan Dela Cruz",
                        Read = false,
                        StatusBadge = "Success"
                    },
                    new Notification
                    {
                        Type = "info",
                        Title = "Status Updated",
                        WaybillNo = "SPX-2026-0841",
                        Description = "Delivery status changed from Pending → In Transit by Juan Dela Cruz.",
                        Timestamp = "10:11 AM",
                        Date = "3/29/2026",
                        Source = "Juan Dela Cruz",
                        Read = false,
                        StatusBadge = "In Transit"
                    }
                };

                await context.Notifications.AddRangeAsync(notifications);
                await context.SaveChangesAsync();
            }

            // 4. Seed Activity Logs
            if (!await context.ActivityLogs.AnyAsync())
            {
                var logs = new List<ActivityLog>
                {
                    new ActivityLog
                    {
                        Timestamp = "3/29/2026, 10:22:00 AM",
                        UserName = "Juan Dela Cruz",
                        UserRole = "DRIVER",
                        UserInitials = "JD",
                        UserColor = "#00A99D",
                        Action = "Update",
                        Description = "started transit for SPX-2026-0841",
                        Reference = "SPX-2026-0841"
                    }
                };

                await context.ActivityLogs.AddRangeAsync(logs);
                await context.SaveChangesAsync();
            }
        }
    }
}
