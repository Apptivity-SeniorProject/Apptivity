using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Profiles;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/profiles")]
[Authorize]
public sealed class ProfileController : ApiControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IUserContextAccessor _userContextAccessor;

    public ProfileController(IProfileService profileService, IUserContextAccessor userContextAccessor)
    {
        _profileService = profileService;
        _userContextAccessor = userContextAccessor;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Search(
        [FromQuery] string? query,
        [FromQuery] Domain.Enums.AccountType? accountType,
        [FromQuery] string? city,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var request = new ProfileSearchRequest(query, accountType, city, pageNumber, pageSize);
        var result = await _profileService.SearchAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _profileService.GetMeAsync(context, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _profileService.GetByIdAsync(id, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("{id:guid}/stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStats(Guid id, CancellationToken cancellationToken)
    {
        var result = await _profileService.GetStatsAsync(id, cancellationToken);
        return FromResult(result);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _profileService.UpdateMeAsync(context, request, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("me/photo")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UpdatePhoto([FromForm] ProfilePhotoUpdateRequest request, CancellationToken cancellationToken)
    {
        var file = request.File;
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("VAL_001", "Profile photo file is required.")
            }, HttpContext.TraceIdentifier));
        }

        await using var stream = file.OpenReadStream();
        var result = await _profileService.UpdateMyPhotoAsync(context, stream, file.FileName, cancellationToken);
        return FromResult(result);
    }

    [HttpDelete("me")]
    public async Task<IActionResult> DeactivateMe(CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _profileService.DeactivateMeAsync(context, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("me/status")]
    public async Task<IActionResult> GetMyStatus(CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _profileService.GetMyStatusAsync(context, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("me/status")]
    public async Task<IActionResult> UpdateMyStatus([FromBody] UpdateMyAccountStatusRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _profileService.UpdateMyStatusAsync(context, request, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("{id:guid}/events")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEvents(
        Guid id,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _profileService.GetEventsAsync(id, pageNumber, pageSize, cancellationToken);
        return FromResult(result);
    }

    public sealed class ProfilePhotoUpdateRequest
    {
        public IFormFile File { get; set; } = null!;
    }
}
