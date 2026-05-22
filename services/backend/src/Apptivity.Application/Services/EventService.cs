using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Contracts.Tags;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
using System.Text.Json;

namespace Apptivity.Application.Services;

public sealed class EventService : IEventService
{
    private readonly IEventRepository _eventRepository;
    private readonly IEventBookmarkRepository _eventBookmarkRepository;
    private readonly IParticipationRepository _participationRepository;
    private readonly IUserRepository _userRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IEventLifecycleService _eventLifecycleService;
    private readonly INotificationService _notificationService;
    private readonly IUnitOfWork _unitOfWork;

    public EventService(
        IEventRepository eventRepository,
        IEventBookmarkRepository eventBookmarkRepository,
        IParticipationRepository participationRepository,
        IUserRepository userRepository,
        ITagRepository tagRepository,
        IEventLifecycleService eventLifecycleService,
        INotificationService notificationService,
        IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _eventBookmarkRepository = eventBookmarkRepository;
        _participationRepository = participationRepository;
        _userRepository = userRepository;
        _tagRepository = tagRepository;
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
            request.SearchTerm,
            request.LocationCity,
            request.PrimaryTagId,
            request.TagIds,
            request.MatchAllTags,
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

                return Result<ApplyToEventResponse>.Success(new ApplyToEventResponse(eventId, userContext.AccountId, existingParticipation.Status, eventEntity.Status));
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

        return Result<ApplyToEventResponse>.Success(new ApplyToEventResponse(eventId, userContext.AccountId, participation.Status, eventEntity.Status));
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
            new ParticipationStatusDto(eventId, userId, participation.Status, participation.RejectionReason, eventEntity.Status));
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
            var eventEntityForCapacity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
            if (eventEntityForCapacity is not null)
            {
                eventEntityForCapacity.RemainingParticipationCount += 1;
            }
        }

        participation.Status = ParticipationStatus.Withdrawn;
        participation.RejectionReason = null;

        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        var eventStatus = eventEntity?.Status ?? EventStatus.Cancelled;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ParticipationStatusDto>.Success(
            new ParticipationStatusDto(eventId, userContext.AccountId, participation.Status, participation.RejectionReason, eventStatus));
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

    public async Task<Result<EventParticipantsResponse>> GetEventParticipantsAsync(Guid eventId, CancellationToken cancellationToken)
    {
        var eventEntity = await _eventRepository.GetWithParticipantsAsync(eventId, cancellationToken);

        if (eventEntity is null)
        {
            return Result<EventParticipantsResponse>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        var ownerDto = new EventParticipantProfileDto(
            eventEntity.OwnerId,
            eventEntity.Owner.Type,
            eventEntity.Owner.Username,
            eventEntity.Owner.ProfilePhoto,
            eventEntity.Owner.Type == AccountType.Organization && eventEntity.Owner.ClubProfile != null ? eventEntity.Owner.ClubProfile.Name :
            eventEntity.Owner.UserProfile != null ? eventEntity.Owner.UserProfile.Name + " " + eventEntity.Owner.UserProfile.Surname : eventEntity.Owner.Username,
            null);

        var participantDtos = eventEntity.Participations.Select(p => new EventParticipantProfileDto(
            p.UserId,
            p.User.Account.Type,
            p.User.Account.Username,
            p.User.Account.ProfilePhoto,
            p.User.Name + " " + p.User.Surname,
            p.Status)).ToList();

        return Result<EventParticipantsResponse>.Success(new EventParticipantsResponse(eventEntity.Id, eventEntity.Status, ownerDto, participantDtos));
    }

    public async Task<Result<EventSummaryDto>> CreateEventAsync(CreateEventRequest request, UserContext userContext, CancellationToken cancellationToken)
    {
        var validationError = ValidateCreateEventRequest(request);
        if (validationError is not null)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.Validation, validationError);
        }

        var normalizedTagIds = NormalizeTagIds(request.PrimaryTagId, request.TagIds);
        var tags = normalizedTagIds.Count == 0
            ? Array.Empty<Tag>()
            : await _tagRepository.GetActiveByIdsAsync(normalizedTagIds, cancellationToken);

        if (tags.Count != normalizedTagIds.Count)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.Validation, "One or more tags are invalid or inactive.");
        }

        var resolvedPrimaryTagId = request.PrimaryTagId ?? normalizedTagIds.FirstOrDefault();

        var eventEntity = new Event
        {
            Id = Guid.NewGuid(),
            OwnerId = userContext.AccountId,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            Date = request.Date,
            Time = request.Time,
            DurationMinutes = request.DurationMinutes,
            Capacity = request.Capacity,
            RemainingParticipationCount = request.Capacity,
            Price = request.Price,
            LocationData = request.LocationData?.Trim(),
            PrimaryTagId = resolvedPrimaryTagId == Guid.Empty ? null : resolvedPrimaryTagId,
            Status = EventStatus.PendingApproval
        };

        foreach (var tag in tags)
        {
            eventEntity.Tags.Add(tag);
        }

        await _eventRepository.AddAsync(eventEntity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<EventSummaryDto>.Success(MapEventSummary(eventEntity));
    }

    public async Task<Result<EventDetailsDto>> GetEventDetailsAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
    {
        var eventEntity = await _eventRepository.GetWithParticipantsAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result<EventDetailsDto>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        bool isBookmarked = false;
        ParticipationStatus? participationStatus = null;

        if (userContext.AccountId != Guid.Empty)
        {
            isBookmarked = await _eventBookmarkRepository.HasBookmarkedAsync(userContext.AccountId, eventId, cancellationToken);
            
            var participation = eventEntity.Participations.FirstOrDefault(p => p.UserId == userContext.AccountId);
            if (participation is null)
            {
                var existingParticipation = await _participationRepository.GetByUserAndEventAsync(userContext.AccountId, eventId, cancellationToken);
                participationStatus = existingParticipation?.Status;
            }
            else
            {
                participationStatus = participation.Status;
            }
        }

        var dto = new EventDetailsDto(
            eventEntity.Id,
            eventEntity.OwnerId,
            eventEntity.Owner.Type == AccountType.Organization && eventEntity.Owner.ClubProfile != null ? eventEntity.Owner.ClubProfile.Name :
            eventEntity.Owner.UserProfile != null ? eventEntity.Owner.UserProfile.Name + " " + eventEntity.Owner.UserProfile.Surname : eventEntity.Owner.Username,
            eventEntity.Owner.Type,
            eventEntity.Owner.ProfilePhoto,
            eventEntity.PrimaryTagId,
            eventEntity.PrimaryTag?.Name,
            MapTags(eventEntity.Tags),
            eventEntity.Name,
            eventEntity.Description,
            eventEntity.Date,
            eventEntity.Time,
            eventEntity.DurationMinutes,
            eventEntity.Capacity,
            eventEntity.RemainingParticipationCount,
            eventEntity.Status,
            eventEntity.Price,
            eventEntity.LocationData,
            isBookmarked,
            participationStatus);

        return Result<EventDetailsDto>.Success(dto);
    }

    public async Task<Result<EventSummaryDto>> UpdateEventAsync(Guid eventId, UpdateEventRequest request, UserContext userContext, CancellationToken cancellationToken)
    {
        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        if (eventEntity.OwnerId != userContext.AccountId)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventUnauthorized, "Only the owner can update the event.");
        }

        if (eventEntity.Status != EventStatus.Draft
            && eventEntity.Status != EventStatus.PendingApproval
            && eventEntity.Status != EventStatus.Rejected
            && eventEntity.Status != EventStatus.Published)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventInvalidState, "Only Draft, PendingApproval, Rejected or Published events can be updated.");
        }

        eventEntity.Name = request.Name;
        eventEntity.Description = request.Description;
        eventEntity.Date = request.Date;
        eventEntity.Time = request.Time;
        eventEntity.DurationMinutes = request.DurationMinutes;
        eventEntity.LocationData = request.LocationData;

        if (request.Capacity < eventEntity.Capacity - eventEntity.RemainingParticipationCount)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventCapacityFull, "New capacity cannot be less than the current approved participants.");
        }

        var capacityDifference = request.Capacity - eventEntity.Capacity;
        eventEntity.Capacity = request.Capacity;
        eventEntity.RemainingParticipationCount += capacityDifference;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<EventSummaryDto>.Success(MapEventSummary(eventEntity));
    }

    public async Task<Result<EventSummaryDto>> UpdateEventStatusAsync(Guid eventId, UpdateEventStatusRequest request, UserContext userContext, CancellationToken cancellationToken)
    {
        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        var isOwner = eventEntity.OwnerId == userContext.AccountId;
        var isAdmin = userContext.AccountType == AccountType.Admin;

        if (!isOwner && !isAdmin)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventUnauthorized, "Only the event owner or admin can update event status.");
        }

        var targetStatus = request.Status;
        if (targetStatus == eventEntity.Status)
        {
            return Result<EventSummaryDto>.Success(MapEventSummary(eventEntity));
        }

        if (!IsTransitionAllowed(eventEntity.Status, targetStatus, isAdmin))
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventInvalidState, $"Status transition from {eventEntity.Status} to {targetStatus} is not allowed.");
        }

        eventEntity.Status = targetStatus;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<EventSummaryDto>.Success(MapEventSummary(eventEntity));
    }

    public async Task<Result<EventSummaryDto>> CancelEventAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
    {
        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        if (eventEntity.OwnerId != userContext.AccountId && userContext.AccountType != AccountType.Admin)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventUnauthorized, "Only the owner or an admin can cancel the event.");
        }

        if (eventEntity.Status == EventStatus.Cancelled || eventEntity.Status == EventStatus.Completed)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventInvalidState, "Event cannot be cancelled.");
        }

        eventEntity.Status = EventStatus.Cancelled;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var participantIds = await _participationRepository.GetApprovedParticipantAccountIdsAsync(eventId, cancellationToken);
        foreach (var participantId in participantIds)
        {
            await _notificationService.SendToAccountAsync(
                new PushNotificationRequest(
                    participantId,
                    "Event Cancelled",
                    $"The event '{eventEntity.Name}' has been cancelled.",
                    new Dictionary<string, string> { ["eventId"] = eventId.ToString() }),
                cancellationToken);
        }

        return Result<EventSummaryDto>.Success(MapEventSummary(eventEntity));
    }

    public async Task<Result<PagedResult<EventSummaryDto>>> GetMyCreatedEventsAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _eventRepository.GetByOwnerIdAsync(userContext.AccountId, pageNumber, pageSize, cancellationToken);
        var mapped = items.Select(MapEventSummary).ToArray();

        return Result<PagedResult<EventSummaryDto>>.Success(new PagedResult<EventSummaryDto>(mapped, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<IEnumerable<EventSummaryDto>>> GetSimilarEventsAsync(Guid eventId, int count, CancellationToken cancellationToken)
    {
        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null || eventEntity.PrimaryTagId is null)
        {
            return Result<IEnumerable<EventSummaryDto>>.Success(Array.Empty<EventSummaryDto>());
        }

        var similarEvents = await _eventRepository.GetSimilarEventsAsync(eventId, eventEntity.PrimaryTagId.Value, count, cancellationToken);
        var mapped = similarEvents.Select(MapEventSummary);

        return Result<IEnumerable<EventSummaryDto>>.Success(mapped);
    }

    public async Task<Result> ToggleBookmarkAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
    {
        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        var bookmark = await _eventBookmarkRepository.GetBookmarkAsync(userContext.AccountId, eventId, cancellationToken);
        
        if (bookmark is not null)
        {
            _eventBookmarkRepository.Remove(bookmark);
        }
        else
        {
            await _eventBookmarkRepository.AddAsync(new EventBookmark
            {
                Id = Guid.NewGuid(),
                AccountId = userContext.AccountId,
                EventId = eventId
            }, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<PagedResult<EventSummaryDto>>> GetMyBookmarksAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _eventBookmarkRepository.GetByAccountIdAsync(userContext.AccountId, pageNumber, pageSize, cancellationToken);
        
        var mapped = items.Select(x => MapEventSummary(x.Event)).ToArray();

        return Result<PagedResult<EventSummaryDto>>.Success(new PagedResult<EventSummaryDto>(mapped, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<PagedResult<EventSummaryDto>>> GetRecommendedAsync(UserContext userContext, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        if (userContext.AccountType != AccountType.Individual)
        {
            return Result<PagedResult<EventSummaryDto>>.Failure(ErrorCodes.EventUnauthorized, "Recommendations are available for individual accounts.");
        }

        var account = await _userRepository.GetAccountByIdWithInterestsAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return Result<PagedResult<EventSummaryDto>>.Failure(ErrorCodes.AccountNotFound, "Account not found.");
        }

        var tagIds = account.InterestTags
            .Where(x => x.IsActive && !x.IsDeleted)
            .Select(x => x.Id)
            .Distinct()
            .ToArray();

        var paging = new PagedRequest
        {
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        paging.Normalize();

        var (items, totalCount) = await _eventRepository.GetRecommendedByTagIdsAsync(tagIds, paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items.Select(MapEventSummary).ToArray();

        return Result<PagedResult<EventSummaryDto>>.Success(new PagedResult<EventSummaryDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
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
            MapTags(eventEntity.Tags),
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

    private static bool IsTransitionAllowed(EventStatus current, EventStatus target, bool isAdmin)
    {
        if (target == EventStatus.Ongoing || target == EventStatus.Completed)
        {
            return isAdmin;
        }

        if (target == EventStatus.Cancelled)
        {
            return current is not (EventStatus.Completed or EventStatus.Cancelled);
        }

        if (target == EventStatus.PendingApproval)
        {
            return current is EventStatus.Draft or EventStatus.Rejected;
        }

        if (target == EventStatus.Published)
        {
            return isAdmin && current is EventStatus.PendingApproval or EventStatus.Draft;
        }

        if (target == EventStatus.Rejected)
        {
            return isAdmin && current is EventStatus.PendingApproval;
        }

        if (target == EventStatus.Draft)
        {
            return current is EventStatus.Draft;
        }

        return false;
    }

    private static IReadOnlyCollection<Guid> NormalizeTagIds(Guid? primaryTagId, IReadOnlyCollection<Guid>? tagIds)
    {
        var result = new HashSet<Guid>();

        if (tagIds is not null)
        {
            foreach (var tagId in tagIds.Where(x => x != Guid.Empty))
            {
                result.Add(tagId);
            }
        }

        if (primaryTagId.HasValue && primaryTagId.Value != Guid.Empty)
        {
            result.Add(primaryTagId.Value);
        }

        return result.ToArray();
    }

    private static IReadOnlyCollection<TagDto> MapTags(IEnumerable<Tag> tags)
    {
        return tags
            .Where(x => x.IsActive && !x.IsDeleted)
            .OrderBy(x => x.Name)
            .Select(x => new TagDto(x.Id, x.Name, x.IconName, x.ColorCode))
            .ToArray();
    }

    private static string? ValidateCreateEventRequest(CreateEventRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Event name is required.";
        }

        if (request.Name.Trim().Length < 3)
        {
            return "Event name must be at least 3 characters.";
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return "Event description is required.";
        }

        if (request.DurationMinutes <= 0)
        {
            return "Duration must be greater than 0.";
        }

        if (request.Capacity <= 0)
        {
            return "Capacity must be greater than 0.";
        }

        if (request.Price < 0)
        {
            return "Price cannot be negative.";
        }

        if (string.IsNullOrWhiteSpace(request.LocationData))
        {
            return "Location data is required.";
        }

        try
        {
            using var document = JsonDocument.Parse(request.LocationData);
            var root = document.RootElement;

            if (root.ValueKind != JsonValueKind.Object)
            {
                return "Location data must be a JSON object.";
            }

            if (!root.TryGetProperty("city", out var cityElement) || cityElement.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(cityElement.GetString()))
            {
                return "Location city is required.";
            }

            if (!root.TryGetProperty("fullAddress", out var addressElement) || addressElement.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(addressElement.GetString()))
            {
                return "Location fullAddress is required.";
            }

            if (!root.TryGetProperty("imageUrls", out var imageUrlsElement) || imageUrlsElement.ValueKind != JsonValueKind.Array)
            {
                return "At least 1 image is required.";
            }

            var imageUrls = imageUrlsElement
                .EnumerateArray()
                .Where(x => x.ValueKind == JsonValueKind.String)
                .Select(x => x.GetString())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!.Trim())
                .ToArray();

            if (imageUrls.Length < 1 || imageUrls.Length > 3)
            {
                return "Image count must be between 1 and 3.";
            }

            foreach (var imageUrl in imageUrls)
            {
                if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var parsedUri))
                {
                    return "Image URLs must be valid absolute URLs.";
                }

                if (parsedUri.Scheme != Uri.UriSchemeHttp && parsedUri.Scheme != Uri.UriSchemeHttps)
                {
                    return "Image URLs must use http or https.";
                }
            }
        }
        catch (JsonException)
        {
            return "Location data is not valid JSON.";
        }

        var eventDateTime = request.Date.ToDateTime(request.Time);
        if (eventDateTime <= DateTime.UtcNow)
        {
            return "Event date and time must be in the future.";
        }

        return null;
    }
}
