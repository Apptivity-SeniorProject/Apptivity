using Apptivity.Api.Common;
using Apptivity.Api.Security;
using Apptivity.Application.Contracts.Tags;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/admin/tags")]
[AdminAuthorize]
public sealed class AdminTagsController : ApiControllerBase
{
    private const string CacheKey = "tags:active";

    private readonly ITagService _tagService;
    private readonly IMemoryCache _memoryCache;

    public AdminTagsController(ITagService tagService, IMemoryCache memoryCache)
    {
        _tagService = tagService;
        _memoryCache = memoryCache;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTagRequest request, CancellationToken cancellationToken)
    {
        var result = await _tagService.CreateAsync(request, cancellationToken);
        if (result.IsSuccess)
        {
            _memoryCache.Remove(CacheKey);
        }

        return FromResult(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTagRequest request, CancellationToken cancellationToken)
    {
        var result = await _tagService.UpdateAsync(id, request, cancellationToken);
        if (result.IsSuccess)
        {
            _memoryCache.Remove(CacheKey);
        }

        return FromResult(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _tagService.SoftDeleteAsync(id, cancellationToken);
        if (result.IsSuccess)
        {
            _memoryCache.Remove(CacheKey);
        }

        return FromResult(result);
    }
}
