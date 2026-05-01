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
    private readonly IParticipationRepository _participationRepository;
    private readonly IEventLifecycleService _eventLifecycleService;
    private readonly INotificationService _notificationService;
    private readonly IUnitOfWork _unitOfWork;

    public EventService(
        IEventRepository eventRepository,
        IParticipationRepository participationRepository,
        IEventLifecycleService eventLifecycleService,
        INotificationService notificationService,
        IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _participationRepository = participationRepository;
        _eventLifecycleService = eventLifecycleService;
        _notificationService = notificationService;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<PagedResult<EventSummaryDto>>> SearchAsync(EventSearchRequest request, CancellationToken cancellationToken)
    {
        await _eventLifecycleService.ProcessTransitionsAndNotifyAsync(cancellationToken);

        var paging = new PagedRequest
        {
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
        paging.Normalize();

        var filter = new EventSearchFilter(
            request.LocationCity,
            request.PrimaryTagId,
            request.StartDate,
            request.EndDate,
            request.IsPaid);

        var (items, totalCount) = await _eventRepository.SearchAsync(filter, paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items
            .Select(MapEventSummary)
            .ToArray();

        return Result<PagedResult<EventSummaryDto>>.Success(new PagedResult<EventSummaryDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    public async Task<Result<ApplyToEventResponse>> ApplyToEventAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
    {
        if (userContext.AccountType != AccountType.Individual)
        {
            return Result<ApplyToEventResponse>.Failure(ErrorCodes.EventUnauthorized, "Only individual accounts can apply to events.");
        }

        await _eventLifecycleService.ProcessTransitionsAndNotifyAsync(cancellationToken);

        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result<ApplyToEventResponse>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        if (eventEntity.Status != EventStatus.Published)
        {
            return Result<ApplyToEventResponse>.Failure(ErrorCodes.EventInvalidState, "Applications are allowed only for published events.");
        }

        var existingParticipation = await _participationRepository.GetByUserAndEventAsync(userContext.AccountId, eventId, cancellationToken);
        if (existingParticipation is not null)
        {
            if (existingParticipation.Status == ParticipationStatus.Withdrawn || existingParticipation.Status == ParticipationStatus.Rejected)
            {
                existingParticipation.Status = ParticipationStatus.Pending;
                existingParticipation.RejectionReason = null;
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<ApplyToEventResponse>.Success(new ApplyToEventResponse(eventId, userContext.AccountId, existingParticipation.Status));
            }

            return Result<ApplyToEventResponse>.Failure(ErrorCodes.ParticipationInvalidState, "You already have an active participation for this event.");
        }

        var participation = new Participation
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            UserId = userContext.AccountId,
            Status = ParticipationStatus.Pending,
            RejectionReason = null
        };

        await _participationRepository.AddAsync(participation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ApplyToEventResponse>.Success(new ApplyToEventResponse(eventId, userContext.AccountId, participation.Status));
    }

    public async Task<Result<ParticipationStatusDto>> UpdateParticipationStatusAsync(Guid eventId, Guid userId, ManageParticipationStatusRequest request, UserContext userContext, CancellationToken cancellationToken)
    {
        if (request.Status is not (ParticipationStatus.Approved or ParticipationStatus.Rejected))
        {
            return Result<ParticipationStatusDto>.Failure(ErrorCodes.Validation, "Status must be Approved or Rejected.");
        }

        if (request.Status == ParticipationStatus.Rejected && string.IsNullOrWhiteSpace(request.RejectionReason))
        {
            return Result<ParticipationStatusDto>.Failure(ErrorCodes.Validation, "Rejection reason is required when rejecting a participation.");
        }

        await _eventLifecycleService.ProcessTransitionsAndNotifyAsync(cancellationToken);

        var participation = await _participationRepository.GetByEventAndUserAsync(eventId, userId, cancellationToken);
        if (participation is null)
        {
            return Result<ParticipationStatusDto>.Failure(ErrorCodes.ParticipationNotFound, "Participation not found.");
        }

        var eventEntity = participation.Event;
        if (eventEntity.OwnerId != userContext.AccountId && userContext.AccountType != AccountType.Admin)
        {
            return Result<ParticipationStatusDto>.Failure(ErrorCodes.EventUnauthorized, "You are not authorized to manage this event participation.");
        }

        if (participation.Status == ParticipationStatus.Withdrawn)
        {
            return Result<ParticipationStatusDto>.Failure(ErrorCodes.ParticipationInvalidState, "Withdrawn participations cannot be updated.");
        }

        if (request.Status == ParticipationStatus.Approved && participation.Status != ParticipationStatus.Approved)
        {
            await EnsureRemainingCountIsInitializedAsync(eventEntity, cancellationToken);

            if (eventEntity.RemainingParticipationCount <= 0)
            {
                return Result<ParticipationStatusDto>.Failure(ErrorCodes.EventCapacityFull, "No remaining participation capacity.");
            }

            eventEntity.RemainingParticipationCount -= 1;
        }
        else if (participation.Status == ParticipationStatus.Approved && request.Status != ParticipationStatus.Approved)
        {
            eventEntity.RemainingParticipationCount += 1;
        }

        participation.Status = request.Status;
        participation.RejectionReason = request.Status == ParticipationStatus.Rejected
            ? request.RejectionReason?.Trim()
            : null;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var notificationTitle = request.Status == ParticipationStatus.Approved
            ? "Participation Approved"
            : "Participation Rejected";
        var notificationBody = request.Status == ParticipationStatus.Approved
            ? $"Your participation for '{eventEntity.Name}' has been approved."
            : $"Your participation for '{eventEntity.Name}' has been rejected.";

        await _notificationService.SendToAccountAsync(
            new PushNotificationRequest(
                userId,
                notificationTitle,
                notificationBody,
                new Dictionary<string, string>
                {
                    ["eventId"] = eventId.ToString(),
                    ["status"] = request.Status.ToString()
                }),
            cancellationToken);

        return Result<ParticipationStatusDto>.Success(
            new ParticipationStatusDto(eventId, userId, participation.Status, participation.RejectionReason));
    }

    public async Task<Result<ParticipationStatusDto>> WithdrawAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
    {
        if (userContext.AccountType != AccountType.Individual)
        {
            return Result<ParticipationStatusDto>.Failure(ErrorCodes.EventUnauthorized, "Only individual accounts can withdraw participation.");
        }

        var participation = await _participationRepository.GetByUserAndEventAsync(userContext.AccountId, eventId, cancellationToken);
        if (participation is null)
        {
            return Result<ParticipationStatusDto>.Failure(ErrorCodes.ParticipationNotFound, "Participation not found.");
        }

        if (participation.Status is not (ParticipationStatus.Pending or ParticipationStatus.Approved))
        {
            return Result<ParticipationStatusDto>.Failure(ErrorCodes.ParticipationInvalidState, "Only pending or approved participations can be withdrawn.");
        }

        if (participation.Status == ParticipationStatus.Approved)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
            if (eventEntity is not null)
            {
                eventEntity.RemainingParticipationCount += 1;
            }
        }

        participation.Status = ParticipationStatus.Withdrawn;
        participation.RejectionReason = null;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ParticipationStatusDto>.Success(
            new ParticipationStatusDto(eventId, userContext.AccountId, participation.Status, participation.RejectionReason));
    }

    public async Task<Result<PagedResult<MyParticipationDto>>> GetMyParticipationsAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken)
    {
        if (userContext.AccountType != AccountType.Individual)
        {
            return Result<PagedResult<MyParticipationDto>>.Failure(ErrorCodes.EventUnauthorized, "Only individual accounts have personal participations.");
        }

        await _eventLifecycleService.ProcessTransitionsAndNotifyAsync(cancellationToken);

        var paging = new PagedRequest
        {
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        paging.Normalize();

        var (items, totalCount) = await _participationRepository.GetByUserAsync(userContext.AccountId, paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items
            .Select(x => new MyParticipationDto(
                x.EventId,
                x.Event.Name,
                x.Event.Date,
                x.Event.Time,
                x.Event.Status,
                x.Status,
                x.RejectionReason))
            .ToArray();

        return Result<PagedResult<MyParticipationDto>>.Success(new PagedResult<MyParticipationDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    private async Task EnsureRemainingCountIsInitializedAsync(Event eventEntity, CancellationToken cancellationToken)
    {
        if (eventEntity.RemainingParticipationCount > 0)
        {
            return;
        }

        var approvedCount = await _participationRepository.CountApprovedByEventAsync(eventEntity.Id, cancellationToken);
        var remaining = eventEntity.Capacity - approvedCount;
        eventEntity.RemainingParticipationCount = remaining < 0 ? 0 : remaining;
    }

    private static EventSummaryDto MapEventSummary(Event eventEntity)
    {
        return new EventSummaryDto(
            eventEntity.Id,
            eventEntity.OwnerId,
            eventEntity.PrimaryTagId,
            eventEntity.Name,
            eventEntity.Description,
            eventEntity.Date,
            eventEntity.Time,
            eventEntity.DurationMinutes,
            eventEntity.Capacity,
            eventEntity.RemainingParticipationCount,
            eventEntity.Status,
            eventEntity.Price,
            eventEntity.LocationData);
    }
}
