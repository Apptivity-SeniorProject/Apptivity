using Apptivity.Api.Common;
using Apptivity.Application.Contracts.Tags;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/tags")]
public sealed class TagsController : ApiControllerBase
{
    private const string CacheKey = "tags:active";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

    private readonly ITagService _tagService;
    private readonly IMemoryCache _memoryCache;

    public TagsController(ITagService tagService, IMemoryCache memoryCache)
    {
        _tagService = tagService;
        _memoryCache = memoryCache;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActive(CancellationToken cancellationToken)
    {
        var cached = await _memoryCache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            var result = await _tagService.GetActiveTagsAsync(cancellationToken);
            return result.IsSuccess ? result.Data : null;
        });

        if (cached is not null)
        {
            return Ok(ApiEnvelope<IReadOnlyCollection<TagListItemDto>?>.Success(cached, HttpContext.TraceIdentifier));
        }

        var result = await _tagService.GetActiveTagsAsync(cancellationToken);
        return FromResult(result);
    }
}
