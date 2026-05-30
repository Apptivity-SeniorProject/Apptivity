using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Common.Observability;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Contracts.Tags;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
using System.Diagnostics;
using System.Globalization;
using System.Text.Json;

namespace Apptivity.Application.Services;

public sealed class EventService : IEventService
{
    private const string DailyRecommendationDepletedMessage =
        "Bugunluk buralardaki tum paslari tukettin kral. Yeni etkinlikler eklendiginde ilk senin haberin olacak!";

    private readonly IEventRepository _eventRepository;
    private readonly IEventBookmarkRepository _eventBookmarkRepository;
    private readonly IParticipationRepository _participationRepository;
    private readonly IUserRepository _userRepository;
    private readonly ITagRepository _tagRepository;
    private readonly ITagPredictorService _tagPredictorService;
    private readonly ITagPredictionCacheService _tagPredictionCacheService;
    private readonly IDailyRecommendationRepository _dailyRecommendationRepository;
    private readonly IRecommendationTransactionManager _recommendationTransactionManager;
    private readonly IRecommendationFeatureFlags _recommendationFeatureFlags;
    private readonly IEventLifecycleService _eventLifecycleService;
    private readonly INotificationService _notificationService;
    private readonly IUnitOfWork _unitOfWork;

    public EventService(
        IEventRepository eventRepository,
        IEventBookmarkRepository eventBookmarkRepository,
        IParticipationRepository participationRepository,
        IUserRepository userRepository,
        ITagRepository tagRepository,
        ITagPredictorService tagPredictorService,
        ITagPredictionCacheService tagPredictionCacheService,
        IDailyRecommendationRepository dailyRecommendationRepository,
        IRecommendationTransactionManager recommendationTransactionManager,
        IRecommendationFeatureFlags recommendationFeatureFlags,
        IEventLifecycleService eventLifecycleService,
        INotificationService notificationService,
        IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _eventBookmarkRepository = eventBookmarkRepository;
        _participationRepository = participationRepository;
        _userRepository = userRepository;
        _tagRepository = tagRepository;
        _tagPredictorService = tagPredictorService;
        _tagPredictionCacheService = tagPredictionCacheService;
        _dailyRecommendationRepository = dailyRecommendationRepository;
        _recommendationTransactionManager = recommendationTransactionManager;
        _recommendationFeatureFlags = recommendationFeatureFlags;
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
            request.IsPaid,
            request.UserLat,
            request.UserLng,
            request.NearbyRadiusKm,
            request.Sort);

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

        var locationData = request.LocationData?.Trim();
        var ownerAccount = await _userRepository.GetAccountByIdWithProfilesAsync(userContext.AccountId, cancellationToken);
        var (locationLat, locationLng) = ResolveEventCoordinates(locationData, ownerAccount?.ClubProfile?.Latitude, ownerAccount?.ClubProfile?.Longitude);

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
            LocationData = locationData,
            LocationLat = locationLat,
            LocationLng = locationLng,
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
            eventEntity.BannerImage,
            eventEntity.Date,
            eventEntity.Time,
            eventEntity.DurationMinutes,
            eventEntity.Capacity,
            eventEntity.RemainingParticipationCount,
            eventEntity.Status,
            eventEntity.RejectedViolationReason,
            eventEntity.RejectedAdditionalExplanation,
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

        var ownerAccount = await _userRepository.GetAccountByIdWithProfilesAsync(userContext.AccountId, cancellationToken);
        var (locationLat, locationLng) = ResolveEventCoordinates(
            request.LocationData,
            ownerAccount?.ClubProfile?.Latitude,
            ownerAccount?.ClubProfile?.Longitude);
        eventEntity.LocationLat = locationLat;
        eventEntity.LocationLng = locationLng;

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

        var normalizedViolationReason = request.ViolationReason?.Trim();
        var normalizedAdditionalExplanation = request.AdditionalExplanation?.Trim();

