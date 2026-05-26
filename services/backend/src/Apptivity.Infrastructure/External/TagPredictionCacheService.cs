using Apptivity.Application.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Apptivity.Infrastructure.External;

public sealed class TagPredictionCacheService : ITagPredictionCacheService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IDistributedCache _distributedCache;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<TagPredictionCacheService> _logger;

    public TagPredictionCacheService(
        IDistributedCache distributedCache,
        IMemoryCache memoryCache,
        ILogger<TagPredictionCacheService> logger)
    {
        _distributedCache = distributedCache;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public async Task<TagPredictionResult?> GetAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var key = BuildKey(accountId);

        try
        {
            var cachedJson = await _distributedCache.GetStringAsync(key, cancellationToken);
            if (!string.IsNullOrWhiteSpace(cachedJson))
            {
                var parsed = JsonSerializer.Deserialize<TagPredictionResult>(cachedJson, JsonOptions);
                if (parsed is not null)
                {
                    _memoryCache.Set(key, parsed, CacheTtl);
                    return parsed;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis cache read failed for tag prediction. Key: {Key}", key);
        }

        if (_memoryCache.TryGetValue<TagPredictionResult>(key, out var memoryCached))
        {
            return memoryCached;
        }

        return null;
    }

    public async Task SetAsync(Guid accountId, TagPredictionResult prediction, CancellationToken cancellationToken)
    {
        var key = BuildKey(accountId);

        _memoryCache.Set(key, prediction, CacheTtl);

        try
        {
            var payload = JsonSerializer.Serialize(prediction, JsonOptions);
            await _distributedCache.SetStringAsync(
                key,
                payload,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = CacheTtl
                },
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis cache write failed for tag prediction. Key: {Key}", key);
        }
    }

    private static string BuildKey(Guid accountId)
    {
        return $"recommended:tag-prediction:{accountId:N}";
    }
}
