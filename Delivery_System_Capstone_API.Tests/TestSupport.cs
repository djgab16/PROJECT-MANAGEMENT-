using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Models;
using SPXDeliveryAPI.Services;

namespace SPXDeliveryAPI.Tests;

/// <summary>
/// Shared helpers for the prediction tests.
/// </summary>
/// <remarks>
/// Uses the EF Core in-memory provider so no MSSQL instance is required. In-memory was chosen
/// over SQLite because <see cref="DeliveryOrder"/> carries a <c>[Timestamp] byte[] RowVersion</c>
/// concurrency token, which SQLite cannot generate without extra plumbing that none of these
/// tests exercise.
/// </remarks>
internal static class TestSupport
{
    public static AppDbContext NewContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"predictions-{Guid.NewGuid():N}")
            .Options;

        return new AppDbContext(options);
    }

    public static IConfiguration Config(params (string Key, string Value)[] values)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>(v.Key, v.Value)))
            .Build();
    }

    /// <summary>
    /// Builds a PredictionService whose factor-8 input is pinned to <paramref name="conditionsRisk"/>.
    /// </summary>
    /// <remarks>
    /// Pinning conditions is what makes the scoring assertions deterministic. Factor 8 now
    /// depends on the day of week and time of day of ExpectedDelivery, so a test that used the
    /// real <see cref="LocalHistoryConditionsService"/> would produce different scores when run
    /// on a Saturday than on a Tuesday. The real implementation is covered separately by
    /// <see cref="ConditionsServiceTests"/>.
    /// <para>
    /// No clock abstraction was introduced: factor 1 still reads DateTime.UtcNow inside
    /// PredictionService, so every test below builds ExpectedDelivery relative to
    /// DateTime.UtcNow instead.
    /// </para>
    /// </remarks>
    public static PredictionService NewPredictionService(
        AppDbContext context,
        double conditionsRisk = 0.0,
        IPredictionCache? cache = null)
    {
        return new PredictionService(
            context,
            new SlaService(Config()),
            new StubConditionsService(conditionsRisk),
            cache ?? NewCache());
    }

    /// <summary>A real PredictionCache over a fresh MemoryCache instance.</summary>
    public static PredictionCache NewCache(int ttlSeconds = 60)
    {
        return new PredictionCache(
            new Microsoft.Extensions.Caching.Memory.MemoryCache(
                new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions()),
            Config(("Predictions:SummaryCacheSeconds", ttlSeconds.ToString())),
            NullLogger<PredictionCache>.Instance);
    }

    /// <summary>
    /// An order that is valid for persistence and scores near zero on every factor, so each
    /// test can move exactly the inputs it cares about.
    /// </summary>
    public static DeliveryOrder NewOrder(
        int id,
        string waybill,
        double expectedDeliveryHoursFromNow = 72,
        string priority = "Low",
        string clientType = "Standard",
        string route = "Route-Test",
        string area = "Area-Test",
        string clientName = "Client-Test",
        int? driverId = null,
        int redeliveryAttempts = 0,
        string weight = "0.0 kg",
        int itemCount = 1,
        string status = "In Transit")
    {
        var now = DateTime.UtcNow;

        return new DeliveryOrder
        {
            Id = id,
            WaybillNo = waybill,
            ClientName = clientName,
            ClientType = clientType,
            ContactNumber = "0281234567",
            SenderAddress = "1 Sender St, Barangay, City",
            RecipientName = "Recipient Name",
            RecipientContact = "09171234567",
            RecipientAddress = "2 Recipient St, Barangay, City",
            Area = area,
            Route = route,
            Status = status,
            TaskType = "Delivery",
            PackageType = "Parcel",
            PackageDescription = "Test parcel",
            ItemCount = itemCount,
            Weight = weight,
            DeclaredValue = "0.00",
            Priority = priority,
            RedeliveryAttemptCount = redeliveryAttempts,
            OrderDate = now.AddHours(-24),
            ExpectedDelivery = now.AddHours(expectedDeliveryHoursFromNow),
            DriverId = driverId,
            EncodedBy = "Test Encoder",
            DateEncoded = now.AddHours(-24),
            LastUpdated = now,
            UpdatedBy = "Test Updater"
        };
    }

    /// <summary>
    /// Adds terminal-status history so driver/route/client breach rates become resolvable.
    /// Fields required by AppDbContext.ValidateEntities for Delivered orders are populated.
    /// </summary>
    public static void SeedHistory(
        AppDbContext context,
        int count,
        int breachedCount,
        int? driverId,
        string route,
        string clientName,
        int startId = 1000,
        string area = "Area-Test")
    {
        for (var i = 0; i < count; i++)
        {
            var breached = i < breachedCount;
            var order = NewOrder(
                id: startId + i,
                waybill: $"HIST-{startId + i}",
                route: route,
                area: area,
                clientName: clientName,
                driverId: driverId);

            if (breached)
            {
                // "Failed" satisfies the breach definition without needing a POD image.
                order.Status = "Failed";
                order.DateCompleted = null;
            }
            else
            {
                order.Status = "Delivered";
                order.DateCompleted = order.ExpectedDelivery.AddHours(-1); // on time
                order.PodImage = "data:image/png;base64,AAAA";
                order.PodStatus = "Submitted";
                order.DriverId = driverId ?? 1;
            }

            context.DeliveryOrders.Add(order);
        }

        context.SaveChanges();
    }

    public static PredictionOutcome NewOutcome(
        int id,
        int deliveryOrderId,
        bool predictedAtRisk,
        bool actuallyBreached,
        DateTime? recordedAt = null)
    {
        return new PredictionOutcome
        {
            Id = id,
            DeliveryOrderId = deliveryOrderId,
            WaybillNo = $"WB-{deliveryOrderId}",
            PredictedAtRisk = predictedAtRisk,
            PredictedRiskScore = predictedAtRisk ? 0.7 : 0.1,
            PredictedRiskLevel = predictedAtRisk ? "High" : "Low",
            PredictedConfidence = 0.75,
            ActuallyBreached = actuallyBreached,
            PredictionMadeAt = DateTime.UtcNow.AddHours(-5),
            OutcomeRecordedAt = recordedAt ?? DateTime.UtcNow
        };
    }

    public static PredictionOutcomeService NewOutcomeService(AppDbContext context)
    {
        return new PredictionOutcomeService(context, NullLogger<PredictionOutcomeService>.Instance);
    }
}

/// <summary>Returns a fixed conditions risk so scoring tests are day-of-week independent.</summary>
internal sealed class StubConditionsService : IExternalConditionsService, IConditionsSnapshot
{
    private readonly double _value;

    public StubConditionsService(double value) => _value = value;

    public Task<IConditionsSnapshot> CreateSnapshotAsync(CancellationToken cancellationToken = default)
        => Task.FromResult<IConditionsSnapshot>(this);

    public double GetConditionsRisk(string? route, string? area, DateTime timestampUtc) => _value;
}
