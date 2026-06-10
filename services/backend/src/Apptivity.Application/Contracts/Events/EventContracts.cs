using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Application.Contracts.Tags;
using Apptivity.Domain.Enums;
using System.Text.Json.Serialization;

namespace Apptivity.Application.Contracts.Events;

public sealed record EventSearchRequest(
    string? SearchTerm,
    string? LocationCity,
    Guid? PrimaryTagId,
    IReadOnlyCollection<Guid>? TagIds,
    bool MatchAllTags,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool? IsPaid,
    decimal? UserLat,
    decimal? UserLng,
    int? NearbyRadiusKm,
    string? Sort,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record EventSummaryDto(
    Guid Id,
    Guid OwnerId,
    string OwnerName,
    AccountType OwnerType,
    string? OwnerProfilePhoto,
    Guid? PrimaryTagId,
    IReadOnlyCollection<TagDto> Tags,
    string Name,
    string Description,
    string? BannerImage,
    DateOnly Date,
    TimeOnly Time,
    int DurationMinutes,
    int Capacity,
    int RemainingParticipationCount,
    EventStatus Status,
    decimal Price,
    string? LocationData);

public sealed record RecommendedEventSummaryDto(
    Guid Id,
    Guid OwnerId,
    string OwnerName,
    AccountType OwnerType,
    string? OwnerProfilePhoto,
    Guid? PrimaryTagId,
    IReadOnlyCollection<TagDto> Tags,
    string Name,
    string Description,
    string? BannerImage,
    DateOnly Date,
    TimeOnly Time,
    int DurationMinutes,
    int Capacity,
    int RemainingParticipationCount,
    EventStatus Status,
    decimal Price,
    string? LocationData,
    decimal? RecommendationScore,
    string? RecommendationReason);

public sealed record OrderedHotZoneRequest(
    int Priority,
    decimal Lat,
    decimal Lng);

public sealed record RecommendedEventsRequest(
    [property: JsonPropertyName("ordered_hot_zones")] IReadOnlyCollection<OrderedHotZoneRequest>? OrderedHotZones,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record DailyRecommendedNextRequest(
    decimal? Latitude,
    decimal? Longitude,
    [property: JsonPropertyName("ordered_hot_zones")] IReadOnlyCollection<string>? OrderedHotZones,
    [property: JsonPropertyName("session_id")] string? SessionId,
    [property: JsonPropertyName("excluded_event_ids")] IReadOnlyCollection<Guid>? ExcludedEventIds,
    [property: JsonPropertyName("start_tag_order")] int? StartTagOrder);

public sealed record DailyRecommendedNextResponse(
    EventSummaryDto? Event,
    string Status,
    int? CurrentTagOrder,
    int RemainingTagCount,
    string? Message,
    int? NextTagOrder,
    IReadOnlyCollection<Guid>? DebugLlmTagIds);

public sealed record ApplyToEventResponse(Guid EventId, Guid UserId, ParticipationStatus Status, EventStatus EventStatus);

public sealed record ManageParticipationStatusRequest(ParticipationStatus Status, string? RejectionReason);

public sealed record ParticipationStatusDto(
    Guid EventId,
    Guid UserId,
    ParticipationStatus Status,
    string? RejectionReason,
    EventStatus EventStatus);

public sealed record MyParticipationDto(
    Guid EventId,
    string EventName,
    DateOnly Date,
    TimeOnly Time,
    EventStatus EventStatus,
    ParticipationStatus ParticipationStatus,
    string? RejectionReason,
    string? BannerImage,
    string? LocationData,
    decimal Price,
    string OwnerName,
    AccountType OwnerType,
    string? OwnerProfilePhoto);

public sealed record EventParticipantProfileDto(
    Guid AccountId,
    AccountType Type,
    string Username,
    string? ProfilePhoto,
    string DisplayName,
    ParticipationStatus? Status,
    bool IsVoted = false,
    string? ReputationLevel = null);

public sealed record EventParticipantsResponse(
    Guid EventId,
    EventStatus EventStatus,
    bool IsVotingClosed,
    EventParticipantProfileDto Organizer,
    IEnumerable<EventParticipantProfileDto> Participants);

public sealed record CreateEventRequest(
    string Name,
    string Description,
    DateOnly Date,
    TimeOnly Time,
    int DurationMinutes,
    int Capacity,
    decimal Price,
    string? LocationData,
    Guid? PrimaryTagId,
    IReadOnlyCollection<Guid>? TagIds);

public sealed record UpdateEventRequest(
    string Name,
    string Description,
    DateOnly Date,
    TimeOnly Time,
    int DurationMinutes,
    int Capacity,
    string? LocationData);

public sealed record UpdateEventStatusRequest(
    EventStatus Status,
    string? ViolationReason = null,
    string? AdditionalExplanation = null);

public sealed record EventDetailsDto(
    Guid Id,
    Guid OwnerId,
    string OwnerName,
    AccountType OwnerType,
    string? OwnerProfilePhoto,
    Guid? PrimaryTagId,
    string? PrimaryTagName,
    IReadOnlyCollection<TagDto> Tags,
    string Name,
    string Description,
    string? BannerImage,
    DateOnly Date,
    TimeOnly Time,
    int DurationMinutes,
    int Capacity,
    int RemainingParticipationCount,
    EventStatus Status,
    string? RejectedViolationReason,
    string? RejectedAdditionalExplanation,
    decimal Price,
    string? LocationData,
    bool IsBookmarkedByCurrentUser,
    ParticipationStatus? CurrentUserParticipationStatus);

public interface IEventService
{
    Task<Result<PagedResult<EventSummaryDto>>> SearchAsync(EventSearchRequest request, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<ApplyToEventResponse>> ApplyToEventAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<ParticipationStatusDto>> UpdateParticipationStatusAsync(Guid eventId, Guid userId, ManageParticipationStatusRequest request, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<ParticipationStatusDto>> WithdrawAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<MyParticipationDto>>> GetMyParticipationsAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<EventParticipantsResponse>> GetEventParticipantsAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    
    Task<Result<EventSummaryDto>> CreateEventAsync(CreateEventRequest request, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<EventDetailsDto>> GetEventDetailsAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<EventSummaryDto>> UpdateEventAsync(Guid eventId, UpdateEventRequest request, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<EventSummaryDto>> UpdateEventStatusAsync(Guid eventId, UpdateEventStatusRequest request, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<EventSummaryDto>> CancelEventAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<EventSummaryDto>>> GetMyCreatedEventsAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<EventSummaryDto>>> GetEventsByOwnerIdAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Result<PagedResult<EventSummaryDto>>> GetEventsByParticipantAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Result<IEnumerable<EventSummaryDto>>> GetSimilarEventsAsync(Guid eventId, int count, CancellationToken cancellationToken);
    Task<Result> ToggleBookmarkAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<EventSummaryDto>>> GetMyBookmarksAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<EventSummaryDto>>> GetRecommendedAsync(UserContext userContext, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Result<PagedResult<RecommendedEventSummaryDto>>> GetRecommendedV6Async(UserContext userContext, RecommendedEventsRequest request, CancellationToken cancellationToken);
    Task<Result<PagedResult<EventSummaryDto>>> GetRecommendedNearbyAsync(UserContext userContext, decimal lat, decimal lng, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Result<DailyRecommendedNextResponse>> GetDailyRecommendedNextAsync(UserContext userContext, DailyRecommendedNextRequest request, CancellationToken cancellationToken);
}

public interface IEventLifecycleService
{
    Task ProcessTransitionsAndNotifyAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Finds all Completed events whose <c>VotingClosesAt</c> has passed and
    /// <c>IsVotingClosed</c> is still false, then calculates reputation deltas
    /// and marks voting as closed — all in a single transaction per event.
    /// </summary>
    Task CloseExpiredVotingsAsync(CancellationToken cancellationToken);

    Task<Result> CloseVotingAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
}
