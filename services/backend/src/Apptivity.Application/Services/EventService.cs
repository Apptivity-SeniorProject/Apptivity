using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class EventService : IEventService
{
    private readonly IEventRepository _eventRepository;
    private readonly IUserContextAccessor _userContextAccessor;
    private readonly IUnitOfWork _unitOfWork;

    public EventService(IEventRepository eventRepository, IUserContextAccessor userContextAccessor, IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _userContextAccessor = userContextAccessor;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<EventResponse>> CreateAsync(CreateEventRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Result<EventResponse>.Failure(ErrorCodes.Unauthorized, "Unauthorized.");
        }

        if (context.Role is not (UserRole.Admin or UserRole.Organization))
        {
            return Result<EventResponse>.Failure(ErrorCodes.EventForbidden, "Only Admin or Organization can create events.");
        }

        if (request.EndUtc <= request.StartUtc)
        {
            return Result<EventResponse>.Failure(ErrorCodes.Validation, "EndUtc must be after StartUtc.");
        }

        var entity = new Event
        {
            Id = Guid.NewGuid(),
            OrganizerId = context.UserId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Location = request.Location.Trim(),
            StartUtc = DateTime.SpecifyKind(request.StartUtc, DateTimeKind.Utc),
            EndUtc = DateTime.SpecifyKind(request.EndUtc, DateTimeKind.Utc),
            BannerUrl = request.BannerUrl,
            Status = EventStatus.Draft
        };

        await _eventRepository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<EventResponse>.Success(ToResponse(entity));
    }

    public async Task<Result<EventResponse>> ChangeStatusAsync(Guid eventId, ChangeEventStatusRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Result<EventResponse>.Failure(ErrorCodes.Unauthorized, "Unauthorized.");
        }

        var entity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (entity is null)
        {
            return Result<EventResponse>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        if (context.Role == UserRole.Organization && entity.OrganizerId != context.UserId)
        {
            return Result<EventResponse>.Failure(ErrorCodes.EventForbidden, "You cannot update this event.");
        }

        if (context.Role == UserRole.Individual)
        {
            return Result<EventResponse>.Failure(ErrorCodes.EventForbidden, "Individuals cannot update event status.");
        }

        if (!IsTransitionValid(entity.Status, request.Status))
        {
            return Result<EventResponse>.Failure(ErrorCodes.Validation, "Invalid event status transition.");
        }

        entity.Status = request.Status;
        entity.UpdatedUtc = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<EventResponse>.Success(ToResponse(entity));
    }

    public async Task<Result<PagedResult<EventResponse>>> GetPagedAsync(EventStatus? status, PagedRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Result<PagedResult<EventResponse>>.Failure(ErrorCodes.Unauthorized, "Unauthorized.");
        }

        request.Normalize();
        var data = await _eventRepository.GetPagedAsync(context.UserId, context.Role, status, request, cancellationToken);
        var mapped = data.Items.Select(ToResponse).ToArray();
        return Result<PagedResult<EventResponse>>.Success(new PagedResult<EventResponse>(mapped, data.TotalCount, data.PageNumber, data.PageSize));
    }

    private static EventResponse ToResponse(Event entity)
    {
        return new EventResponse(entity.Id, entity.OrganizerId, entity.Title, entity.Description, entity.Location, entity.StartUtc, entity.EndUtc, entity.Status, entity.BannerUrl);
    }

    private static bool IsTransitionValid(EventStatus current, EventStatus next)
    {
        return current switch
        {
            EventStatus.Draft => next is EventStatus.Published or EventStatus.Cancelled,
            EventStatus.Published => next is EventStatus.Ongoing or EventStatus.Cancelled,
            EventStatus.Ongoing => next is EventStatus.Completed or EventStatus.Cancelled,
            EventStatus.Completed => false,
            EventStatus.Cancelled => false,
            _ => false
        };
    }
}
