using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace SPXDeliveryAPI.Services
{
    /// <summary>
    /// Short-lived cache for the two aggregate SLA endpoints, plus the single eviction point
    /// used whenever predictions are recomputed.
    /// </summary>
    /// <remarks>
    /// Only whole-dataset aggregates belong here. The row-level endpoints
    /// (<c>/at-risk</c>, <c>/completed</c>) are deliberately left uncached: the dashboard
    /// filters them client-side, so a cached copy would have to be keyed by every filter
    /// permutation to be useful.
    /// </remarks>
    public interface IPredictionCache
    {
        /// <summary>
        /// Returns the cached aggregate for <paramref name="key"/>, or invokes
        /// <paramref name="factory"/> and caches the result for the configured TTL.
        /// </summary>
        Task<T> GetOrCreateAggregateAsync<T>(
            string key,
            Func<Task<T>> factory,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Drops every cached aggregate. Called from
        /// <see cref="PredictionService.RunPredictionsAsync"/> so that any caller of a
        /// recompute — the manual endpoint, the scheduler, or anything added later — evicts
        /// automatically and cannot forget to.
        /// </summary>
        void InvalidateAggregates();
    }

    /// <inheritdoc cref="IPredictionCache"/>
    public sealed class PredictionCache : IPredictionCache
    {
        public const string SlaSummaryKey = "predictions:sla-summary";
        public const string DriverPerformanceKey = "predictions:driver-performance";

        /// <summary>
        /// Every aggregate key. Adding a cached aggregate means adding it here; eviction then
        /// follows automatically.
        /// </summary>
        private static readonly string[] AggregateKeys =
        {
            SlaSummaryKey,
            DriverPerformanceKey
        };

        private const int DefaultTtlSeconds = 60;

        private readonly IMemoryCache _cache;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PredictionCache> _logger;

        public PredictionCache(
            IMemoryCache cache,
            IConfiguration configuration,
            ILogger<PredictionCache> logger)
        {
            _cache = cache;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<T> GetOrCreateAggregateAsync<T>(
            string key,
            Func<Task<T>> factory,
            CancellationToken cancellationToken = default)
        {
            if (_cache.TryGetValue(key, out var cached) && cached is T typed)
            {
                _logger.LogDebug("Prediction aggregate cache HIT for {CacheKey}.", key);
                return typed;
            }

            _logger.LogInformation(
                "Prediction aggregate cache MISS for {CacheKey}; recomputing from the database.",
                key);

            var value = await factory();

            _cache.Set(key, value, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ResolveTtl()
            });

            return value;
        }

        public void InvalidateAggregates()
        {
            foreach (var key in AggregateKeys)
            {
                _cache.Remove(key);
            }

            _logger.LogInformation(
                "Evicted {Count} cached prediction aggregate(s) following a recompute.",
                AggregateKeys.Length);
        }

        /// <summary>
        /// Reads Predictions:SummaryCacheSeconds, defaulting to 60. A non-positive value is
        /// clamped to 1 second rather than 0, because a zero TTL in MemoryCache means the entry
        /// is evicted immediately and every request would recompute.
        /// </summary>
        private TimeSpan ResolveTtl()
        {
            var seconds =
                _configuration.GetValue<int?>("Predictions:SummaryCacheSeconds")
                ?? DefaultTtlSeconds;

            return TimeSpan.FromSeconds(seconds <= 0 ? 1 : seconds);
        }
    }
}
