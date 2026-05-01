using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Interfaces;
<<<<<<< Updated upstream
=======
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
>>>>>>> Stashed changes
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/events")]
[Authorize]
public sealed class EventsController : ApiControllerBase
{
<<<<<<< Updated upstream
    private readonly IEventService _eventService;
=======
    private readonly IEventRepository _eventRepository;
>>>>>>> Stashed changes
    private readonly IUserContextAccessor _userContextAccessor;

<<<<<<< Updated upstream
    public EventsController(IEventService eventService, IUserContextAccessor userContextAccessor)
=======
    public EventsController(IEventRepository eventRepository, IUserContextAccessor userContextAccessor, IUnitOfWork unitOfWork)
>>>>>>> Stashed changes
    {
        _eventService = eventService;
        _userContextAccessor = userContextAccessor;
    }

    [HttpGet]
    public async Task<IActionResult> Search(
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
            locationCity,
            primaryTagId,
            startDate,
            endDate,
            isPaid,
            pageNumber,
            pageSize);

<<<<<<< Updated upstream
        var result = await _eventService.SearchAsync(request, cancellationToken);
        return FromResult(result);
=======
        if (pageSize < 1)
        {
            pageSize = 20;
        }

        if (pageSize > 100)
        {
            pageSize = 100;
        }

        var query = _eventRepository.Query().AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Time)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.Id,
                x.OwnerId,
                x.PrimaryTagId,
                x.Name,
                x.Description,
                x.Date,
                x.Time,
                x.Capacity,
                x.Status,
                x.Price,
                x.LocationData,
                x.IsVotingClosed
            })
            .ToListAsync(cancellationToken);

        var payload = new PagedResult<object>(items.Cast<object>().ToArray(), totalCount, pageNumber, pageSize);
        return Ok(ApiEnvelope<PagedResult<object>>.Success(payload));
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
        var result = await _eventService.ApplyToEventAsync(id, context, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("{eventId:guid}/participants/{userId:guid}/status")]
    [Authorize(Roles = "Organization,Admin")]
    public async Task<IActionResult> UpdateParticipationStatus(
        Guid eventId,
        Guid userId,
        [FromBody] ManageParticipationStatusRequest request,
=======
        if (context.AccountType is not (AccountType.Admin or AccountType.Organization))
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("EVENT_401", "Only Admin or Organization can create events.")
            }));
        }

        if (request.Capacity <= 0)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("VAL_001", "Capacity must be greater than zero.")
            }));
        }

        var entity = new Event
        {
            Id = Guid.NewGuid(),
            OwnerId = context.AccountId,
            PrimaryTagId = request.PrimaryTagId,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            Date = request.Date,
            Time = request.Time,
            Capacity = request.Capacity,
            Status = EventStatus.Draft,
            Price = request.Price,
            LocationData = request.LocationData
        };

        await _eventRepository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var response = new
        {
            entity.Id,
            entity.OwnerId,
            entity.PrimaryTagId,
            entity.Name,
            entity.Description,
            entity.Date,
            entity.Time,
            entity.Capacity,
            entity.Status,
            entity.Price,
            entity.LocationData,
            entity.IsVotingClosed
        };

        return Ok(ApiEnvelope<object>.Success(response));
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
>>>>>>> Stashed changes
        CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
<<<<<<< Updated upstream
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
=======
            return Unauthorized(ApiEnvelope<object?>.Failure(new[] { new ErrorDetail("AUTH_401", "Unauthorized.") }));
        }

        var @event = await _eventRepository.GetByIdAsync(id, cancellationToken);
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
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Ok(ApiEnvelope<object>.Success(new { message = "Voting closed and reputations updated." }));
    }

    public sealed record CreateEventRequest(
        Guid? PrimaryTagId,
        string Name,
        string Description,
        DateOnly Date,
        TimeOnly Time,
        int Capacity,
        decimal Price,
        string? LocationData);
>>>>>>> Stashed changes
}
