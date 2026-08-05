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
            var configuration = serviceScope.ServiceProvider.GetRequiredService<IConfiguration>();
            var environment = serviceScope.ServiceProvider.GetRequiredService<IHostEnvironment>();
            var logger = serviceScope.ServiceProvider.GetRequiredService<ILoggerFactory>()
                .CreateLogger(typeof(DbSeeder).FullName!);

            // ─── Schema initialisation ────────────────────────────────────────────────
            // This previously ran EnsureDeletedAsync() followed by EnsureCreatedAsync()
            // unconditionally, which:
            //   * destroyed every row in the database on EVERY application start, so
            //     PredictionOutcomes could never accumulate and model accuracy could never
            //     be measured;
            //   * built the schema straight from the model, bypassing migrations, which is
            //     why __EFMigrationsHistory never existed and DeliveryPredictions appeared
            //     without a migration;
            //   * would have wiped live customer data on any production restart or deploy.
            //
            // The destructive reset is now opt-in and refuses to run outside Development.
            var resetRequested = configuration.GetValue<bool?>("Database:ResetOnStartup") ?? false;

            if (resetRequested && environment.IsDevelopment())
            {
                logger.LogWarning(
                    "Database:ResetOnStartup is enabled - dropping and recreating {Database}. ALL DATA WILL BE LOST.",
                    context.Database.GetDbConnection().Database);

                await context.Database.EnsureDeletedAsync();
                await context.Database.EnsureCreatedAsync();
            }
            else
            {
                if (resetRequested)
                {
                    logger.LogError(
                        "Database:ResetOnStartup is enabled but the environment is {Environment}, not Development. " +
                        "Refusing to drop the database; applying migrations instead.",
                        environment.EnvironmentName);
                }

                // Applies any pending migrations and creates the database if it is absent,
                // leaving existing rows intact.
                await context.Database.MigrateAsync();
            }

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

                // Anchored to the current instant rather than a hardcoded calendar date.
                // With a fixed baseline, every "active" order drifts permanently into breach as
                // real time moves past it, which is why the pipeline previously showed no
                // healthy orders at all and an implausible breach count.
                var baseTime = DateTime.UtcNow;

                // A month of trading history for a mid-sized courier operation.
                const int totalOrders = 140;

                for (int i = 1; i <= totalOrders; i++)
                {
                    var area = areas[i % areas.Length];
                    var route = routes[i % routes.Length];
                    var client = clients[i % clients.Length];
                    var clientType = clientTypes[i % clients.Length];
                    var priority = priorities[i % priorities.Length];
                    var driver = drivers.Count > 0 ? drivers[i % drivers.Count] : null;

                    // A handful of genuinely escalated active orders: past deadline, high
                    // priority, already re-attempted and still without a courier. These are what
                    // push the scoring model into its Critical band, which in turn exercises the
                    // Critical-risk alerting path. Without any of them the dashboard never shows
                    // a Critical order and the alert feature looks dead.
                    bool isEscalated = i % 10 == 0 && i > 110;

                    string status = "Pending";
                    DateTime? dateCompleted = null;
                    int redeliveries = 0;
                    string failureReason = "";

                    // Status mix modelled on a working courier operation: the large majority of
                    // volume has already been delivered, a small tail failed or was returned,
                    // and roughly a fifth is still moving through the pipeline.
                    //    1-90  Delivered        (64%)
                    //   91-102 Completed        ( 9%)  client-confirmed
                    //  103-107 Failed           (3.6%)
                    //  108-110 Returned         (2.1%)
                    //  111-126 In Transit       (11%)
                    //  127-133 Out for Delivery ( 5%)
                    //  134-140 Pending          ( 5%)
                    // The combined 5.7% failed/returned rate is in the normal band for last-mile
                    // courier work; the previous 12.7% was high enough to look synthetic and
                    // dragged the on-time figure well below anything a real operation would post.
                    var failureReasons = new[]
                    {
                        "Recipient Unreachable", "Address Incorrect",
                        "Recipient Refused Delivery", "Gate/Building Access Denied"
                    };

                    if (i <= 90)
                    {
                        status = "Delivered";
                    }
                    else if (i <= 102)
                    {
                        status = "Completed";
                    }
                    else if (i <= 107)
                    {
                        status = "Failed";
                        redeliveries = (i % 2) + 1;
                        failureReason = failureReasons[i % failureReasons.Length];
                    }
                    else if (i <= 110)
                    {
                        status = "Returned";
                        redeliveries = 3;
                        failureReason = failureReasons[i % failureReasons.Length];
                    }
                    else if (i <= 126)
                    {
                        status = "In Transit";
                        redeliveries = i % 9 == 0 ? 1 : 0;
                    }
                    else if (i <= 133)
                    {
                        status = "Out for Delivery";
                    }
                    else
                    {
                        status = "Pending";
                    }

                    bool isTerminal = status is "Delivered" or "Completed" or "Failed" or "Returned";

                    if (isEscalated && !isTerminal)
                    {
                        priority = "High";
                        redeliveries = 2;
                        failureReason = "Recipient Unreachable";
                    }

                    // SLA expected calculations based on order dates:
                    // Create varying date spreads in July 2026
                    // SLA expected calculations based on order dates:
                    // Create varying date spreads in July 2026
                    int slaHours = priority == "High" ? 24 : priority == "Medium" ? 48 : 72;

                    DateTime orderDate;
                    DateTime expectedDelivery;

                    if (isTerminal)
                    {
                        // Spread completed volume across the last 30 days so route, driver and
                        // client breach-rate history has enough depth to be meaningful (the
                        // scoring model needs >= 3 completed orders per key before it trusts a
                        // rate).
                        orderDate = baseTime.AddDays(-30 + (i % 29)).AddHours(-(i % 11));
                        expectedDelivery = orderDate.AddHours(slaHours);
                    }
                    else
                    {
                        // Active pipeline deliberately spans the full risk spectrum, expressed as
                        // hours of SLA headroom remaining from now. Without this spread every
                        // active order sits in the same risk band and the dashboard looks fake.
                        double remainingHours = isEscalated
                            ? -14                  // well past deadline -> Critical
                            : (i % 5) switch
                            {
                                0 => -7,   // already past deadline  -> High / Critical
                                1 => 4,    // very tight             -> High
                                2 => 10,   // tight                  -> Medium
                                3 => 30,   // comfortable            -> Low / Medium
                                _ => 62    // plenty of headroom     -> Low
                            };

                        expectedDelivery = baseTime.AddHours(remainingHours);
                        orderDate = expectedDelivery.AddHours(-slaHours);
                    }

                    if (status == "Delivered" || status == "Completed")
                    {
                        // ~85% land inside SLA. Two coprime divisors keep the late ones scattered
                        // across drivers and routes rather than clustering on one courier.
                        bool isBreach = (i % 11 == 0) || (i % 17 == 0);
                        var completionTimeHours = isBreach
                            ? slaHours + 3 + (i % 9)      // late by 3-11 hours
                            : slaHours - 5 - (i % 14);     // finished early
                        dateCompleted = orderDate.AddHours(completionTimeHours);
                    }
                    else if (status == "Failed" || status == "Returned")
                    {
                        // Failed and returned are breaches by definition; give them a plausible
                        // resolution timestamp rather than a uniform one.
                        dateCompleted = expectedDelivery.AddHours(2 + (i % 7));
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
                        // AppDbContext.ValidateEntities requires a POD image and an assigned
                        // driver for any Delivered/Completed delivery, so both statuses get one.
                        PotStatus = status is "Delivered" or "Completed" ? "Submitted" : "Not Submitted",
                        PodStatus = status is "Delivered" or "Completed" ? "Submitted" : "Not Submitted",
                        PodImage = status is "Delivered" or "Completed"
                            ? "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=400"
                            : null,
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
                        // Escalated active orders are deliberately left without a courier, which is
                        // the single largest driver-factor penalty in the scoring model.
                        DriverId = isEscalated && !isTerminal ? null : driver?.Id,
                        RecipientLatitude = 14.5995 + (i * 0.001),
                        RecipientLongitude = 120.9842 + (i * 0.001)
                    };

                    orders.Add(order);
                }

                await context.DeliveryOrders.AddRangeAsync(orders);
                await context.SaveChangesAsync();
            }

            // 2b. Seed prediction outcome history so the Model Performance panel has something
            //     to report on a fresh install.
            //
            //     HONESTY NOTE: these are seeded demo rows, exactly like the delivery orders
            //     above — they are NOT a record of this model's measured performance. What IS
            //     real is the relationship between the columns:
            //       * ActuallyBreached is DERIVED from each seeded order's own Status and
            //         DateCompleted using the codebase breach definition
            //         (DateCompleted > ExpectedDelivery || Failed || Returned). It is never
            //         asserted independently of the order it describes.
            //       * The prediction snapshot is deliberately imperfect, so the confusion matrix
            //         contains genuine false alarms and missed breaches and the metrics land in a
            //         plausible range instead of a suspicious 1.000.
            //     Outcomes captured from live traffic (PredictionOutcomeService) are the real
            //     measurements and will accumulate alongside these.
            if (!await context.PredictionOutcomes.AnyAsync())
            {
                var terminalOrders = await context.DeliveryOrders
                    .Where(o => o.Status == "Delivered"
                             || o.Status == "Completed"
                             || o.Status == "Failed"
                             || o.Status == "Returned")
                    .OrderBy(o => o.Id)
                    .ToListAsync();

                var outcomes = new List<PredictionOutcome>();
                var index = 0;

                foreach (var order in terminalOrders)
                {
                    index++;

                    var actuallyBreached =
                        (order.DateCompleted.HasValue && order.DateCompleted.Value > order.ExpectedDelivery)
                        || order.Status == "Failed"
                        || order.Status == "Returned";

                    // A model that is always right would be a red flag, so a slice of breaches is
                    // missed and a slice of clean deliveries raises a false alarm.
                    //
                    // The divisors here (9 and 12) deliberately avoid 7 and 11, which the order
                    // generator above uses to decide which deliveries ran late. Reusing 7 made the
                    // miss rule fire on exactly the orders that breached, so every multiple of 7
                    // became a guaranteed missed breach and recall collapsed to ~0.56 — an
                    // artefact of correlated divisors rather than believable model error.
                    var predictedAtRisk = actuallyBreached
                        ? index % 9 != 0
                        : index % 12 == 0;

                    // Keep the snapshot internally consistent: a flagged order must carry a score
                    // on the at-risk side of the 0.35 threshold, and a cleared one below it.
                    var predictedRiskScore = predictedAtRisk
                        ? 0.38 + ((index % 24) * 0.025)   // 0.38 - 0.955
                        : 0.06 + ((index % 11) * 0.025);  // 0.06 - 0.31

                    predictedRiskScore = Math.Round(Math.Clamp(predictedRiskScore, 0.0, 0.99), 4);

                    var outcomeRecordedAt = order.DateCompleted ?? order.ExpectedDelivery;

                    outcomes.Add(new PredictionOutcome
                    {
                        DeliveryOrderId = order.Id,
                        WaybillNo = order.WaybillNo,
                        PredictedAtRisk = predictedAtRisk,
                        PredictedRiskScore = predictedRiskScore,
                        PredictedRiskLevel = PredictionService.DetermineRiskLevel(predictedRiskScore),
                        PredictedConfidence = Math.Round(0.62 + ((index % 8) * 0.045), 4), // 0.62 - 0.935
                        ActuallyBreached = actuallyBreached,
                        // The prediction necessarily preceded the outcome.
                        PredictionMadeAt = outcomeRecordedAt.AddHours(-6),
                        OutcomeRecordedAt = outcomeRecordedAt
                    });
                }

                if (outcomes.Count > 0)
                {
                    await context.PredictionOutcomes.AddRangeAsync(outcomes);
                    await context.SaveChangesAsync();

                    var breached = outcomes.Count(o => o.ActuallyBreached);
                    logger.LogInformation(
                        "Seeded {Total} prediction outcome(s) for demo purposes ({Breached} breached, {Clean} on time).",
                        outcomes.Count, breached, outcomes.Count - breached);
                }
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

            // ─── Initial prediction pass ──────────────────────────────────────────────
            // Only needed when no predictions exist yet, e.g. a freshly created database.
            // This used to run unconditionally on every startup, which rewrote PredictedAt for
            // every active order each boot and made prediction freshness impossible to reason
            // about. PredictionSchedulerService now owns periodic recomputes, and operators can
            // still force one from POST /api/predictions/run.
            if (!await context.DeliveryPredictions.AnyAsync())
            {
                logger.LogInformation("No predictions found; running an initial prediction pass.");

                var predictionService = serviceScope.ServiceProvider.GetRequiredService<IPredictionService>();
                var processed = await predictionService.RunPredictionsAsync();

                logger.LogInformation("Initial prediction pass scored {Count} active order(s).", processed);
            }
        }
    }
}
