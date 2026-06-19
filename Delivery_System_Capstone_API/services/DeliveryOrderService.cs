using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services
{
    public class DeliveryOrderService : IDeliveryOrderService
    {
        private readonly AppDbContext _context;

        public DeliveryOrderService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<DeliveryOrder>> GetAllOrdersAsync()
        {
            await AutoExpireReadyPickupsAsync();
            var orders = await _context.DeliveryOrders.Include(o => o.Driver).ToListAsync();
            foreach (var order in orders)
            {
                PopulateVirtualCoordinates(order);
            }
            return orders;
        }

        public async Task<DeliveryOrder?> GetOrderByIdAsync(int id)
        {
            var order = await _context.DeliveryOrders.Include(o => o.Driver).FirstOrDefaultAsync(o => o.Id == id);
            if (order != null && order.Status == "Ready for Pickup")
            {
                if (DateTime.TryParse(order.LastUpdated, out var lastUpdated) && (DateTime.UtcNow - lastUpdated) > TimeSpan.FromDays(5))
                {
                    await AutoExpireReadyPickupsAsync();
                    // Refetch
                    order = await _context.DeliveryOrders.Include(o => o.Driver).FirstOrDefaultAsync(o => o.Id == id);
                }
            }
            if (order != null)
            {
                PopulateVirtualCoordinates(order);
            }
            return order;
        }

        private void PopulateVirtualCoordinates(DeliveryOrder order)
        {
            if (order == null) return;
            if (order.RecipientLatitude.HasValue && order.RecipientLongitude.HasValue)
            {
                order.RecipientCoordinates = new CoordinateModel
                {
                    Lat = order.RecipientLatitude.Value,
                    Lng = order.RecipientLongitude.Value
                };
            }
            if (order.LiveLatitude.HasValue && order.LiveLongitude.HasValue)
            {
                order.LiveCoordinates = new LiveCoordinateModel
                {
                    Lat = order.LiveLatitude.Value,
                    Lng = order.LiveLongitude.Value,
                    LastUpdated = order.LastLiveUpdate ?? order.LastUpdated
                };
            }
        }

        private void SyncAndStructureAddresses(DeliveryOrder order)
        {
            // 1. Sender Address
            if (!string.IsNullOrWhiteSpace(order.SenderAddress) && 
                string.IsNullOrWhiteSpace(order.SenderStreet) && 
                string.IsNullOrWhiteSpace(order.SenderBarangay) && 
                string.IsNullOrWhiteSpace(order.SenderCity))
            {
                var parts = order.SenderAddress.Split(',').Select(p => p.Trim()).ToList();
                if (parts.Count >= 4)
                {
                    order.SenderUnit = parts[0];
                    order.SenderStreet = parts[1];
                    order.SenderBarangay = parts[2];
                    order.SenderCity = string.Join(", ", parts.Skip(3));
                }
                else if (parts.Count == 3)
                {
                    order.SenderStreet = parts[0];
                    order.SenderBarangay = parts[1];
                    order.SenderCity = parts[2];
                }
                else if (parts.Count == 2)
                {
                    order.SenderStreet = parts[0];
                    order.SenderCity = parts[1];
                }
                else if (parts.Count == 1)
                {
                    order.SenderStreet = parts[0];
                }
            }
            else
            {
                var senderParts = new[] { order.SenderUnit, order.SenderStreet, order.SenderBarangay, order.SenderCity }
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Select(s => s!.Trim());
                if (senderParts.Any())
                {
                    order.SenderAddress = string.Join(", ", senderParts);
                }
            }

            // 2. Recipient Address
            if (!string.IsNullOrWhiteSpace(order.RecipientAddress) && 
                string.IsNullOrWhiteSpace(order.RecipientStreet) && 
                string.IsNullOrWhiteSpace(order.RecipientBarangay) && 
                string.IsNullOrWhiteSpace(order.RecipientCity))
            {
                var parts = order.RecipientAddress.Split(',').Select(p => p.Trim()).ToList();
                var remainingParts = new List<string>(parts);
                if (remainingParts.Count > 0 && !string.IsNullOrWhiteSpace(order.Area) && 
                    remainingParts.Last().Equals(order.Area.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    order.RecipientCity = remainingParts.Last();
                    remainingParts.RemoveAt(remainingParts.Count - 1);
                }

                if (remainingParts.Count >= 3)
                {
                    order.RecipientUnit = remainingParts[0];
                    order.RecipientStreet = remainingParts[1];
                    order.RecipientBarangay = string.Join(", ", remainingParts.Skip(2));
                }
                else if (remainingParts.Count == 2)
                {
                    order.RecipientStreet = remainingParts[0];
                    order.RecipientBarangay = remainingParts[1];
                }
                else if (remainingParts.Count == 1)
                {
                    order.RecipientStreet = remainingParts[0];
                }

                if (string.IsNullOrWhiteSpace(order.RecipientCity))
                {
                    order.RecipientCity = order.Area;
                }
            }
            else
            {
                var recipientParts = new[] { order.RecipientUnit, order.RecipientStreet, order.RecipientBarangay, order.RecipientCity }
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Select(s => s!.Trim());
                if (recipientParts.Any())
                {
                    order.RecipientAddress = string.Join(", ", recipientParts);
                }
            }
        }

        private void ValidateOrderDetails(DeliveryOrder order)
        {
            SyncAndStructureAddresses(order);

            if (string.IsNullOrWhiteSpace(order.ClientName))
                throw new ArgumentException("Client Name is required.");

            if (string.IsNullOrWhiteSpace(order.RecipientName))
                throw new ArgumentException("Recipient Name is required.");

            if (string.IsNullOrWhiteSpace(order.RecipientContact))
                throw new ArgumentException("Recipient Contact Number is required.");

            var contactClean = new string(order.RecipientContact.Where(char.IsDigit).ToArray());
            if (contactClean.Length < 7 || contactClean.Length > 15)
                throw new ArgumentException("Recipient Contact must be a valid phone number containing between 7 and 15 digits.");

            if (!string.IsNullOrEmpty(order.ContactNumber))
            {
                var senderContactClean = new string(order.ContactNumber.Where(char.IsDigit).ToArray());
                if (senderContactClean.Length < 7 || senderContactClean.Length > 15)
                    throw new ArgumentException("Sender Contact must be a valid phone number containing between 7 and 15 digits.");
            }

            if (string.IsNullOrWhiteSpace(order.SenderAddress))
                throw new ArgumentException("Sender Address is required.");

            if (string.IsNullOrWhiteSpace(order.RecipientAddress))
                throw new ArgumentException("Recipient Address is required.");

            if (string.IsNullOrWhiteSpace(order.PackageType))
                throw new ArgumentException("Package Type is required.");

            if (order.ItemCount <= 0)
                throw new ArgumentException("Item Count must be at least 1.");

            if (string.IsNullOrWhiteSpace(order.Weight))
            {
                throw new ArgumentException("Weight is required.");
            }
            else
            {
                if (order.Weight.Contains('-'))
                    throw new ArgumentException("Weight cannot be negative.");

                var weightStr = new string(order.Weight.Where(c => char.IsDigit(c) || c == '.').ToArray());
                if (double.TryParse(weightStr, out var w))
                {
                    if (w <= 0)
                        throw new ArgumentException("Weight must be greater than 0.");
                    if (w > 1000)
                        throw new ArgumentException("Weight cannot exceed 1000 kg.");
                }
                else
                {
                    throw new ArgumentException("Weight must be a valid numeric value (e.g., '1.5 kg').");
                }
            }

            if (!string.IsNullOrEmpty(order.DeclaredValue))
            {
                if (order.DeclaredValue.Contains('-'))
                    throw new ArgumentException("Declared Value cannot be negative.");

                var valStr = new string(order.DeclaredValue.Where(c => char.IsDigit(c) || c == '.').ToArray());
                if (double.TryParse(valStr, out var v))
                {
                    if (v < 0)
                        throw new ArgumentException("Declared Value cannot be negative.");
                }
            }

            DateTime orderDate;
            if (!DateTime.TryParse(order.OrderDate, out orderDate))
            {
                orderDate = DateTime.UtcNow;
            }

            if (!DateTime.TryParse(order.ExpectedDelivery, out var expectedDate))
            {
                throw new ArgumentException("Expected Delivery must be a valid date.");
            }

            if (expectedDate.Date < orderDate.Date)
            {
                throw new ArgumentException("Expected Delivery Date cannot be before the Order Date.");
            }

            if (expectedDate.Year != orderDate.Year)
            {
                throw new ArgumentException($"Expected Delivery Year ({expectedDate.Year}) must match the Order Date Year ({orderDate.Year}).");
            }

            int currentYear = DateTime.UtcNow.Year;
            if (orderDate.Year > currentYear)
            {
                throw new ArgumentException($"Order Date Year ({orderDate.Year}) cannot be in the future (current year is {currentYear}).");
            }

            if (expectedDate.Year > currentYear)
            {
                throw new ArgumentException($"Expected Delivery Year ({expectedDate.Year}) cannot be in the future (current year is {currentYear}).");
            }
        }

        private async Task AutoExpireReadyPickupsAsync()
        {
            var threshold = DateTime.UtcNow.AddDays(-5);
            var ordersToExpire = await _context.DeliveryOrders
                .Where(o => o.Status == "Ready for Pickup")
                .ToListAsync();

            var expiredCount = 0;
            foreach (var order in ordersToExpire)
            {
                if (DateTime.TryParse(order.LastUpdated, out var lastUpdated) && lastUpdated < threshold)
                {
                    order.Status = "Failed";
                    order.IsArchived = true;
                    order.CompletedAt = DateTime.UtcNow.ToString("O");
                    order.DateCompleted = DateTime.UtcNow.ToString("O");
                    order.ArchivedReason = "Holding Period Expired";
                    order.FailureReason = "Holding Period Expired";
                    order.FailureRemarks = "Package not claimed within 5 days holding period. Sent to return processing.";
                    order.LastUpdated = DateTime.UtcNow.ToString("O");
                    order.UpdatedBy = "System Scheduler";

                    var historyLog = new DeliveryHistoryLog
                    {
                        DeliveryOrderId = order.Id,
                        FromStatus = "Ready for Pickup",
                        ToStatus = "Failed",
                        Notes = "Holding period expired. Auto-failed.",
                        ChangedBy = "System Scheduler",
                        ChangedAt = DateTime.UtcNow.ToString("O")
                    };
                    await _context.DeliveryHistoryLogs.AddAsync(historyLog);

                    var activityLog = new ActivityLog
                    {
                        Timestamp = DateTime.UtcNow.ToString("O"),
                        UserName = "System Scheduler",
                        UserRole = "ADMIN",
                        UserInitials = "SS",
                        UserColor = "#EF4444",
                        Action = "Update",
                        Description = $"Auto-expired unclaimed pickup order {order.WaybillNo} after 5 days",
                        Reference = order.WaybillNo
                    };
                    await _context.ActivityLogs.AddAsync(activityLog);

                    var notification = new Notification
                    {
                        Type = "alert",
                        Title = "Pickup Order Expired",
                        WaybillNo = order.WaybillNo,
                        Description = $"Pickup order {order.WaybillNo} was not claimed within 5 days. Transitioned to Failed for return processing.",
                        Timestamp = DateTime.UtcNow.ToString("t"),
                        Date = DateTime.UtcNow.ToString("MM/dd/yyyy"),
                        Source = "System Scheduler",
                        Read = false,
                        StatusBadge = "Expired"
                    };
                    await _context.Notifications.AddAsync(notification);

                    expiredCount++;
                }
            }

            if (expiredCount > 0)
            {
                await _context.SaveChangesAsync();
            }
        }

        public async Task<DeliveryOrder> CreateOrderAsync(DeliveryOrder order)
        {
            ValidateOrderDetails(order);

            if (order.RecipientCoordinates != null)
            {
                order.RecipientLatitude = order.RecipientCoordinates.Lat;
                order.RecipientLongitude = order.RecipientCoordinates.Lng;
            }

            if (order.TaskType == "Pickup")
            {
                order.Area = "Manila";
                order.Route = "Manila";
                if (order.DriverId.HasValue && order.DriverId.Value > 0)
                {
                    throw new InvalidOperationException("Driver assignment is disabled for Office Pickup orders.");
                }
                order.DriverId = null;
            }

            order.Status = "Pending";
            order.PotStatus = order.PotStatus ?? "Not Submitted";
            order.PodStatus = "Not Submitted";
            order.IsArchived = false;
            order.DateEncoded = DateTime.UtcNow.ToString("O");
            order.LastUpdated = DateTime.UtcNow.ToString("O");
            // Auto-populate Route from Area if not provided
            if (string.IsNullOrWhiteSpace(order.Route))
                order.Route = order.Area;

            // Generate a unique waybill number or validate the client-supplied one.
            // This prevents duplicate keys and ensures clean validation feedback.
            var year = DateTime.UtcNow.Year;
            if (string.IsNullOrWhiteSpace(order.WaybillNo) || !order.WaybillNo.StartsWith($"WB-{year}"))
            {
                int seq = 1;
                var lastOrder = await _context.DeliveryOrders
                    .Where(o => o.WaybillNo.StartsWith($"WB-{year}-"))
                    .OrderByDescending(o => o.WaybillNo)
                    .FirstOrDefaultAsync();

                if (lastOrder != null)
                {
                    var lastWaybill = lastOrder.WaybillNo;
                    var parts = lastWaybill.Split('-');
                    if (parts.Length == 3 && int.TryParse(parts[2], out var lastSeq))
                    {
                        seq = lastSeq + 1;
                    }
                }

                string generatedWaybill;
                do
                {
                    generatedWaybill = $"WB-{year}-{seq:D6}";
                    seq++;
                } while (await _context.DeliveryOrders.AnyAsync(o => o.WaybillNo == generatedWaybill));

                order.WaybillNo = generatedWaybill;
            }
            else
            {
                // Check if the user-supplied waybill already exists in the database
                var exists = await _context.DeliveryOrders.AnyAsync(o => o.WaybillNo == order.WaybillNo);
                if (exists)
                {
                    throw new InvalidOperationException($"A delivery order with waybill number '{order.WaybillNo}' already exists.");
                }
            }

            await _context.DeliveryOrders.AddAsync(order);

            // Insert initial history log (using navigation property for single SaveChangesAsync batching)
            var historyLog = new DeliveryHistoryLog
            {
                DeliveryOrder = order,
                FromStatus = "None",
                ToStatus = "Pending",
                Notes = "Order created in system",
                ChangedBy = order.EncodedBy ?? "Operations Admin",
                ChangedAt = DateTime.UtcNow.ToString("O")
            };
            await _context.DeliveryHistoryLogs.AddAsync(historyLog);

            // Insert activity log
            var initials = "OA";
            var color = "#FFB547";
            var creator = await _context.Employees.FirstOrDefaultAsync(e => e.Name == order.EncodedBy);
            if (creator != null)
            {
                initials = creator.Initials;
                color = creator.Color;
            }
            
            var activityLog = new ActivityLog
            {
                Timestamp = DateTime.UtcNow.ToString("O"),
                UserName = order.EncodedBy ?? "Operations Admin",
                UserRole = creator?.Role ?? "ADMIN",
                UserInitials = initials,
                UserColor = color,
                Action = "Create",
                Description = $"Created new {order.TaskType.ToLower()} order {order.WaybillNo}",
                Reference = order.WaybillNo
            };
            await _context.ActivityLogs.AddAsync(activityLog);

            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<DeliveryOrder?> UpdateOrderAsync(int id, DeliveryOrder updatedOrder)
        {
            var order = await _context.DeliveryOrders.Include(o => o.Driver).FirstOrDefaultAsync(o => o.Id == id);
            if (order == null) return null;

            var entry = _context.Entry(order);
            bool isSameReference = Object.ReferenceEquals(order, updatedOrder);

            bool wasArchived = entry.Property(o => o.IsArchived).OriginalValue;
            string oldStatus = isSameReference 
                ? entry.Property(o => o.Status).OriginalValue 
                : order.Status;

            string newStatus = isSameReference 
                ? order.Status 
                : (!string.IsNullOrEmpty(updatedOrder.Status) ? updatedOrder.Status : oldStatus);

            // Pre-validation same-reference overrides for POD/POT uploads to prevent validation bypasses
            if (isSameReference)
            {
                if (!string.IsNullOrEmpty(order.PodImage) && order.PodStatus == "Not Submitted")
                {
                    order.PodStatus = "Submitted";
                    newStatus = "Delivered";
                }
                if (!string.IsNullOrEmpty(order.PotImage) && order.PotStatus == "Not Submitted")
                {
                    order.PotStatus = "Submitted";
                }
            }

            // 1. Lock check - archived orders cannot be modified unless restoring/rescheduling to Pending/Assigned
            if (wasArchived)
            {
                bool isRestoring = (newStatus == "Pending" || newStatus == "Assigned");
                if (!isRestoring)
                {
                    throw new InvalidOperationException("Archived orders are read-only and cannot be modified.");
                }
            }

            // 2. Validate driver assignment restrictions
            int? oldDriverId = isSameReference 
                ? entry.Property(o => o.DriverId).OriginalValue 
                : order.DriverId;

            int? newDriverId = isSameReference 
                ? order.DriverId 
                : updatedOrder.DriverId;

            if (order.TaskType == "Pickup" && newDriverId.HasValue && newDriverId.Value > 0)
            {
                throw new InvalidOperationException("Driver assignment is disabled for Office Pickup orders.");
            }

            // Driver assignment triggers "Assigned" status automatically for home delivery
            if (order.TaskType == "Delivery" && newDriverId.HasValue && newDriverId.Value > 0 && oldDriverId != newDriverId)
            {
                order.DriverId = newDriverId;
                if (oldStatus == "Pending" || oldStatus == "Processing")
                {
                    newStatus = "Assigned";
                }
            }

            if (order.TaskType == "Delivery" && newStatus == "Assigned" && !newDriverId.HasValue)
            {
                throw new InvalidOperationException("Driver assignment is required to move to Assigned state.");
            }

            // 3. Validate status transitions
            if (oldStatus != newStatus)
            {
                ValidateStatusTransition(order, oldStatus, newStatus, updatedOrder);
            }

            // 4. Update mutable fields (partial update logic - only update if non-null and non-default)
            if (!isSameReference)
            {
                if (!string.IsNullOrEmpty(updatedOrder.ClientName)) order.ClientName = updatedOrder.ClientName;
                if (!string.IsNullOrEmpty(updatedOrder.ClientType)) order.ClientType = updatedOrder.ClientType;
                if (!string.IsNullOrEmpty(updatedOrder.ContactNumber)) order.ContactNumber = updatedOrder.ContactNumber;
                if (!string.IsNullOrEmpty(updatedOrder.SenderAddress)) order.SenderAddress = updatedOrder.SenderAddress;
                order.SenderUnit = updatedOrder.SenderUnit;
                order.SenderStreet = updatedOrder.SenderStreet;
                order.SenderBarangay = updatedOrder.SenderBarangay;
                order.SenderCity = updatedOrder.SenderCity;

                if (!string.IsNullOrEmpty(updatedOrder.RecipientName)) order.RecipientName = updatedOrder.RecipientName;
                if (!string.IsNullOrEmpty(updatedOrder.RecipientContact)) order.RecipientContact = updatedOrder.RecipientContact;
                if (!string.IsNullOrEmpty(updatedOrder.RecipientAddress)) order.RecipientAddress = updatedOrder.RecipientAddress;
                order.RecipientUnit = updatedOrder.RecipientUnit;
                order.RecipientStreet = updatedOrder.RecipientStreet;
                order.RecipientBarangay = updatedOrder.RecipientBarangay;
                order.RecipientCity = updatedOrder.RecipientCity;
                
                // For pickups, area/route is locked to Manila
                if (order.TaskType != "Pickup")
                {
                    if (!string.IsNullOrEmpty(updatedOrder.Area)) order.Area = updatedOrder.Area;
                    if (!string.IsNullOrEmpty(updatedOrder.Route)) order.Route = updatedOrder.Route;
                }
                
                if (updatedOrder.Landmark != null) order.Landmark = updatedOrder.Landmark;
                if (!string.IsNullOrEmpty(updatedOrder.PackageType)) order.PackageType = updatedOrder.PackageType;
                if (updatedOrder.PackageDescription != null) order.PackageDescription = updatedOrder.PackageDescription;
                if (updatedOrder.ItemCount > 0) order.ItemCount = updatedOrder.ItemCount;
                if (!string.IsNullOrEmpty(updatedOrder.Weight)) order.Weight = updatedOrder.Weight;
                if (!string.IsNullOrEmpty(updatedOrder.DeclaredValue)) order.DeclaredValue = updatedOrder.DeclaredValue;
                if (!string.IsNullOrEmpty(updatedOrder.Priority)) order.Priority = updatedOrder.Priority;
                if (updatedOrder.SpecialInstructions != null) order.SpecialInstructions = updatedOrder.SpecialInstructions;
                if (!string.IsNullOrEmpty(updatedOrder.ExpectedDelivery)) order.ExpectedDelivery = updatedOrder.ExpectedDelivery;

                // Map incoming virtual coordinates to DB columns
                if (updatedOrder.RecipientCoordinates != null)
                {
                    order.RecipientLatitude = updatedOrder.RecipientCoordinates.Lat;
                    order.RecipientLongitude = updatedOrder.RecipientCoordinates.Lng;
                }
                else
                {
                    if (updatedOrder.RecipientLatitude.HasValue) order.RecipientLatitude = updatedOrder.RecipientLatitude;
                    if (updatedOrder.RecipientLongitude.HasValue) order.RecipientLongitude = updatedOrder.RecipientLongitude;
                }

                if (updatedOrder.GpsCoordinates != null)
                {
                    order.LiveLatitude = updatedOrder.GpsCoordinates.Lat;
                    order.LiveLongitude = updatedOrder.GpsCoordinates.Lng;
                    order.LastLiveUpdate = DateTime.UtcNow.ToString("O");
                }
                else if (updatedOrder.LiveCoordinates != null)
                {
                    order.LiveLatitude = updatedOrder.LiveCoordinates.Lat;
                    order.LiveLongitude = updatedOrder.LiveCoordinates.Lng;
                    order.LastLiveUpdate = updatedOrder.LiveCoordinates.LastUpdated;
                }
                else
                {
                    if (updatedOrder.LiveLatitude.HasValue) order.LiveLatitude = updatedOrder.LiveLatitude;
                    if (updatedOrder.LiveLongitude.HasValue) order.LiveLongitude = updatedOrder.LiveLongitude;
                    if (!string.IsNullOrEmpty(updatedOrder.LastLiveUpdate)) order.LastLiveUpdate = updatedOrder.LastLiveUpdate;
                }

                // POD / POT Updates
                if (!string.IsNullOrEmpty(updatedOrder.PotImage))
                {
                    order.PotImage = updatedOrder.PotImage;
                    order.PotStatus = "Submitted";
                }
                if (!string.IsNullOrEmpty(updatedOrder.PodImage))
                {
                    order.PodImage = updatedOrder.PodImage;
                    order.PodStatus = "Submitted";
                    newStatus = "Delivered";
                }

                // Failure Remarks
                if (!string.IsNullOrEmpty(updatedOrder.FailureReason))
                {
                    order.FailureReason = updatedOrder.FailureReason;
                    order.FailureRemarks = updatedOrder.FailureRemarks;
                }

                // Redelivery
                if (!string.IsNullOrEmpty(updatedOrder.RedeliveryScheduledDate)) order.RedeliveryScheduledDate = updatedOrder.RedeliveryScheduledDate;
                if (!string.IsNullOrEmpty(updatedOrder.RedeliveryRemarks)) order.RedeliveryRemarks = updatedOrder.RedeliveryRemarks;
                if (updatedOrder.RedeliveryAttemptCount > 0)
                {
                    if (updatedOrder.RedeliveryAttemptCount > 3)
                    {
                        throw new InvalidOperationException("Maximum redelivery limit of 3 attempts exceeded. Package must be returned to sender.");
                    }
                    order.RedeliveryAttemptCount = updatedOrder.RedeliveryAttemptCount;
                }
                if (updatedOrder.RedeliveryDriverId.HasValue && updatedOrder.RedeliveryDriverId.Value > 0) order.RedeliveryDriverId = updatedOrder.RedeliveryDriverId;
                if (!string.IsNullOrEmpty(updatedOrder.RedeliveryStatus)) order.RedeliveryStatus = updatedOrder.RedeliveryStatus;
                if (!string.IsNullOrEmpty(updatedOrder.RedeliveryRequestedDate)) order.RedeliveryRequestedDate = updatedOrder.RedeliveryRequestedDate;
            }
            else
            {
                // Pre-validation same-reference overrides were already run at the start of UpdateOrderAsync
            }

            // 5. Enforce validation check on fully modified order details
            ValidateOrderDetails(order);

            // Apply Status Change & System Automation
            if (oldStatus != newStatus)
            {
                order.Status = newStatus;

                if (newStatus == "Failed")
                {
                    order.RedeliveryAttemptCount++;
                }

                // Set completion timestamp and auto-archive if status is terminal
                bool isTerminal = newStatus == "Completed" || 
                                  (newStatus == "Picked Up" && order.TaskType == "Pickup") || 
                                  newStatus == "Failed" || 
                                  newStatus == "Cancelled" ||
                                  newStatus == "Returned";
                if (isTerminal)
                {
                    order.IsArchived = true;
                    order.CompletedAt = DateTime.UtcNow.ToString("O");
                    order.DateCompleted = DateTime.UtcNow.ToString("O");
                    order.ArchivedReason = newStatus == "Delivered" || newStatus == "Completed" || newStatus == "Picked Up" 
                        ? "Completed Transaction" 
                        : (newStatus == "Returned" ? "Returned to Sender" : (newStatus == "Failed" ? $"Failed Delivery: {order.FailureReason}" : "Cancelled Order"));
                    order.ArchivedAt = DateTime.UtcNow.ToString("O");
                    order.ArchivedBy = updatedOrder.UpdatedBy ?? "Operations Admin";
                }
                else
                {
                    // If moving back out of terminal (e.g. reschedule)
                    order.IsArchived = false;
                    order.CompletedAt = null;
                    order.ArchivedReason = null;
                }

                // Save transition history
                var historyLog = new DeliveryHistoryLog
                {
                    DeliveryOrderId = order.Id,
                    FromStatus = oldStatus,
                    ToStatus = newStatus,
                    Notes = updatedOrder.FailureRemarks ?? updatedOrder.RedeliveryRemarks ?? "Status updated",
                    ChangedBy = updatedOrder.UpdatedBy ?? "Operations Admin",
                    ChangedAt = DateTime.UtcNow.ToString("O")
                };
                await _context.DeliveryHistoryLogs.AddAsync(historyLog);

                // Find editor initials and color
                var initials = "TD";
                var color = "#00A99D";
                var editor = await _context.Employees.FirstOrDefaultAsync(e => e.Name == updatedOrder.UpdatedBy);
                if (editor != null)
                {
                    initials = editor.Initials;
                    color = editor.Color;
                }

                // Save activity log
                var activityLog = new ActivityLog
                {
                    Timestamp = DateTime.UtcNow.ToString("O"),
                    UserName = updatedOrder.UpdatedBy ?? "Operations Admin",
                    UserRole = editor?.Role ?? "DRIVER",
                    UserInitials = initials,
                    UserColor = color,
                    Action = "Update",
                    Description = $"Updated status of {order.WaybillNo} from {oldStatus} to {newStatus}",
                    Reference = order.WaybillNo
                };
                await _context.ActivityLogs.AddAsync(activityLog);

                // Create Notifications based on transition rules
                await CreateStatusNotificationAsync(order, oldStatus, newStatus, editor);
            }

            order.LastUpdated = DateTime.UtcNow.ToString("O");
            order.UpdatedBy = updatedOrder.UpdatedBy ?? "Operations Admin";

            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<bool> DeleteOrderAsync(int id)
        {
            var order = await _context.DeliveryOrders.FindAsync(id);
            if (order == null) return false;

            if (order.Status == "Cancelled") return true;

            string oldStatus = order.Status;
            order.Status = "Cancelled";
            order.IsArchived = true;
            order.CompletedAt = DateTime.UtcNow.ToString("O");
            order.ArchivedReason = "Cancelled Order";
            order.ArchivedAt = DateTime.UtcNow.ToString("O");
            order.ArchivedBy = "Operations Admin";
            order.LastUpdated = DateTime.UtcNow.ToString("O");
            order.UpdatedBy = "Operations Admin";

            var historyLog = new DeliveryHistoryLog
            {
                DeliveryOrderId = order.Id,
                FromStatus = oldStatus,
                ToStatus = "Cancelled",
                Notes = "Order cancelled by Admin/Ops",
                ChangedBy = "Operations Admin",
                ChangedAt = DateTime.UtcNow.ToString("O")
            };
            await _context.DeliveryHistoryLogs.AddAsync(historyLog);

            var activityLog = new ActivityLog
            {
                Timestamp = DateTime.UtcNow.ToString("O"),
                UserName = "Operations Admin",
                UserRole = "ADMIN",
                UserInitials = "OA",
                UserColor = "#FFB547",
                Action = "Update",
                Description = $"Cancelled delivery order {order.WaybillNo}",
                Reference = order.WaybillNo
            };
            await _context.ActivityLogs.AddAsync(activityLog);

            // Cascade-delete all notifications linked to this order's waybill number
            var linkedNotifications = await _context.Notifications
                .Where(n => n.WaybillNo == order.WaybillNo)
                .ToListAsync();
            if (linkedNotifications.Count > 0)
            {
                _context.Notifications.RemoveRange(linkedNotifications);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        private void ValidateStatusTransition(DeliveryOrder order, string oldStatus, string newStatus, DeliveryOrder updatedOrder)
        {
            if (oldStatus == newStatus) return;

            // Terminal status checks
            bool isTerminal = oldStatus == "Completed" || 
                              (oldStatus == "Picked Up" && order.TaskType == "Pickup") || 
                              oldStatus == "Failed" || 
                              oldStatus == "Cancelled" ||
                              oldStatus == "Returned";
            
            // Allow rescheduling failed or cancelled orders back to Pending/Assigned if limit not exceeded
            if (isTerminal && (newStatus == "Pending" || newStatus == "Assigned"))
            {
                if (order.RedeliveryAttemptCount >= 3)
                {
                    throw new InvalidOperationException($"Cannot reschedule redelivery. Maximum attempt limit (3 attempts) has been reached for Waybill {order.WaybillNo}. Package must be returned to sender.");
                }
                return;
            }

            // Allow return to sender workflow for failed orders
            if (oldStatus == "Failed" && (newStatus == "Returning" || newStatus == "Cancelled"))
            {
                return;
            }

            if (oldStatus == "Returning")
            {
                bool isValidTransition = (newStatus == "Returned" || newStatus == "Cancelled");
                if (!isValidTransition)
                {
                    throw new InvalidOperationException($"Invalid Return to Sender status jump: '{oldStatus}' to '{newStatus}'. Sequence must follow: Returning -> Returned");
                }
                return;
            }

            if (isTerminal)
            {
                throw new InvalidOperationException($"Cannot transition from terminal state '{oldStatus}' to '{newStatus}'.");
            }

            if (order.TaskType == "Pickup")
            {
                // Pickup sequence: Pending -> Processing -> Preparing -> Ready for Pickup -> Picked Up
                bool isValid = false;
                if (oldStatus == "Pending" && (newStatus == "Processing" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "Processing" && (newStatus == "Preparing" || newStatus == "Cancelled" || newStatus == "Pending")) isValid = true;
                else if (oldStatus == "Preparing" && (newStatus == "Ready for Pickup" || newStatus == "Cancelled" || newStatus == "Processing")) isValid = true;
                else if (oldStatus == "Ready for Pickup" && (newStatus == "Picked Up" || newStatus == "Completed" || newStatus == "Failed" || newStatus == "Cancelled" || newStatus == "Preparing")) isValid = true;

                if (!isValid)
                {
                    throw new InvalidOperationException($"Invalid Office Pickup status jump: '{oldStatus}' to '{newStatus}'. Sequence must follow: Pending -> Processing -> Preparing -> Ready for Pickup -> Picked Up");
                }
            }
            else
            {
                // Enforce Proof of Delivery (POD) check when transitioning to Delivered
                if (newStatus == "Delivered")
                {
                    bool hasExistingPod = !string.IsNullOrEmpty(order.PodImage);
                    bool hasNewPod = !string.IsNullOrEmpty(updatedOrder.PodImage);
                    if (!hasExistingPod && !hasNewPod)
                    {
                        throw new InvalidOperationException("Proof of Delivery (POD image) is required to mark the order as Delivered.");
                    }
                }

                // Delivery sequence: Pending -> Processing -> Assigned -> Picked Up -> In Transit -> Out for Delivery -> Delivered
                bool isValid = false;
                if (oldStatus == "Pending" && (newStatus == "Processing" || newStatus == "Assigned" || newStatus == "Picked Up" || newStatus == "In Transit" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "Processing" && (newStatus == "Assigned" || newStatus == "Cancelled" || newStatus == "Pending")) isValid = true;
                else if (oldStatus == "Assigned" && (newStatus == "Picked Up" || newStatus == "Cancelled" || newStatus == "Processing" || newStatus == "Pending")) isValid = true;
                else if (oldStatus == "Picked Up" && (newStatus == "In Transit" || newStatus == "Cancelled" || newStatus == "Assigned" || newStatus == "Processing")) isValid = true;
                else if (oldStatus == "In Transit" && (newStatus == "Out for Delivery" || newStatus == "Failed" || newStatus == "Cancelled" || newStatus == "Picked Up" || newStatus == "Assigned")) isValid = true;
                else if (oldStatus == "Out for Delivery" && (newStatus == "Delivered" || newStatus == "Completed" || newStatus == "Failed" || newStatus == "Cancelled" || newStatus == "In Transit" || newStatus == "Picked Up")) isValid = true;
                else if (oldStatus == "Delivered" && (newStatus == "Completed" || newStatus == "Failed" || newStatus == "Cancelled" || newStatus == "Pending" || newStatus == "Assigned")) isValid = true;

                if (!isValid)
                {
                    throw new InvalidOperationException($"Invalid Home Delivery status jump: '{oldStatus}' to '{newStatus}'. Sequence must follow: Pending -> Processing -> Assigned -> Picked Up -> In Transit -> Out for Delivery -> Delivered");
                }
            }
        }

        private async Task CreateStatusNotificationAsync(DeliveryOrder order, string oldStatus, string newStatus, Employee? editor)
        {
            var title = "Order Status Updated";
            var description = $"Status of order {order.WaybillNo} changed to {newStatus}.";
            var badge = newStatus;
            var type = "info";

            if (newStatus == "Assigned")
            {
                title = "Driver Assigned";
                description = $"Driver {order.Driver?.Name ?? "Test Driver"} has been assigned to delivery {order.WaybillNo}.";
                type = "info";
            }
            else if (newStatus == "Ready for Pickup")
            {
                title = "Package Ready for Pickup";
                description = $"Your pickup order {order.WaybillNo} is now prepared and ready for pickup at our office location.";
                type = "success";
                badge = "Ready";
            }
            else if (newStatus == "Completed")
            {
                title = "Delivery Confirmed by Client";
                description = $"Client has confirmed receipt of package {order.WaybillNo} via tracking portal. Transaction is now complete.";
                type = "success";
                badge = "Confirmed";
            }
            else if (newStatus == "Delivered" || newStatus == "Picked Up")
            {
                title = newStatus == "Picked Up" ? "Package Picked Up" : "Package Delivered";
                description = newStatus == "Picked Up" 
                    ? $"Client has successfully picked up order {order.WaybillNo} from the office."
                    : $"Courier has completed delivery for order {order.WaybillNo}. Proof of Delivery uploaded.";
                type = "success";
                badge = "Success";
            }
            else if (newStatus == "Returning")
            {
                title = "Return to Sender in Transit";
                description = $"Order {order.WaybillNo} has failed delivery attempts and is being returned to origin sender.";
                type = "alert";
                badge = "Returning";
            }
            else if (newStatus == "Returned")
            {
                title = "Returned to Sender";
                description = $"Order {order.WaybillNo} has been successfully returned to origin sender warehouse.";
                type = "success";
                badge = "Returned";
            }
            else if (newStatus == "Failed")
            {
                title = "Delivery Attempt Failed";
                description = $"Delivery attempt for waybill {order.WaybillNo} failed. Reason: {order.FailureReason ?? "Not specified"}. Escalated alert generated.";
                type = "alert";
                badge = "Urgent";
            }
            else if (newStatus == "Cancelled")
            {
                title = "Order Cancelled";
                description = $"Order {order.WaybillNo} has been cancelled in the system.";
                type = "alert";
                badge = "Cancelled";
            }

            var notification = new Notification
            {
                Type = type,
                Title = title,
                WaybillNo = order.WaybillNo,
                Description = description,
                Timestamp = DateTime.UtcNow.ToString("t"), // e.g. "10:15 AM"
                Date = DateTime.UtcNow.ToString("MM/dd/yyyy"),
                Source = editor?.Name ?? "System",
                Read = false,
                StatusBadge = badge
            };

            await _context.Notifications.AddAsync(notification);
        }
    }
}