        if (targetStatus == EventStatus.Rejected && string.IsNullOrWhiteSpace(normalizedViolationReason))
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.Validation, "Violation reason is required when rejecting an event.");
        }

        if (!string.IsNullOrWhiteSpace(normalizedViolationReason) && normalizedViolationReason.Length > 100)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.Validation, "Violation reason cannot exceed 100 characters.");
        }

        if (!string.IsNullOrWhiteSpace(normalizedAdditionalExplanation) && normalizedAdditionalExplanation.Length > 500)
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.Validation, "Additional explanation cannot exceed 500 characters.");
        }

        if (!IsTransitionAllowed(eventEntity.Status, targetStatus, isAdmin))
        {
            return Result<EventSummaryDto>.Failure(ErrorCodes.EventInvalidState, $"Status transition from {eventEntity.Status} to {targetStatus} is not allowed.");
        }

        var previousStatus = eventEntity.Status;
        eventEntity.Status = targetStatus;
        if (targetStatus == EventStatus.Rejected)
        {
            eventEntity.RejectedViolationReason = normalizedViolationReason;
            eventEntity.RejectedAdditionalExplanation = normalizedAdditionalExplanation;
        }
        else
        {
            eventEntity.RejectedViolationReason = null;
            eventEntity.RejectedAdditionalExplanation = null;
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (previousStatus != targetStatus)
        {
            if (targetStatus == EventStatus.Rejected)
            {
                var rejectionMessage = BuildEventRejectionNotificationBody(
                    eventEntity.Name,
                    normalizedViolationReason ?? string.Empty,
                    normalizedAdditionalExplanation);

                await _notificationService.SendToAccountAsync(
                    new PushNotificationRequest(
                        eventEntity.OwnerId,
                        "Etkinlik Reddedildi",
                        rejectionMessage,
                        new Dictionary<string, string>
                        {
                            ["eventId"] = eventEntity.Id.ToString(),
                            ["status"] = targetStatus.ToString(),
                            ["violationReason"] = normalizedViolationReason ?? string.Empty,
                            ["additionalExplanation"] = normalizedAdditionalExplanation ?? string.Empty
                        }),
                    cancellationToken);
            }
            else if (targetStatus == EventStatus.Published && isAdmin)
            {
                await _notificationService.SendToAccountAsync(
                    new PushNotificationRequest(
                        eventEntity.OwnerId,
                        "Etkinlik Onaylandı",
                        $"'{eventEntity.Name}' etkinliği onaylandı ve yayına alındı.",
                        new Dictionary<string, string>
                        {
                            ["eventId"] = eventEntity.Id.ToString(),
                            ["status"] = targetStatus.ToString()
                        }),
                    cancellationToken);
            }
        }

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

    public async Task<Result<PagedResult<RecommendedEventSummaryDto>>> GetRecommendedV6Async(
        UserContext userContext,
        RecommendedEventsRequest request,
        CancellationToken cancellationToken)
    {
        RecommendationMetrics.RecordRequest();
        var stopwatch = Stopwatch.StartNew();

        if (userContext.AccountType != AccountType.Individual)
        {
            return Result<PagedResult<RecommendedEventSummaryDto>>.Failure(ErrorCodes.EventUnauthorized, "Recommendations are available for individual accounts.");
        }

        var account = await _userRepository.GetAccountByIdWithInterestsAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return Result<PagedResult<RecommendedEventSummaryDto>>.Failure(ErrorCodes.AccountNotFound, "Account not found.");
        }

        var paging = new PagedRequest
        {
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
        paging.Normalize();

        var activeTags = await _tagRepository.GetActiveAsync(cancellationToken);
        var activeTagById = activeTags
            .Where(x => !x.IsDeleted && x.IsActive && !string.IsNullOrWhiteSpace(x.Name))
            .GroupBy(x => x.Id)
            .Select(x => x.First())
            .ToDictionary(x => x.Id, x => x);

        var allowedTags = activeTagById.Values
            .Select(x => new TagPredictionAllowedTag(x.Id, x.Name.Trim()))
            .ToArray();

        var interestTagNames = account.InterestTags
            .Where(x => x.IsActive && !x.IsDeleted && !string.IsNullOrWhiteSpace(x.Name))
            .Select(x => x.Name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var approvedHistoryTagNames = (await _eventRepository.GetApprovedHistoryTagNamesAsync(userContext.AccountId, cancellationToken))
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var interestTagIds = account.InterestTags
            .Where(x => x.IsActive && !x.IsDeleted)
            .Select(x => x.Id)
            .Distinct()
            .ToArray();

        var primaryTagId = Guid.Empty;
        var fallbackTagId = Guid.Empty;
        var hasSignals = interestTagNames.Length > 0 || approvedHistoryTagNames.Length > 0;

        if (hasSignals && allowedTags.Length >= 2)
        {
            var predictedTags = await _tagPredictorService.PredictAsync(
                new TagPredictionInput(allowedTags, interestTagNames, approvedHistoryTagNames),
                cancellationToken);

            if (predictedTags is not null)
            {
                var tagIds = predictedTags.TagIds
                    .Where(activeTagById.ContainsKey)
                    .Distinct()
                    .ToArray();

                if (tagIds.Length > 0)
                {
                    primaryTagId = tagIds[0];
                }

                if (tagIds.Length > 1 && tagIds[1] != primaryTagId)
                {
                    fallbackTagId = tagIds[1];
                }
            }
        }

        if (primaryTagId == Guid.Empty)
        {
            primaryTagId = interestTagIds.ElementAtOrDefault(0);
        }

        if (fallbackTagId == Guid.Empty)
        {
            fallbackTagId = interestTagIds
                .FirstOrDefault(x => x != Guid.Empty && x != primaryTagId);
        }

        var nowUtc = DateTime.UtcNow;

        var zones = request.OrderedHotZones?
            .OrderBy(x => x.Priority)
            .ToArray();

        var stage12Zones = zones?
            .Where(x => x.Priority == 1 || x.Priority == 2)
            .ToArray() ?? Array.Empty<OrderedHotZoneRequest>();

        var stage123Zones = zones?
            .Where(x => x.Priority is >= 1 and <= 3)
            .ToArray() ?? Array.Empty<OrderedHotZoneRequest>();

        var activeEvents = await _eventRepository.GetPublishedAndOngoingAsync(cancellationToken);

        var stage1 = !hasSignals || primaryTagId == Guid.Empty || stage12Zones.Length == 0
            ? Array.Empty<RecommendationCandidate>()
            : BuildCandidates(
                activeEvents,
                nowUtc,
                stage: 1,
                reason: "Primary interest and top locations match",
                requiredTagId: primaryTagId,
                zones: stage12Zones,
                maxDistanceKm: 20d);

        var stage2 = stage1.Length > 0 || !hasSignals || fallbackTagId == Guid.Empty || stage12Zones.Length == 0
            ? Array.Empty<RecommendationCandidate>()
            : BuildCandidates(
                activeEvents,
                nowUtc,
                stage: 2,
                reason: "Fallback interest and top locations match",
                requiredTagId: fallbackTagId,
                zones: stage12Zones,
                maxDistanceKm: 20d);

        var stage3 = (stage1.Length > 0 || stage2.Length > 0 || stage123Zones.Length == 0)
            ? Array.Empty<RecommendationCandidate>()
            : BuildCandidates(
                activeEvents,
                nowUtc,
                stage: 3,
                reason: "Nearby events around your frequent zones",
                requiredTagId: null,
                zones: stage123Zones,
                maxDistanceKm: 25d);

        var stage4 = stage1.Length > 0 || stage2.Length > 0 || stage3.Length > 0
            ? Array.Empty<RecommendationCandidate>()
            : BuildStage4Candidates(activeEvents, nowUtc);

        var selectedStage = stage1.Length > 0
            ? stage1
            : stage2.Length > 0
                ? stage2
                : stage3.Length > 0
                    ? stage3
                    : stage4;

        var selectedStageNumber = selectedStage.FirstOrDefault()?.Stage ?? 4;
        RecommendationMetrics.RecordStageHit(selectedStageNumber);

        var deduped = selectedStage
            .GroupBy(x => x.Event.Id)
            .Select(x => x.OrderBy(y => y.Stage).First())
            .OrderBy(x => x.Stage)
            .ThenByDescending(x => x.RecommendationScore ?? -1m)
            .ThenBy(x => x.DistanceKm ?? decimal.MaxValue)
            .ThenBy(x => x.StartUtc)
            .ThenBy(x => x.Event.Id)
            .ToArray();

        if (deduped.Length == 0)
        {
            RecommendationMetrics.RecordEmptyResult();
        }

        var pagedItems = deduped
            .Skip((paging.PageNumber - 1) * paging.PageSize)
            .Take(paging.PageSize)
            .Select(MapRecommendedEventSummary)
            .ToArray();

        stopwatch.Stop();
        RecommendationMetrics.RecordLatency(stopwatch.Elapsed.TotalMilliseconds);

        return Result<PagedResult<RecommendedEventSummaryDto>>.Success(
            new PagedResult<RecommendedEventSummaryDto>(pagedItems, deduped.Length, paging.PageNumber, paging.PageSize));
    }

    public async Task<Result<DailyRecommendedNextResponse>> GetDailyRecommendedNextAsync(
        UserContext userContext,
        DailyRecommendedNextRequest request,
        CancellationToken cancellationToken)
    {
        if (userContext.AccountType != AccountType.Individual)
        {
            return Result<DailyRecommendedNextResponse>.Failure(ErrorCodes.EventUnauthorized, "Recommendations are available for individual accounts.");
        }

        if ((request.Latitude.HasValue && !request.Longitude.HasValue) || (!request.Latitude.HasValue && request.Longitude.HasValue))
        {
            return Result<DailyRecommendedNextResponse>.Failure(ErrorCodes.Validation, "latitude and longitude must be provided together.");
        }

        if (request.Latitude is < -90 or > 90)
        {
            return Result<DailyRecommendedNextResponse>.Failure(ErrorCodes.Validation, "latitude must be between -90 and 90.");
        }

        if (request.Longitude is < -180 or > 180)
        {
            return Result<DailyRecommendedNextResponse>.Failure(ErrorCodes.Validation, "longitude must be between -180 and 180.");
        }

        var account = await _userRepository.GetAccountByIdWithInterestsAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return Result<DailyRecommendedNextResponse>.Failure(ErrorCodes.AccountNotFound, "Account not found.");
        }

        async Task<DailyRecommendedNextResponse> ExecuteFlowAsync(CancellationToken txCancellationToken) =>
            await _recommendationTransactionManager.ExecuteInTransactionAsync(async txToken =>
        {
            var nowUtc = DateTime.UtcNow;
            var dayKey = GetIstanbulDayKey(nowUtc);

            await _dailyRecommendationRepository.AcquireUserRecommendationLockAsync(userContext.AccountId, txToken);

            var plan = await _dailyRecommendationRepository.GetPlanForDayAsync(userContext.AccountId, dayKey, txToken);
            if (plan is null || _recommendationFeatureFlags.DisableDailyLlmPlanReuseForTesting)
            {
                var activeTags = await _tagRepository.GetActiveAsync(txToken);
                var planBuild = await BuildDailyPlanAsync(account, activeTags, dayKey, nowUtc, txToken);
                if (planBuild.Plan is null)
                {
                    return new DailyRecommendedNextResponse(
                        null,
                        "unavailable",
                        null,
                        0,
                        "Su anda oneri servisi kullanilamiyor. Lutfen daha sonra tekrar dene.",
                        null);
                }

                if (plan is null)
                {
                    plan = planBuild.Plan;
                    await _dailyRecommendationRepository.AddPlanAsync(plan, txToken);
                }
                else
                {
                    await _dailyRecommendationRepository.ResetPlanStateAsync(plan.Id, txToken);
                    ApplyDailyPlanSnapshot(plan, planBuild.Plan, nowUtc);
                }
            }

            var cursor = await _dailyRecommendationRepository.GetCursorForUpdateAsync(plan.Id, txToken) ?? plan.Cursor;
            if (cursor is null)
            {
                cursor = new DailyRecommendationCursor
                {
                    PlanId = plan.Id,
                    CurrentTagOrder = 1,
                    IsDepleted = false
                };
                plan.Cursor = cursor;
            }

            if (cursor.IsDepleted)
            {
                return new DailyRecommendedNextResponse(
                    null,
                    "depleted",
                    null,
                    0,
                    DailyRecommendationDepletedMessage,
                    GetDebugLlmTagIds(plan));
            }

            var totalTagCount = plan.Tags.Count;
            if (totalTagCount == 0)
            {
                cursor.IsDepleted = true;
                return new DailyRecommendedNextResponse(
                    null,
                    "unavailable",
                    null,
                    0,
                    "Su anda oneri servisi kullanilamiyor. Lutfen daha sonra tekrar dene.",
                    GetDebugLlmTagIds(plan));
            }

            var fatigueSinceUtc = nowUtc.AddHours(-72);
            var recentServed = await _dailyRecommendationRepository.GetRecentServedEventsAsync(userContext.AccountId, fatigueSinceUtc, txToken);
            var excludedEventIds = recentServed
                .Select(x => x.EventId)
                .ToHashSet();

            var activeEvents = await _eventRepository.GetPublishedAndOngoingAsync(txToken);
            var hasLiveLocation = request.Latitude.HasValue && request.Longitude.HasValue;
            var fallbackCity = hasLiveLocation
                ? null
                : await _dailyRecommendationRepository.GetMostFrequentServedClubCityAsync(userContext.AccountId, txToken);

            var startOrder = Math.Clamp(cursor.CurrentTagOrder, 1, totalTagCount);
            for (var tagOrder = startOrder; tagOrder <= totalTagCount; tagOrder++)
            {
                cursor.CurrentTagOrder = tagOrder;

                var planTag = plan.Tags.FirstOrDefault(x => x.TagOrder == tagOrder);
                if (planTag is null)
                {
                    continue;
                }

                var selectedEvent = SelectNextDailyCandidate(
                    activeEvents,
                    planTag.TagId,
                    excludedEventIds,
                    nowUtc,
                    request.Latitude,
                    request.Longitude,
                    fallbackCity);

                if (selectedEvent is null)
                {
                    continue;
                }

                plan.ServedEvents.Add(new DailyRecommendationServedEvent
                {
                    PlanId = plan.Id,
                    EventId = selectedEvent.Id,
                    TagOrder = tagOrder,
                    ServedAtUtc = nowUtc
                });

                cursor.IsDepleted = false;

                var remainingTagCount = Math.Max(0, totalTagCount - tagOrder + 1);
                return new DailyRecommendedNextResponse(
                    MapEventSummary(selectedEvent),
                    "served",
                    tagOrder,
                    remainingTagCount,
                    null,
                    GetDebugLlmTagIds(plan));
            }

            cursor.IsDepleted = true;
            cursor.CurrentTagOrder = totalTagCount;

            return new DailyRecommendedNextResponse(
                null,
                "depleted",
                null,
                0,
                DailyRecommendationDepletedMessage,
                GetDebugLlmTagIds(plan));
        }, txCancellationToken);

        DailyRecommendedNextResponse response;
        try
        {
            response = await ExecuteFlowAsync(cancellationToken);
        }
        catch (Exception ex) when (ex.Message.Contains("IX_user_daily_recommendation_plan_user_id_day_key", StringComparison.OrdinalIgnoreCase))
        {
            response = await ExecuteFlowAsync(cancellationToken);
        }

        return Result<DailyRecommendedNextResponse>.Success(response);
    }

    private async Task<DailyPlanBuildResult> BuildDailyPlanAsync(
        Account account,
        IReadOnlyCollection<Tag> activeTags,
        string dayKey,
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        var activeTagById = activeTags
            .Where(x => x.IsActive && !x.IsDeleted)
            .GroupBy(x => x.Id)
            .Select(x => x.First())
            .ToDictionary(x => x.Id, x => x);

        var interestTagIds = account.InterestTags
            .Where(x => x.IsActive && !x.IsDeleted)
            .Select(x => x.Id)
            .Distinct()
            .ToArray();

        var interestTagNames = account.InterestTags
            .Where(x => x.IsActive && !x.IsDeleted && !string.IsNullOrWhiteSpace(x.Name))
            .Select(x => x.Name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var approvedHistoryTagNames = (await _eventRepository.GetApprovedHistoryTagNamesAsync(account.Id, cancellationToken))
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var hasSignals = interestTagNames.Length > 0 || approvedHistoryTagNames.Length > 0;
        var allowedTags = activeTagById.Values
            .Select(x => new TagPredictionAllowedTag(x.Id, x.Name.Trim()))
            .ToArray();

        var selected = new List<SelectedTag>();

        if (hasSignals && allowedTags.Length > 0)
        {
            try
            {
                var predicted = await _tagPredictorService.PredictAsync(
                    new TagPredictionInput(allowedTags, interestTagNames, approvedHistoryTagNames),
                    cancellationToken);

                if (predicted is not null)
                {
                    foreach (var tagId in predicted.TagIds.Where(activeTagById.ContainsKey).Distinct())
                    {
                        if (selected.Any(x => x.TagId == tagId))
                        {
                            continue;
                        }

                        selected.Add(new SelectedTag(tagId, DailyRecommendationTagSource.Llm));
                        if (selected.Count == 5)
                        {
                            break;
                        }
                    }
                }
            }
            catch
            {
                // LLM failure is intentionally swallowed; profile/deterministic fallback continues.
            }
        }

        foreach (var tagId in interestTagIds.Where(activeTagById.ContainsKey))
        {
            if (selected.Any(x => x.TagId == tagId))
            {
                continue;
            }

            selected.Add(new SelectedTag(tagId, DailyRecommendationTagSource.Profile));
            if (selected.Count == 5)
            {
                break;
            }
        }

        if (selected.Count < 5)
        {
            foreach (var tagId in activeTagById.Keys.OrderBy(x => x))
            {
                if (selected.Any(x => x.TagId == tagId))
                {
                    continue;
                }

                selected.Add(new SelectedTag(tagId, DailyRecommendationTagSource.Deterministic));
                if (selected.Count == 5)
                {
                    break;
                }
            }
        }

        if (selected.Count == 0)
        {
            return new DailyPlanBuildResult(null);
        }

        var plan = new DailyRecommendationPlan
        {
            Id = Guid.NewGuid(),
            UserId = account.Id,
            DayKey = dayKey,
            GeneratedAtUtc = nowUtc,
            LlmGenerated = selected.Any(x => x.Source == DailyRecommendationTagSource.Llm),
            Cursor = new DailyRecommendationCursor
            {
                CurrentTagOrder = 1,
                IsDepleted = false
            }
        };

        plan.Cursor.PlanId = plan.Id;

        var order = 1;
        foreach (var tag in selected)
        {
            plan.Tags.Add(new DailyRecommendationPlanTag
            {
                PlanId = plan.Id,
                TagOrder = order,
                TagId = tag.TagId,
                Source = tag.Source
            });
            order++;
        }

        return new DailyPlanBuildResult(plan);
    }

    private static void ApplyDailyPlanSnapshot(
        DailyRecommendationPlan targetPlan,
        DailyRecommendationPlan sourcePlan,
        DateTime nowUtc)
    {
        targetPlan.GeneratedAtUtc = nowUtc;
        targetPlan.LlmGenerated = sourcePlan.LlmGenerated;

        targetPlan.Tags.Clear();
        foreach (var tag in sourcePlan.Tags.OrderBy(x => x.TagOrder))
        {
            targetPlan.Tags.Add(new DailyRecommendationPlanTag
            {
                PlanId = targetPlan.Id,
                TagOrder = tag.TagOrder,
                TagId = tag.TagId,
                Source = tag.Source
            });
        }

        targetPlan.Cursor ??= new DailyRecommendationCursor
        {
            PlanId = targetPlan.Id
        };

        targetPlan.Cursor.CurrentTagOrder = 1;
        targetPlan.Cursor.IsDepleted = false;
    }

    private static Event? SelectNextDailyCandidate(
        IReadOnlyCollection<Event> activeEvents,
        Guid tagId,
        IReadOnlySet<Guid> excludedEventIds,
        DateTime nowUtc,
        decimal? userLat,
        decimal? userLng,
        string? fallbackCity)
    {
        var candidates = activeEvents
            .Where(x => IsActiveEvent(x, nowUtc))
            .Where(x => HasTag(x, tagId))
            .Where(x => !excludedEventIds.Contains(x.Id));

        if (!userLat.HasValue || !userLng.HasValue)
        {
            if (!string.IsNullOrWhiteSpace(fallbackCity))
            {
                var city = fallbackCity.Trim();
                candidates = candidates.Where(x =>
                    x.LocationData != null &&
                    x.LocationData.Contains(city, StringComparison.OrdinalIgnoreCase));
            }

            return candidates
                .OrderByDescending(x => x.IsFeatured)
                .ThenBy(x => x.Date)
                .ThenBy(x => x.Time)
                .ThenBy(x => x.Id)
                .FirstOrDefault();
        }

        return candidates
            .Select(x => new
            {
                Event = x,
                Distance = TryCalculateDistanceKm(x, userLat.Value, userLng.Value, out var distanceKm)
                    ? distanceKm
                    : double.MaxValue
            })
            .OrderBy(x => x.Distance)
            .ThenByDescending(x => x.Event.IsFeatured)
            .ThenBy(x => x.Event.Date)
            .ThenBy(x => x.Event.Time)
            .ThenBy(x => x.Event.Id)
            .Select(x => x.Event)
            .FirstOrDefault();
    }

    private static bool TryCalculateDistanceKm(Event eventEntity, decimal userLat, decimal userLng, out double distanceKm)
    {
        distanceKm = double.MaxValue;
        if (!eventEntity.LocationLat.HasValue || !eventEntity.LocationLng.HasValue)
        {
            return false;
        }

        distanceKm = CalculateDistanceKm(
            (double)eventEntity.LocationLat.Value,
            (double)eventEntity.LocationLng.Value,
            (double)userLat,
            (double)userLng);
        return true;
    }

    private static IReadOnlyCollection<Guid> GetDebugLlmTagIds(DailyRecommendationPlan plan)
    {
        return plan.Tags
            .Where(x => x.Source == DailyRecommendationTagSource.Llm)
            .OrderBy(x => x.TagOrder)
            .Select(x => x.TagId)
            .ToArray();
    }

    private static string GetIstanbulDayKey(DateTime nowUtc)
    {
        var timezone = ResolveIstanbulTimeZone();
        var localTime = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, timezone);
        return localTime.ToString("yyyy-MM-dd");
    }

    private static TimeZoneInfo ResolveIstanbulTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
        }
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
            eventEntity.BannerImage,
            eventEntity.Date,
            eventEntity.Time,
            eventEntity.DurationMinutes,
            eventEntity.Capacity,
            eventEntity.RemainingParticipationCount,
            eventEntity.Status,
            eventEntity.Price,
            eventEntity.LocationData);
    }

    private static RecommendedEventSummaryDto MapRecommendedEventSummary(RecommendationCandidate candidate)
    {
        var eventSummary = candidate.Event;

        return new RecommendedEventSummaryDto(
            eventSummary.Id,
            eventSummary.OwnerId,
            eventSummary.PrimaryTagId,
            eventSummary.Tags,
            eventSummary.Name,
            eventSummary.Description,
            eventSummary.BannerImage,
            eventSummary.Date,
            eventSummary.Time,
            eventSummary.DurationMinutes,
            eventSummary.Capacity,
            eventSummary.RemainingParticipationCount,
            eventSummary.Status,
            eventSummary.Price,
            eventSummary.LocationData,
            candidate.RecommendationScore,
            candidate.RecommendationReason);
    }

    private static RecommendationCandidate[] BuildCandidates(
        IReadOnlyCollection<Event> activeEvents,
        DateTime nowUtc,
        int stage,
        string reason,
        Guid? requiredTagId,
        IReadOnlyCollection<OrderedHotZoneRequest> zones,
        double maxDistanceKm)
    {
        if (zones.Count == 0)
        {
            return Array.Empty<RecommendationCandidate>();
        }

        var list = new List<RecommendationCandidate>();

        foreach (var eventEntity in activeEvents)
        {
            if (!IsActiveEvent(eventEntity, nowUtc))
            {
                continue;
            }

            if (requiredTagId.HasValue && !HasTag(eventEntity, requiredTagId.Value))
            {
                continue;
            }

            if (!TryGetMinimumDistanceKm(eventEntity, zones, out var minDistanceKm))
            {
                continue;
            }

            if (minDistanceKm > (decimal)maxDistanceKm)
            {
                continue;
            }

            var score = ComputeScore(minDistanceKm, maxDistanceKm, stage);
            var mapped = MapEventSummary(eventEntity);
            var startUtc = eventEntity.Date.ToDateTime(eventEntity.Time, DateTimeKind.Utc);
            list.Add(new RecommendationCandidate(mapped, stage, DecimalRound(minDistanceKm), score, reason, startUtc));
        }

        return list.ToArray();
    }

    private static RecommendationCandidate[] BuildStage4Candidates(
        IReadOnlyCollection<Event> activeEvents,
        DateTime nowUtc)
    {
        return activeEvents
            .Where(x => IsActiveEvent(x, nowUtc))
            .OrderByDescending(x => x.IsFeatured)
            .ThenBy(x => x.Date)
            .ThenBy(x => x.Time)
            .Select(x => new RecommendationCandidate(
                MapEventSummary(x),
                4,
                null,
                null,
                "Popular and upcoming active events",
                x.Date.ToDateTime(x.Time, DateTimeKind.Utc)))
            .ToArray();
    }

    private static bool HasTag(Event eventEntity, Guid tagId)
    {
        if (eventEntity.PrimaryTagId == tagId)
        {
            return true;
        }

        return eventEntity.Tags.Any(x => x.Id == tagId);
    }

    private static bool IsActiveEvent(Event eventEntity, DateTime nowUtc)
    {
        var startUtc = eventEntity.Date.ToDateTime(eventEntity.Time, DateTimeKind.Utc);
        var endUtc = startUtc.AddMinutes(eventEntity.DurationMinutes);

        return eventEntity.Status switch
        {
            EventStatus.Published => startUtc >= nowUtc,
            EventStatus.Ongoing => startUtc <= nowUtc && nowUtc < endUtc,
            _ => false
        };
    }

    private static bool TryGetMinimumDistanceKm(
        Event eventEntity,
        IReadOnlyCollection<OrderedHotZoneRequest> zones,
        out decimal minDistanceKm)
    {
        minDistanceKm = decimal.MaxValue;

        if (!eventEntity.LocationLat.HasValue || !eventEntity.LocationLng.HasValue)
        {
            return false;
        }

        foreach (var zone in zones)
        {
            var distance = CalculateDistanceKm(
                (double)eventEntity.LocationLat.Value,
                (double)eventEntity.LocationLng.Value,
                (double)zone.Lat,
                (double)zone.Lng);

            if (distance < (double)minDistanceKm)
            {
                minDistanceKm = (decimal)distance;
            }
        }

        return minDistanceKm != decimal.MaxValue;
    }

    private static decimal ComputeScore(decimal distanceKm, double maxDistanceKm, int stage)
    {
        var normalized = maxDistanceKm <= 0 ? 0m : distanceKm / (decimal)maxDistanceKm;
        var distanceScore = 100m - (normalized * 60m);
        var stageBonus = stage switch
        {
            1 => 20m,
            2 => 12m,
            3 => 5m,
            _ => 0m
        };

        var score = distanceScore + stageBonus;
        if (score < 0m)
        {
            score = 0m;
        }

        if (score > 100m)
        {
            score = 100m;
        }

        return DecimalRound(score);
    }

    private static decimal DecimalRound(decimal value)
    {
        return Math.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusKm = 6371d;

        var lat1Rad = DegreesToRadians(lat1);
        var lat2Rad = DegreesToRadians(lat2);
        var deltaLat = DegreesToRadians(lat2 - lat1);
        var deltaLon = DegreesToRadians(lon2 - lon1);

        var a =
            Math.Sin(deltaLat / 2d) * Math.Sin(deltaLat / 2d) +
            Math.Cos(lat1Rad) * Math.Cos(lat2Rad) *
            Math.Sin(deltaLon / 2d) * Math.Sin(deltaLon / 2d);

        var c = 2d * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1d - a));
        return earthRadiusKm * c;
    }

    private static double DegreesToRadians(double degree)
    {
        return degree * Math.PI / 180d;
    }

    private sealed record RecommendationCandidate(
        EventSummaryDto Event,
        int Stage,
        decimal? DistanceKm,
        decimal? RecommendationScore,
        string RecommendationReason,
        DateTime StartUtc);

    private sealed record SelectedTag(Guid TagId, DailyRecommendationTagSource Source);

    private sealed record DailyPlanBuildResult(DailyRecommendationPlan? Plan);

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

    private static string BuildEventRejectionNotificationBody(string eventName, string violationReason, string? additionalExplanation)
    {
        var reasonText = MapViolationReasonToDisplayText(violationReason);
        var message = $"'{eventName}' etkinliği reddedildi. Sebep: {reasonText}.";

        if (!string.IsNullOrWhiteSpace(additionalExplanation))
        {
            message += $" Ek açıklama: {additionalExplanation}.";
        }

        return message;
    }

    private static string MapViolationReasonToDisplayText(string violationReason)
    {
        return violationReason.Trim().ToLowerInvariant() switch
        {
            "policy_violation" => "Topluluk kuralları ihlali",
            "inappropriate_content" => "Uygunsuz içerik",
            "unsafe_activity" => "Güvenli olmayan aktivite",
            "misleading_information" => "Yanıltıcı bilgi",
            "missing_required_details" => "Eksik veya zorunlu bilgiler",
            "other" => "Diğer",
            _ => violationReason
        };
    }

    private static (decimal? Lat, decimal? Lng) ResolveEventCoordinates(
        string? locationData,
        decimal? fallbackLat,
        decimal? fallbackLng)
    {
        if (!string.IsNullOrWhiteSpace(locationData))
        {
            try
            {
                using var document = JsonDocument.Parse(locationData);
                var root = document.RootElement;
                if (root.ValueKind == JsonValueKind.Object
                    && TryGetCoordinate(root, "lat", -90m, 90m, out var parsedLat)
                    && TryGetCoordinate(root, "lng", -180m, 180m, out var parsedLng))
                {
                    return (Math.Round(parsedLat, 6, MidpointRounding.AwayFromZero), Math.Round(parsedLng, 6, MidpointRounding.AwayFromZero));
                }
            }
            catch (JsonException)
            {
                // ignored; fallback coordinates are used.
            }
        }

        if (fallbackLat is >= -90m and <= 90m && fallbackLng is >= -180m and <= 180m)
        {
            return (Math.Round(fallbackLat.Value, 6, MidpointRounding.AwayFromZero), Math.Round(fallbackLng.Value, 6, MidpointRounding.AwayFromZero));
        }

        return (null, null);
    }

    private static bool TryGetCoordinate(JsonElement root, string propertyName, decimal min, decimal max, out decimal value)
    {
        value = default;
        if (!root.TryGetProperty(propertyName, out var property))
        {
            return false;
        }

        switch (property.ValueKind)
        {
            case JsonValueKind.Number:
                if (!property.TryGetDecimal(out value))
                {
                    return false;
                }
                break;
            case JsonValueKind.String:
                var text = property.GetString();
                if (!decimal.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out value))
                {
                    return false;
                }
                break;
            default:
                return false;
        }

        return value >= min && value <= max;
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
