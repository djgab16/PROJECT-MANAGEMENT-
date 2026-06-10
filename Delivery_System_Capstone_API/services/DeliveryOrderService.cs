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
            return await _context.DeliveryOrders.Include(o => o.Driver).ToListAsync();
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
            return order;
        }

        private void ValidateOrderDetails(DeliveryOrder order)
        {
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

            var year = DateTime.UtcNow.Year;
            var maxRetries = 10;
            var retryCount = 0;
            bool saved = false;

            while (retryCount < maxRetries)
            {
                try
                {
                    var baseCount = await _context.DeliveryOrders.CountAsync(o => o.WaybillNo.StartsWith($"SPX-{year}"));
                    var count = baseCount + 1 + retryCount;
                    order.WaybillNo = $"SPX-{year}-{count:D4}";

                    if (await _context.DeliveryOrders.AnyAsync(o => o.WaybillNo == order.WaybillNo))
                    {
                        retryCount++;
                        continue;
                    }

                    await _context.DeliveryOrders.AddAsync(order);
                    await _context.SaveChangesAsync();
                    saved = true;
                    break;
                }
                catch (DbUpdateException)
                {
                    _context.Entry(order).State = EntityState.Detached;
                    retryCount++;
                    if (retryCount >= maxRetries)
                    {
                        throw new InvalidOperationException("Failed to generate a unique waybill number after multiple attempts. Please try again.");
                    }
                }
            }

            if (!saved)
            {
                throw new InvalidOperationException("Order could not be saved due to database issues.");
            }

            // Insert initial history log
            var historyLog = new DeliveryHistoryLog
            {
                DeliveryOrderId = order.Id,
                FromStatus = "None",
                ToStatus = "Pending",
                Notes = "Order created in system",
                ChangedBy = order.EncodedBy ?? "System Admin",
                ChangedAt = DateTime.UtcNow.ToString("O")
            };
            await _context.DeliveryHistoryLogs.AddAsync(historyLog);

            // Insert activity log
            var initials = "AD";
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
                UserName = order.EncodedBy ?? "System Admin",
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
                ValidateStatusTransition(order.TaskType, oldStatus, newStatus);
            }

            // 4. Update mutable fields (partial update logic - only update if non-null and non-default)
            if (!isSameReference)
            {
                if (!string.IsNullOrEmpty(updatedOrder.ClientName)) order.ClientName = updatedOrder.ClientName;
                if (!string.IsNullOrEmpty(updatedOrder.ClientType)) order.ClientType = updatedOrder.ClientType;
                if (!string.IsNullOrEmpty(updatedOrder.ContactNumber)) order.ContactNumber = updatedOrder.ContactNumber;
                if (!string.IsNullOrEmpty(updatedOrder.SenderAddress)) order.SenderAddress = updatedOrder.SenderAddress;
                if (!string.IsNullOrEmpty(updatedOrder.RecipientName)) order.RecipientName = updatedOrder.RecipientName;
                if (!string.IsNullOrEmpty(updatedOrder.RecipientContact)) order.RecipientContact = updatedOrder.RecipientContact;
                if (!string.IsNullOrEmpty(updatedOrder.RecipientAddress)) order.RecipientAddress = updatedOrder.RecipientAddress;
                
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

                if (updatedOrder.LiveLatitude.HasValue) order.LiveLatitude = updatedOrder.LiveLatitude;
                if (updatedOrder.LiveLongitude.HasValue) order.LiveLongitude = updatedOrder.LiveLongitude;
                if (!string.IsNullOrEmpty(updatedOrder.LastLiveUpdate)) order.LastLiveUpdate = updatedOrder.LastLiveUpdate;
                if (updatedOrder.RecipientLatitude.HasValue) order.RecipientLatitude = updatedOrder.RecipientLatitude;
                if (updatedOrder.RecipientLongitude.HasValue) order.RecipientLongitude = updatedOrder.RecipientLongitude;

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
                if (updatedOrder.RedeliveryAttemptCount > 0) order.RedeliveryAttemptCount = updatedOrder.RedeliveryAttemptCount;
                if (updatedOrder.RedeliveryDriverId.HasValue && updatedOrder.RedeliveryDriverId.Value > 0) order.RedeliveryDriverId = updatedOrder.RedeliveryDriverId;
                if (!string.IsNullOrEmpty(updatedOrder.RedeliveryStatus)) order.RedeliveryStatus = updatedOrder.RedeliveryStatus;
                if (!string.IsNullOrEmpty(updatedOrder.RedeliveryRequestedDate)) order.RedeliveryRequestedDate = updatedOrder.RedeliveryRequestedDate;
            }
            else
            {
                // If it is the same reference, ensure POT/POD status and automatic transition to Completed are handled.
                if (!string.IsNullOrEmpty(order.PotImage) && order.PotStatus == "Not Submitted")
                {
                    order.PotStatus = "Submitted";
                }
                if (!string.IsNullOrEmpty(order.PodImage) && order.PodStatus == "Not Submitted")
                {
                    order.PodStatus = "Submitted";
                    newStatus = "Delivered";
                }
            }

            // 5. Enforce validation check on fully modified order details
            ValidateOrderDetails(order);

            // Apply Status Change & System Automation
            if (oldStatus != newStatus)
            {
                order.Status = newStatus;

                // Set completion timestamp and auto-archive if status is terminal
                bool isTerminal = newStatus == "Completed" || newStatus == "Picked Up" || newStatus == "Failed" || newStatus == "Cancelled";
                if (isTerminal)
                {
                    order.IsArchived = true;
                    order.CompletedAt = DateTime.UtcNow.ToString("O");
                    order.DateCompleted = DateTime.UtcNow.ToString("O");
                    order.ArchivedReason = newStatus == "Delivered" || newStatus == "Completed" || newStatus == "Picked Up" 
                        ? "Completed Transaction" 
                        : (newStatus == "Failed" ? $"Failed Delivery: {order.FailureReason}" : "Cancelled Order");
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
                    ChangedBy = updatedOrder.UpdatedBy ?? "System Admin",
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
                    UserName = updatedOrder.UpdatedBy ?? "System Admin",
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
            order.UpdatedBy = updatedOrder.UpdatedBy ?? "System Admin";

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
            order.LastUpdated = DateTime.UtcNow.ToString("O");
            order.UpdatedBy = "System Admin";

            var historyLog = new DeliveryHistoryLog
            {
                DeliveryOrderId = order.Id,
                FromStatus = oldStatus,
                ToStatus = "Cancelled",
                Notes = "Order cancelled by Admin/Ops",
                ChangedBy = "System Admin",
                ChangedAt = DateTime.UtcNow.ToString("O")
            };
            await _context.DeliveryHistoryLogs.AddAsync(historyLog);

            var activityLog = new ActivityLog
            {
                Timestamp = DateTime.UtcNow.ToString("O"),
                UserName = "System Admin",
                UserRole = "ADMIN",
                UserInitials = "AD",
                UserColor = "#FFB547",
                Action = "Update",
                Description = $"Cancelled delivery order {order.WaybillNo}",
                Reference = order.WaybillNo
            };
            await _context.ActivityLogs.AddAsync(activityLog);

            await _context.SaveChangesAsync();
            return true;
        }

        private void ValidateStatusTransition(string taskType, string oldStatus, string newStatus)
        {
            if (oldStatus == newStatus) return;

            // Terminal status checks
            bool isTerminal = oldStatus == "Completed" || oldStatus == "Picked Up" || oldStatus == "Failed" || oldStatus == "Cancelled";
            
            // Allow rescheduling failed or cancelled orders back to Pending/Assigned
            if (isTerminal && (newStatus == "Pending" || newStatus == "Assigned"))
            {
                return;
            }

            if (isTerminal)
            {
                throw new InvalidOperationException($"Cannot transition from terminal state '{oldStatus}' to '{newStatus}'.");
            }

            if (taskType == "Pickup")
            {
                // Pickup sequence: Pending -> Processing -> Preparing -> Ready for Pickup -> Picked Up
                bool isValid = false;
                if (oldStatus == "Pending" && (newStatus == "Processing" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "Processing" && (newStatus == "Preparing" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "Preparing" && (newStatus == "Ready for Pickup" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "Ready for Pickup" && (newStatus == "Picked Up" || newStatus == "Completed" || newStatus == "Failed" || newStatus == "Cancelled")) isValid = true;

                if (!isValid)
                {
                    throw new InvalidOperationException($"Invalid Office Pickup status jump: '{oldStatus}' to '{newStatus}'. Sequence must follow: Pending -> Processing -> Preparing -> Ready for Pickup -> Picked Up");
                }
            }
            else
            {
                // Delivery sequence: Pending -> Processing -> Assigned -> Picked Up -> In Transit -> Out for Delivery -> Delivered
                bool isValid = false;
                if (oldStatus == "Pending" && (newStatus == "Processing" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "Processing" && (newStatus == "Assigned" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "Assigned" && (newStatus == "Picked Up" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "Picked Up" && (newStatus == "In Transit" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "In Transit" && (newStatus == "Out for Delivery" || newStatus == "Failed" || newStatus == "Cancelled")) isValid = true;
                else if (oldStatus == "Out for Delivery" && (newStatus == "Delivered" || newStatus == "Completed" || newStatus == "Failed" || newStatus == "Cancelled")) isValid = true;
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
            else if (newStatus == "Delivered" || newStatus == "Completed" || newStatus == "Picked Up")
            {
                title = newStatus == "Picked Up" ? "Package Picked Up" : "Package Delivered";
                description = newStatus == "Picked Up" 
                    ? $"Client has successfully picked up order {order.WaybillNo} from the office."
                    : $"Courier has completed delivery for order {order.WaybillNo}. Proof of Delivery uploaded.";
                type = "success";
                badge = "Success";
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
