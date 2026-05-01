using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/events")]
[Authorize]
public sealed class EventsController : ApiControllerBase
{
    private readonly IEventService _eventService;
    private readonly IUserContextAccessor _userContextAccessor;

    public EventsController(IEventService eventService, IUserContextAccessor userContextAccessor)
    {
        _eventService = eventService;
        _userContextAccessor = userContextAccessor;
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
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] bool? isPaid,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var request = new EventSearchRequest(
            searchTerm,
            locationCity,
            primaryTagId,
            startDate,
            endDate,
            isPaid,
            pageNumber,
            pageSize);

        var result = await _eventService.SearchAsync(request, cancellationToken);
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

    /// <summary>
    /// Closes voting for the event and processes all submitted reviews 
    /// to update users' reputation points and clubs' star ratings.
    /// Only the event owner (or Admin) can do this.
    /// </summary>
    [HttpPost("{id:guid}/close-voting")]
    public async Task<IActionResult> CloseVoting(
        [FromRoute] Guid id,
        [FromServices] IEventReputationService reputationService,
        [FromServices] IEventRepository eventRepository,
        [FromServices] IUnitOfWork unitOfWork,
        CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[] { new ErrorDetail("AUTH_401", "Unauthorized.") }));
        }

        var @event = await eventRepository.GetByIdAsync(id, cancellationToken);
        if (@event is null)
        {
            return NotFound(ApiEnvelope<object?>.Failure(new[] { new ErrorDetail("EVENT_404", "Event not found.") }));
        }

        // Must be owner or Admin
        if (@event.OwnerId != context.AccountId && context.AccountType != AccountType.Admin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("EVENT_403", "Only the event owner or admin can close voting.")
            }));
        }

        if (@event.Status != EventStatus.Completed)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("EVENT_400", "Event must be completed to close voting.")
            }));
        }

        if (@event.IsVotingClosed)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("EVENT_400_CLOSED", "Voting is already closed for this event.")
            }));
        }

        await reputationService.CalculateEventReputationsAsync(id, cancellationToken);
        
        @event.IsVotingClosed = true;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Ok(ApiEnvelope<object>.Success(new { message = "Voting closed and reputations updated." }));
    }

    [HttpGet("{id:guid}/participants")]
    public async Task<IActionResult> GetParticipants(Guid id, CancellationToken cancellationToken)
    {
        var result = await _eventService.GetEventParticipantsAsync(id, cancellationToken);
        return FromResult(result);
    }
}
