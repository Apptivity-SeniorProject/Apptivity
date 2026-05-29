using Apptivity.Api.Common;
using Apptivity.Api.Options;
using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/events")]
[Authorize]
public sealed class EventsController : ApiControllerBase
{
    private readonly IEventService _eventService;
    private readonly IUserContextAccessor _userContextAccessor;
    private readonly RecommendationOptions _recommendationOptions;

    public EventsController(
        IEventService eventService,
        IUserContextAccessor userContextAccessor,
        IOptions<RecommendationOptions> recommendationOptions)
    {
        _eventService = eventService;
        _userContextAccessor = userContextAccessor;
        _recommendationOptions = recommendationOptions.Value;
    }

    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null) return Unauthorized();

        var result = await _eventService.CreateEventAsync(request, context, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEventDetails(Guid id, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser() ?? new UserContext(Guid.Empty, AccountType.Individual);
        var result = await _eventService.GetEventDetailsAsync(id, context, cancellationToken);
        return FromResult(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null) return Unauthorized();

        var result = await _eventService.UpdateEventAsync(id, request, context, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Organization,Admin")]
    public async Task<IActionResult> UpdateEventStatus(Guid id, [FromBody] UpdateEventStatusRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _eventService.UpdateEventStatusAsync(id, request, context, cancellationToken);
        return FromResult(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> CancelEvent(Guid id, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null) return Unauthorized();

        var result = await _eventService.CancelEventAsync(id, context, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("my-events")]
    public async Task<IActionResult> GetMyCreatedEvents(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null) return Unauthorized();

        var result = await _eventService.GetMyCreatedEventsAsync(pageNumber, pageSize, context, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("{id:guid}/similar")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSimilarEvents(Guid id, [FromQuery] int count = 5, CancellationToken cancellationToken = default)
    {
        var result = await _eventService.GetSimilarEventsAsync(id, count, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("{id:guid}/bookmark")]
    public async Task<IActionResult> ToggleBookmark(Guid id, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null) return Unauthorized();

        var result = await _eventService.ToggleBookmarkAsync(id, context, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("my-bookmarks")]
    public async Task<IActionResult> GetMyBookmarks(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null) return Unauthorized();

        var result = await _eventService.GetMyBookmarksAsync(pageNumber, pageSize, context, cancellationToken);
        return FromResult(result);
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? searchTerm,
        [FromQuery] string? locationCity,
        [FromQuery] Guid? primaryTagId,
        [FromQuery] List<Guid>? tagIds,
        [FromQuery] DateOnly? startDate = null,
        [FromQuery] DateOnly? endDate = null,
        [FromQuery] bool? isPaid = null,
        [FromQuery] decimal? userLat = null,
        [FromQuery] decimal? userLng = null,
        [FromQuery] int? nearbyRadiusKm = null,
        [FromQuery] string? sort = null,
        [FromQuery] bool matchAllTags = false,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if ((userLat.HasValue && !userLng.HasValue) || (!userLat.HasValue && userLng.HasValue))
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail(ErrorCodes.Validation, "userLat and userLng must be provided together.")
            }, HttpContext.TraceIdentifier));
        }

        if (userLat is < -90 or > 90)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail(ErrorCodes.Validation, "userLat must be between -90 and 90.")
            }, HttpContext.TraceIdentifier));
        }

        if (userLng is < -180 or > 180)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail(ErrorCodes.Validation, "userLng must be between -180 and 180.")
            }, HttpContext.TraceIdentifier));
        }

        if (nearbyRadiusKm.HasValue && (nearbyRadiusKm.Value < 1 || nearbyRadiusKm.Value > 50))
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail(ErrorCodes.Validation, "nearbyRadiusKm must be between 1 and 50.")
            }, HttpContext.TraceIdentifier));
        }

        if (!string.IsNullOrWhiteSpace(sort)
            && !string.Equals(sort, "nearby", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(sort, "recent", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail(ErrorCodes.Validation, "sort must be either 'nearby' or 'recent'.")
            }, HttpContext.TraceIdentifier));
        }

        var request = new EventSearchRequest(
            searchTerm,
            locationCity,
            primaryTagId,
            tagIds,
            matchAllTags,
            startDate,
            endDate,
            isPaid,
            userLat,
            userLng,
            nearbyRadiusKm,
            sort,
            pageNumber,
            pageSize);

        var result = await _eventService.SearchAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("recommended")]
    [Authorize(Roles = "Individual")]
    public async Task<IActionResult> GetRecommended(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        Response.Headers.Append("Deprecation", "true");
        Response.Headers.Append("Sunset", "Fri, 31 Jul 2026 23:59:59 GMT");

        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var result = await _eventService.GetRecommendedAsync(context, pageNumber, pageSize, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("recommended")]
    [Authorize(Roles = "Individual")]
    public async Task<IActionResult> GetRecommendedV6(
        [FromBody] RecommendedEventsRequest request,
        CancellationToken cancellationToken = default)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var validationError = ValidateRecommendedRequest(request);
        if (validationError is not null)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail(ErrorCodes.Validation, validationError)
            }, HttpContext.TraceIdentifier));
        }

        if (_recommendationOptions.KillSwitchEnabled || !_recommendationOptions.RecommendedV6Enabled)
        {
            var legacyResult = await _eventService.GetRecommendedAsync(context, request.PageNumber, request.PageSize, cancellationToken);
            if (!legacyResult.IsSuccess)
            {
                return FromResult(Result<PagedResult<RecommendedEventSummaryDto>>.Failure(legacyResult.Errors));
            }

            var mapped = MapLegacyToV6Response(legacyResult.Data!);
            return Ok(ApiEnvelope<PagedResult<RecommendedEventSummaryDto>?>.Success(mapped, HttpContext.TraceIdentifier));
        }

        if (!IsUserInRolloutCohort(context.AccountId, _recommendationOptions.RolloutPercentage))
        {
            var legacyResult = await _eventService.GetRecommendedAsync(context, request.PageNumber, request.PageSize, cancellationToken);
            if (!legacyResult.IsSuccess)
            {
                return FromResult(Result<PagedResult<RecommendedEventSummaryDto>>.Failure(legacyResult.Errors));
            }

            var mapped = MapLegacyToV6Response(legacyResult.Data!);
            return Ok(ApiEnvelope<PagedResult<RecommendedEventSummaryDto>?>.Success(mapped, HttpContext.TraceIdentifier));
        }

        var result = await _eventService.GetRecommendedV6Async(context, request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("recommended/daily/next")]
    [Authorize(Roles = "Individual")]
    public async Task<IActionResult> GetDailyRecommendedNext(
        [FromBody] DailyRecommendedNextRequest request,
        CancellationToken cancellationToken = default)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _eventService.GetDailyRecommendedNextAsync(context, request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("{id:guid}/apply")]
    [Authorize(Roles = "Individual")]
    public async Task<IActionResult> Apply(Guid id, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var result = await _eventService.ApplyToEventAsync(id, context, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("{eventId:guid}/participants/{userId:guid}/status")]
    [Authorize(Roles = "Organization,Admin")]
    public async Task<IActionResult> UpdateParticipationStatus(
        Guid eventId,
        Guid userId,
        [FromBody] ManageParticipationStatusRequest request,
        CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var result = await _eventService.UpdateParticipationStatusAsync(eventId, userId, request, context, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("{id:guid}/withdraw")]
    [Authorize(Roles = "Individual")]
    public async Task<IActionResult> Withdraw(Guid id, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var result = await _eventService.WithdrawAsync(id, context, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("my-participations")]
    [Authorize(Roles = "Individual")]
    public async Task<IActionResult> GetMyParticipations(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var result = await _eventService.GetMyParticipationsAsync(pageNumber, pageSize, context, cancellationToken);
        return FromResult(result);
    }


    [HttpGet("{id:guid}/participants")]
    public async Task<IActionResult> GetParticipants(Guid id, CancellationToken cancellationToken)
    {
        var result = await _eventService.GetEventParticipantsAsync(id, cancellationToken);
        return FromResult(result);
    }

    private static string? ValidateRecommendedRequest(RecommendedEventsRequest request)
    {
        if (request.PageNumber <= 0)
        {
            return "pageNumber must be greater than 0.";
        }

        if (request.PageSize <= 0)
        {
            return "pageSize must be greater than 0.";
        }

        var zones = request.OrderedHotZones;
        if (zones is null)
        {
            return null;
        }

        if (zones.Count < 1 || zones.Count > 3)
        {
            return "ordered_hot_zones must contain 1 to 3 items.";
        }

        var usedPriorities = new HashSet<int>();

        foreach (var zone in zones)
        {
            if (zone.Priority is < 1 or > 3)
            {
                return "ordered_hot_zones priority must be one of 1, 2, or 3.";
            }

            if (!usedPriorities.Add(zone.Priority))
            {
                return "ordered_hot_zones priorities must be unique.";
            }

            if (zone.Lat is < -90 or > 90)
            {
                return "ordered_hot_zones lat must be between -90 and 90.";
            }

            if (zone.Lng is < -180 or > 180)
            {
                return "ordered_hot_zones lng must be between -180 and 180.";
            }

            if (!HasMaxDecimalPlaces(zone.Lat, 4) || !HasMaxDecimalPlaces(zone.Lng, 4))
            {
                return "ordered_hot_zones coordinates must have at most 4 decimal places.";
            }
        }

        return null;
    }

    private static bool HasMaxDecimalPlaces(decimal value, int maxDecimalPlaces)
    {
        var bits = decimal.GetBits(value);
        var scale = (bits[3] >> 16) & 0xFF;
        return scale <= maxDecimalPlaces;
    }

    private static bool IsUserInRolloutCohort(Guid accountId, int rolloutPercentage)
    {
        if (rolloutPercentage <= 0)
        {
            return false;
        }

        if (rolloutPercentage >= 100)
        {
            return true;
        }

        var userBytes = accountId.ToByteArray();
        var hashBytes = SHA256.HashData(userBytes);
        var bucket = hashBytes[0] % 100;
        return bucket < rolloutPercentage;
    }

    private static PagedResult<RecommendedEventSummaryDto> MapLegacyToV6Response(PagedResult<EventSummaryDto> source)
    {
        var mappedItems = source.Items.Select(x => new RecommendedEventSummaryDto(
            x.Id,
            x.OwnerId,
            x.PrimaryTagId,
            x.Tags,
            x.Name,
            x.Description,
            x.BannerImage,
            x.Date,
            x.Time,
            x.DurationMinutes,
            x.Capacity,
            x.RemainingParticipationCount,
            x.Status,
            x.Price,
            x.LocationData,
            null,
            null)).ToArray();

        return new PagedResult<RecommendedEventSummaryDto>(mappedItems, source.TotalCount, source.PageNumber, source.PageSize);
    }
}
