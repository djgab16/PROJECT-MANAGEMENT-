using Microsoft.EntityFrameworkCore;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.DTOs.DeliveryOrders;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services;

public class DeliveryOrderService(
    AppDbContext db,
    IConfiguration config,
    ILogger<DeliveryOrderService> logger) : IDeliveryOrderService
{
    // ─── GET ALL (with filters + pagination) ───────────────────────────────────
    public async Task<DeliveryOrderListResponse> GetAllAsync(DeliveryOrderFilterRequest filter)
    {
        var query = db.DeliveryOrders
            .Include(o => o.Driver)
            .Include(o => o.EncodedBy)
            .Include(o => o.UpdatedBy)
            .AsQueryable();

        // Filters
        if (!string.IsNullOrWhiteSpace(filter.Status))
            query = query.Where(o => o.Status == filter.Status);

        if (!string.IsNullOrWhiteSpace(filter.PodStatus))
            query = query.Where(o => o.PodStatus == filter.PodStatus);

        if (!string.IsNullOrWhiteSpace(filter.Area))
            query = query.Where(o => o.Area.Contains(filter.Area));

        if (!string.IsNullOrWhiteSpace(filter.ClientName))
            query = query.Where(o => o.ClientName.Contains(filter.ClientName));

        if (!string.IsNullOrWhiteSpace(filter.Search))
            query = query.Where(o =>
                o.WaybillNo.Contains(filter.Search) ||
                o.RecipientName.Contains(filter.Search) ||
                o.ClientName.Contains(filter.Search));

        // Archive filter — default to non-archived
        query = query.Where(o => o.IsArchived == (filter.IsArchived ?? false));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(o => o.DateEncoded)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return new DeliveryOrderListResponse
        {
            Items      = items.Select(MapToResponse).ToList(),
            TotalCount = totalCount,
            Page       = filter.Page,
            PageSize   = filter.PageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize)
        };
    }

    // ─── GET BY ID ─────────────────────────────────────────────────────────────
    public async Task<DeliveryOrderResponse> GetByIdAsync(int id)
    {
        var order = await GetOrderOrThrowAsync(id);
        return MapToResponse(order);
    }

    // ─── GET BY WAYBILL (for tracking) ────────────────────────────────────────
    public async Task<DeliveryOrderResponse> GetByWaybillAsync(string waybillNo)
    {
        var order = await db.DeliveryOrders
            .Include(o => o.Driver)
            .Include(o => o.EncodedBy)
            .Include(o => o.UpdatedBy)
            .FirstOrDefaultAsync(o => o.WaybillNo == waybillNo.ToUpper());

        if (order is null)
            throw new KeyNotFoundException($"No order found with waybill number '{waybillNo}'.");

        return MapToResponse(order);
    }

    // ─── CREATE ────────────────────────────────────────────────────────────────
    public async Task<DeliveryOrderResponse> CreateAsync(
        CreateDeliveryOrderRequest request, int encodedById)
    {
        // Validate driver exists if provided
        if (request.DriverId.HasValue)
        {
            var driver = await db.Employees.FindAsync(request.DriverId.Value);
            if (driver is null)
                throw new KeyNotFoundException($"Driver with ID {request.DriverId} not found.");
        }

        var order = new DeliveryOrder
        {
            WaybillNo          = await GenerateWaybillNoAsync(),
            ClientName         = request.ClientName,
            ClientType         = request.ClientType,
            ContactNumber      = request.ContactNumber,
            SenderAddress      = request.SenderAddress,
            RecipientName      = request.RecipientName,
            RecipientContact   = request.RecipientContact,
            RecipientAddress   = request.RecipientAddress,
            Area               = request.Area,
            Landmark           = request.Landmark,
            Route              = request.Route,
            DriverId           = request.DriverId,
            PackageType        = request.PackageType,
            PackageDescription = request.PackageDescription,
            ItemCount          = request.ItemCount,
            Weight             = request.Weight,
            DeclaredValue      = request.DeclaredValue,
            SpecialInstructions = request.SpecialInstructions,
            OrderDate          = request.OrderDate,
            ExpectedDelivery   = request.ExpectedDelivery,
            Status             = "Pending",
            PodStatus          = "Not Submitted",
            EncodedById        = encodedById,
            UpdatedById        = encodedById,
            DateEncoded        = DateTime.UtcNow,
            LastUpdated        = DateTime.UtcNow
        };

        db.DeliveryOrders.Add(order);

        await LogActivityAsync(encodedById, "Create",
            $"Created new delivery order {order.WaybillNo} for client {order.ClientName}",
            order.WaybillNo);

        await db.SaveChangesAsync();

        // Reload with navigation properties
        return MapToResponse(await GetOrderOrThrowAsync(order.Id));
    }

    // ─── UPDATE ────────────────────────────────────────────────────────────────
    public async Task<DeliveryOrderResponse> UpdateAsync(
        int id, UpdateDeliveryOrderRequest request, int updatedById)
    {
        var order = await GetOrderOrThrowAsync(id);

        if (request.ClientName      is not null) order.ClientName         = request.ClientName;
        if (request.ClientType      is not null) order.ClientType         = request.ClientType;
        if (request.ContactNumber   is not null) order.ContactNumber      = request.ContactNumber;
        if (request.SenderAddress   is not null) order.SenderAddress      = request.SenderAddress;
        if (request.RecipientName   is not null) order.RecipientName      = request.RecipientName;
        if (request.RecipientContact is not null) order.RecipientContact  = request.RecipientContact;
        if (request.RecipientAddress is not null) order.RecipientAddress  = request.RecipientAddress;
        if (request.Area            is not null) order.Area               = request.Area;
        if (request.Landmark        is not null) order.Landmark           = request.Landmark;
        if (request.Route           is not null) order.Route              = request.Route;
        if (request.PackageType     is not null) order.PackageType        = request.PackageType;
        if (request.PackageDescription is not null) order.PackageDescription = request.PackageDescription;
        if (request.ItemCount       is not null) order.ItemCount          = request.ItemCount.Value;
        if (request.Weight          is not null) order.Weight             = request.Weight;
        if (request.DeclaredValue   is not null) order.DeclaredValue      = request.DeclaredValue;
        if (request.SpecialInstructions is not null) order.SpecialInstructions = request.SpecialInstructions;
        if (request.ExpectedDelivery is not null) order.ExpectedDelivery  = request.ExpectedDelivery.Value;

        order.LastUpdated = DateTime.UtcNow;
        order.UpdatedById = updatedById;

        await LogActivityAsync(updatedById, "Update",
            $"Updated delivery order {order.WaybillNo}", order.WaybillNo);

        await db.SaveChangesAsync();
        return MapToResponse(await GetOrderOrThrowAsync(id));
    }

    // ─── UPDATE STATUS ─────────────────────────────────────────────────────────
    public async Task<DeliveryOrderResponse> UpdateStatusAsync(
        int id, UpdateStatusRequest request, int updatedById)
    {
        var order = await GetOrderOrThrowAsync(id);
        var fromStatus = order.Status;

        order.Status      = request.Status;
        order.LastUpdated = DateTime.UtcNow;
        order.UpdatedById = updatedById;

        // Auto-set completion date
        if (request.Status is "Completed" or "Delivered")
            order.DateCompleted = DateTime.UtcNow;

        // Auto-set POD status for Failed
        if (request.Status == "Failed")
            order.PodStatus = "No POD";

        // Record history
        db.DeliveryHistoryLogs.Add(new DeliveryHistoryLog
        {
            DeliveryOrderId = id,
            FromStatus      = fromStatus,
            ToStatus        = request.Status,
            Notes           = request.Notes,
            ChangedById     = updatedById,
            ChangedAt       = DateTime.UtcNow
        });

        // Auto-create notification
        db.Notifications.Add(new Notification
        {
            Type            = request.Status == "Failed" ? "alert" : "info",
            Title           = "Status Updated",
            WaybillNo       = order.WaybillNo,
            Description     = $"Delivery status changed from {fromStatus} → {request.Status}",
            StatusBadge     = request.Status,
            DeliveryOrderId = id,
            CreatedAt       = DateTime.UtcNow
        });

        await LogActivityAsync(updatedById, "Update",
            $"Updated delivery status of {order.WaybillNo} to {request.Status}",
            order.WaybillNo);

        await db.SaveChangesAsync();
        return MapToResponse(await GetOrderOrThrowAsync(id));
    }

    // ─── ASSIGN DRIVER ─────────────────────────────────────────────────────────
    public async Task<DeliveryOrderResponse> AssignDriverAsync(
        int id, AssignDriverRequest request, int updatedById)
    {
        var order = await GetOrderOrThrowAsync(id);

        var driver = await db.Employees.FindAsync(request.DriverId)
            ?? throw new KeyNotFoundException($"Driver with ID {request.DriverId} not found.");

        order.DriverId    = request.DriverId;
        order.LastUpdated = DateTime.UtcNow;
        order.UpdatedById = updatedById;

        await LogActivityAsync(updatedById, "Assign",
            $"Assigned driver {driver.Name} to order {order.WaybillNo}",
            order.WaybillNo);

        await db.SaveChangesAsync();
        return MapToResponse(await GetOrderOrThrowAsync(id));
    }

    // ─── UPLOAD POD ────────────────────────────────────────────────────────────
    public async Task<DeliveryOrderResponse> UploadPodAsync(
        int id, IFormFile file, int updatedById)
    {
        var order = await GetOrderOrThrowAsync(id);

        // Validate file
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            throw new InvalidOperationException("Only JPG, PNG, and WEBP images are allowed.");

        var maxSize = config.GetValue<long>("FileStorage:MaxFileSizeBytes", 5242880);
        if (file.Length > maxSize)
            throw new InvalidOperationException($"File size exceeds the {maxSize / 1024 / 1024}MB limit.");

        // Save file
        var uploadPath = config["FileStorage:PodImagesPath"] ?? "uploads/pod-images";
        var fullPath   = Path.Combine(Directory.GetCurrentDirectory(), uploadPath);
        Directory.CreateDirectory(fullPath);

        var fileName = $"{order.WaybillNo}_{DateTime.UtcNow:yyyyMMddHHmmss}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(fullPath, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        order.PodImagePath = $"/{uploadPath}/{fileName}";
        order.PodStatus    = "Submitted";
        order.LastUpdated  = DateTime.UtcNow;
        order.UpdatedById  = updatedById;

        // Auto-mark as Delivered if still In Transit
        if (order.Status == "In Transit")
        {
            var fromStatus = order.Status;
            order.Status = "Delivered";
            order.DateCompleted = DateTime.UtcNow;

            db.DeliveryHistoryLogs.Add(new DeliveryHistoryLog
            {
                DeliveryOrderId = id,
                FromStatus      = fromStatus,
                ToStatus        = "Delivered",
                Notes           = "Auto-updated on POD submission",
                ChangedById     = updatedById,
                ChangedAt       = DateTime.UtcNow
            });
        }

        db.Notifications.Add(new Notification
        {
            Type            = "success",
            Title           = "POD Submitted",
            WaybillNo       = order.WaybillNo,
            Description     = $"Proof of delivery submitted for {order.WaybillNo}. Delivery auto-marked as Delivered.",
            StatusBadge     = "Success",
            DeliveryOrderId = id,
            CreatedAt       = DateTime.UtcNow
        });

        await LogActivityAsync(updatedById, "POD Upload",
            $"Uploaded proof of delivery for {order.WaybillNo} — Recipient: {order.RecipientName}",
            order.WaybillNo);

        await db.SaveChangesAsync();
        return MapToResponse(await GetOrderOrThrowAsync(id));
    }

    // ─── ARCHIVE ───────────────────────────────────────────────────────────────
    public async Task ArchiveAsync(int id, int updatedById)
    {
        var order = await GetOrderOrThrowAsync(id);

        order.IsArchived  = true;
        order.ArchivedAt  = DateTime.UtcNow;
        order.LastUpdated = DateTime.UtcNow;
        order.UpdatedById = updatedById;

        await LogActivityAsync(updatedById, "Archive",
            $"Archived delivery order {order.WaybillNo}", order.WaybillNo);

        await db.SaveChangesAsync();
    }

    // ─── RESTORE FROM ARCHIVE ──────────────────────────────────────────────────
    public async Task RestoreAsync(int id, int updatedById)
    {
        var order = await GetOrderOrThrowAsync(id);

        order.IsArchived  = false;
        order.ArchivedAt  = null;
        order.LastUpdated = DateTime.UtcNow;
        order.UpdatedById = updatedById;

        await LogActivityAsync(updatedById, "Update",
            $"Restored archived delivery order {order.WaybillNo}", order.WaybillNo);

        await db.SaveChangesAsync();
    }

    // ─── DELETE ────────────────────────────────────────────────────────────────
    public async Task DeleteAsync(int id, int deletedById)
    {
        var order = await GetOrderOrThrowAsync(id);
        var waybill = order.WaybillNo;

        db.DeliveryOrders.Remove(order);

        await LogActivityAsync(deletedById, "Delete",
            $"Permanently deleted delivery order {waybill}", waybill);

        await db.SaveChangesAsync();
    }

    // ─── GET HISTORY ───────────────────────────────────────────────────────────
    public async Task<List<DeliveryHistoryResponse>> GetHistoryAsync(int id)
    {
        var exists = await db.DeliveryOrders.AnyAsync(o => o.Id == id);
        if (!exists) throw new KeyNotFoundException($"Delivery order {id} not found.");

        var logs = await db.DeliveryHistoryLogs
            .Include(h => h.ChangedBy)
            .Where(h => h.DeliveryOrderId == id)
            .OrderByDescending(h => h.ChangedAt)
            .ToListAsync();

        return logs.Select(h => new DeliveryHistoryResponse
        {
            Id         = h.Id,
            FromStatus = h.FromStatus,
            ToStatus   = h.ToStatus,
            Notes      = h.Notes,
            ChangedBy  = h.ChangedBy.Name,
            ChangedAt  = h.ChangedAt
        }).ToList();
    }

    // ─── Private Helpers ───────────────────────────────────────────────────────

    private async Task<DeliveryOrder> GetOrderOrThrowAsync(int id)
    {
        var order = await db.DeliveryOrders
            .Include(o => o.Driver)
            .Include(o => o.EncodedBy)
            .Include(o => o.UpdatedBy)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null)
            throw new KeyNotFoundException($"Delivery order with ID {id} not found.");

        return order;
    }

    private async Task<string> GenerateWaybillNoAsync()
    {
        var year = DateTime.UtcNow.Year;

        // Find the highest waybill number for this year
        var prefix  = $"SPX-{year}-";
        var lastOrder = await db.DeliveryOrders
            .Where(o => o.WaybillNo.StartsWith(prefix))
            .OrderByDescending(o => o.WaybillNo)
            .FirstOrDefaultAsync();

        int nextNumber = 1001;
        if (lastOrder is not null)
        {
            var parts = lastOrder.WaybillNo.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out var last))
                nextNumber = last + 1;
        }

        return $"SPX-{year}-{nextNumber:D4}";
    }

    private async Task LogActivityAsync(
        int employeeId, string action, string description, string? reference = null)
    {
        var employee = await db.Employees.FindAsync(employeeId);
        db.ActivityLogs.Add(new ActivityLog
        {
            EmployeeId       = employeeId,
            Action           = action,
            Description      = description,
            Reference        = reference,
            UserRoleSnapshot = employee?.Role ?? "Unknown",
            Timestamp        = DateTime.UtcNow
        });
    }

    private static DeliveryOrderResponse MapToResponse(DeliveryOrder o) => new()
    {
        Id                 = o.Id,
        WaybillNo          = o.WaybillNo,
        ClientName         = o.ClientName,
        ClientType         = o.ClientType,
        ContactNumber      = o.ContactNumber,
        SenderAddress      = o.SenderAddress,
        RecipientName      = o.RecipientName,
        RecipientContact   = o.RecipientContact,
        RecipientAddress   = o.RecipientAddress,
        Area               = o.Area,
        Landmark           = o.Landmark,
        Route              = o.Route,
        Driver             = o.Driver is null ? null : new DriverSummary
        {
            Id         = o.Driver.Id,
            EmployeeId = o.Driver.EmployeeId,
            Name       = o.Driver.Name
        },
        Status             = o.Status,
        PodStatus          = o.PodStatus,
        PackageType        = o.PackageType,
        PackageDescription = o.PackageDescription,
        ItemCount          = o.ItemCount,
        Weight             = o.Weight,
        DeclaredValue      = o.DeclaredValue,
        SpecialInstructions = o.SpecialInstructions,
        PodImagePath       = o.PodImagePath,
        OrderDate          = o.OrderDate,
        ExpectedDelivery   = o.ExpectedDelivery,
        DateCompleted      = o.DateCompleted,
        EncodedBy          = o.EncodedBy?.Name ?? string.Empty,
        DateEncoded        = o.DateEncoded,
        LastUpdated        = o.LastUpdated,
        UpdatedBy          = o.UpdatedBy?.Name ?? string.Empty,
        IsArchived         = o.IsArchived
    };
}
