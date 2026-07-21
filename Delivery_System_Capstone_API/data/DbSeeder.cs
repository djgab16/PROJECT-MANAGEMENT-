using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Models;
using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(IApplicationBuilder app)
        {
            using var serviceScope = app.ApplicationServices.CreateScope();
            var context = serviceScope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Force database drop and recreation to apply new tables
            await context.Database.EnsureDeletedAsync();
            await context.Database.EnsureCreatedAsync();

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
                },
                new Employee
                {
                    EmployeeId = "EMP-005",
                    Name = "Gabriel Perez",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "GP",
                    Color = "#E63946"
                },
                new Employee
                {
                    EmployeeId = "EMP-006",
                    Name = "Sarah Jenkins",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "SJ",
                    Color = "#457B9D"
                },
                new Employee
                {
                    EmployeeId = "EMP-007",
                    Name = "Michael Chang",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "MC",
                    Color = "#1D3557"
                },
                new Employee
                {
                    EmployeeId = "EMP-008",
                    Name = "Emily Watson",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "EW",
                    Color = "#F4A261"
                },
                new Employee
                {
                    EmployeeId = "EMP-009",
                    Name = "David Kim",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "DK",
                    Color = "#2A9D8F"
                },
                new Employee
                {
                    EmployeeId = "EMP-010",
                    Name = "Sophia Patel",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "SP",
                    Color = "#E76F51"
                },
                new Employee
                {
                    EmployeeId = "EMP-011",
                    Name = "James O'Connor",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "JO",
                    Color = "#3D5A80"
                },
                new Employee
                {
                    EmployeeId = "EMP-012",
                    Name = "Liam Neeson",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "DRIVER",
                    SystemAccess = "Delivery Tracker",
                    Status = "Active",
                    Initials = "LN",
                    Color = "#9B5DE5"
                },
                new Employee
                {
                    EmployeeId = "LZP-001",
                    Name = "LAZADA PHILIPPINES",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = "CLIENT",
                    SystemAccess = "Client Portal",
                    Status = "Active",
                    Initials = "LP",
                    Color = "#FFB547"
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

            // Get all seeded drivers to allocate tasks dynamically
            var drivers = await context.Employees
                .Where(e => e.Role == "DRIVER")
                .ToListAsync();

            // 2. Seed Delivery Orders (70 records dynamically generated)
            if (!await context.DeliveryOrders.AnyAsync())
            {
                var areas = new[] { "Quezon City", "Caloocan City", "Makati City", "Marikina City", "Pasig City", "Manila", "Taguig City" };
                var routes = new[] { "Quezon City", "Caloocan City", "Makati City", "Marikina City", "Pasig City", "Manila", "Taguig City" };
                var clients = new[] { "Lazada Philippines", "Shopee Express", "Zalora", "Private Client" };
                var clientTypes = new[] { "Corporate", "Corporate", "VIP", "Standard" };
                var priorities = new[] { "High", "Medium", "Low" };
                
                var orders = new List<DeliveryOrder>();
                var baseTime = new DateTime(2026, 7, 21, 0, 0, 0, DateTimeKind.Utc); // consistent baseline date matching current system time

                for (int i = 1; i <= 70; i++)
                {
                    var area = areas[i % areas.Length];
                    var route = routes[i % routes.Length];
                    var client = clients[i % clients.Length];
                    var clientType = clientTypes[i % clients.Length];
                    var priority = priorities[i % priorities.Length];
                    var driver = drivers.Count > 0 ? drivers[i % drivers.Count] : null;

                    string status = "Pending";
                    DateTime? dateCompleted = null;
                    int redeliveries = 0;
                    string failureReason = "";

                    // Distribute statuses across the 70 orders:
                    // 1 to 40: Completed (Delivered)
                    // 41 to 55: In Transit
                    // 56 to 62: Pending
                    // 63 to 66: Failed
                    // 67 to 70: Returned
                    if (i <= 40)
                    {
                        status = "Delivered";
                    }
                    else if (i <= 55)
                    {
                        status = "In Transit";
                    }
                    else if (i <= 62)
                    {
                        status = "Pending";
                    }
                    else if (i <= 66)
                    {
                        status = "Failed";
                        redeliveries = 2;
                        failureReason = "Recipient Unreachable";
                    }
                    else
                    {
                        status = "Returned";
                        redeliveries = 1;
                        failureReason = "Address Incorrect";
                    }

                    // SLA expected calculations based on order dates:
                    // Create varying date spreads in July 2026
                    // SLA expected calculations based on order dates:
                    // Create varying date spreads in July 2026
                    DateTime orderDate;
                    if (status == "Delivered" || status == "Failed" || status == "Returned")
                    {
                        orderDate = baseTime.AddDays(-10 + (i % 8));
                    }
                    else
                    {
                        // Active orders: some are recent (low-risk/healthy), some are old (at-risk/breached)
                        // If i % 3 == 0, make it old (breached)
                        // If i % 3 != 0, make it recent (healthy/low risk)
                        if (i % 3 != 0)
                        {
                            orderDate = baseTime.AddHours(- (i % 12)); // ordered in the last 12 hours
                        }
                        else
                        {
                            orderDate = baseTime.AddDays(-4 - (i % 3)); // ordered 4-6 days ago (breached!)
                        }
                    }
                    int slaHours = priority == "High" ? 24 : priority == "Medium" ? 48 : 72;
                    var expectedDelivery = orderDate.AddHours(slaHours);

                    if (status == "Delivered")
                    {
                        // Deterministic breaches (some delivered late) - distributed evenly across all drivers
                        bool isBreach = (i % 6 == 0 || i % 13 == 0); 
                        var completionTimeHours = isBreach ? (slaHours + 4) : (slaHours - 6);
                        dateCompleted = orderDate.AddHours(completionTimeHours);
                    }
                    else if (status == "Failed" || status == "Returned")
                    {
                        // Failed and returned always complete late to ensure they register as breaches
                        dateCompleted = expectedDelivery.AddHours(3);
                    }

                    var order = new DeliveryOrder
                    {
                        WaybillNo = $"SPX-2026-{i:D4}",
                        ClientName = client,
                        ClientType = clientType,
                        ContactNumber = "0917-123-4567",
                        SenderAddress = "Rockwell Center, Makati City",
                        RecipientName = $"Recipient {i}",
                        RecipientContact = $"0932-{i:D3}-4567",
                        RecipientAddress = $"Unit {100 + i}, Tower {i % 3 + 1}, {area}",
                        Area = area,
                        Route = route,
                        Status = status,
                        Priority = priority,
                        TaskType = "Delivery",
                        PotStatus = status == "Delivered" ? "Submitted" : "Not Submitted",
                        PodStatus = status == "Delivered" ? "Submitted" : "Not Submitted",
                        PodImage = status == "Delivered" ? "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=400" : null,
                        PackageType = "Parcel",
                        PackageDescription = $"Item Description {i}",
                        ItemCount = (i % 4) + 1,
                        Weight = $"{((i % 3) * 1.5 + 0.8):F1} kg",
                        DeclaredValue = $"₱ {((i % 8) * 800 + 400):N2}",
                        OrderDate = orderDate,
                        ExpectedDelivery = expectedDelivery,
                        DateCompleted = dateCompleted,
                        RedeliveryAttemptCount = redeliveries,
                        FailureReason = failureReason,
                        EncodedBy = "Maria Santos",
                        DateEncoded = orderDate.AddMinutes(15),
                        LastUpdated = dateCompleted ?? DateTime.UtcNow,
                        UpdatedBy = driver != null ? driver.Name : "System",
                        DriverId = driver?.Id,
                        RecipientLatitude = 14.5995 + (i * 0.001),
                        RecipientLongitude = 120.9842 + (i * 0.001)
                    };

                    orders.Add(order);
                }

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
                        WaybillNo = "SPX-2026-0001",
                        Description = "Package not picked up for 3 days. Quezon City. Immediate action required.",
                        Timestamp = "10:15 AM",
                        Date = new DateTime(2026, 7, 21, 0, 0, 0, DateTimeKind.Utc),
                        Source = "Automated Alert",
                        Read = false,
                        StatusBadge = "Urgent"
                    },
                    new Notification
                    {
                        Type = "success",
                        Title = "POD Submitted",
                        WaybillNo = "SPX-2026-0002",
                        Description = "Juan Dela Cruz submitted proof of delivery. Delivery auto-marked as Completed.",
                        Timestamp = "10:12 AM",
                        Date = new DateTime(2026, 7, 21, 0, 0, 0, DateTimeKind.Utc),
                        Source = "Juan Dela Cruz",
                        Read = false,
                        StatusBadge = "Success"
                    },
                    new Notification
                    {
                        Type = "info",
                        Title = "Status Updated",
                        WaybillNo = "SPX-2026-0003",
                        Description = "Delivery status changed from Pending → In Transit by Juan Dela Cruz.",
                        Timestamp = "10:11 AM",
                        Date = new DateTime(2026, 7, 21, 0, 0, 0, DateTimeKind.Utc),
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
                        Timestamp = new DateTime(2026, 3, 29, 10, 22, 0, DateTimeKind.Utc),
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

            // Run initial predictions automatically on startup
            var predictionService = serviceScope.ServiceProvider.GetRequiredService<IPredictionService>();
            await predictionService.RunPredictionsAsync();
        }
    }
}
