using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
using Apptivity.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/v1/events")]
[Authorize]
public sealed class EventsController : ApiControllerBase
{
    private readonly EventRepository _eventRepository;
    private readonly IUserContextAccessor _userContextAccessor;
    private readonly IUnitOfWork _unitOfWork;

    public EventsController(EventRepository eventRepository, IUserContextAccessor userContextAccessor, IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _userContextAccessor = userContextAccessor;
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] EventStatus? status, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
        {
            pageNumber = 1;
        }

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
                x.LocationData
            })
            .ToListAsync(cancellationToken);

        var payload = new PagedResult<object>(items.Cast<object>().ToArray(), totalCount, pageNumber, pageSize);
        return Ok(ApiEnvelope<PagedResult<object>>.Success(payload));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Organization")]
    public async Task<IActionResult> Create([FromBody] CreateEventRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

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
            entity.LocationData
        };

        return Ok(ApiEnvelope<object>.Success(response));
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
}
