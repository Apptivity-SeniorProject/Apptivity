using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Contracts.Events;

public sealed record EventSearchRequest(
    string? SearchTerm,
    string? LocationCity,
    Guid? PrimaryTagId,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool? IsPaid,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record EventSummaryDto(
    Guid Id,
    Guid OwnerId,
    Guid? PrimaryTagId,
    string Name,
    string Description,
    DateOnly Date,
    TimeOnly Time,
    int DurationMinutes,
    int Capacity,
    int RemainingParticipationCount,
    EventStatus Status,
    decimal Price,
    string? LocationData);

public sealed record ApplyToEventResponse(Guid EventId, Guid UserId, ParticipationStatus Status);

public sealed record ManageParticipationStatusRequest(ParticipationStatus Status, string? RejectionReason);

public sealed record ParticipationStatusDto(
    Guid EventId,
    Guid UserId,
    ParticipationStatus Status,
    string? RejectionReason);

public sealed record MyParticipationDto(
    Guid EventId,
    string EventName,
    DateOnly Date,
    TimeOnly Time,
    EventStatus EventStatus,
    ParticipationStatus ParticipationStatus,
    string? RejectionReason);

public sealed record EventParticipantProfileDto(
    Guid AccountId,
    AccountType Type,
    string Username,
    string? ProfilePhoto,
    string DisplayName,
    ParticipationStatus? Status);

public sealed record EventParticipantsResponse(
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
    Guid? PrimaryTagId);

public sealed record UpdateEventRequest(
    string Name,
    string Description,
    DateOnly Date,
    TimeOnly Time,
    int DurationMinutes,
    int Capacity,
    string? LocationData);

public sealed record EventDetailsDto(
    Guid Id,
    Guid OwnerId,
    string OwnerName,
    AccountType OwnerType,
    string? OwnerProfilePhoto,
    Guid? PrimaryTagId,
    string? PrimaryTagName,
    string Name,
    string Description,
    DateOnly Date,
    TimeOnly Time,
    int DurationMinutes,
    int Capacity,
    int RemainingParticipationCount,
    EventStatus Status,
    decimal Price,
    string? LocationData,
    bool IsBookmarkedByCurrentUser,
    ParticipationStatus? CurrentUserParticipationStatus);

public interface IEventService
{
    Task<Result<PagedResult<EventSummaryDto>>> SearchAsync(EventSearchRequest request, CancellationToken cancellationToken);
    Task<Result<ApplyToEventResponse>> ApplyToEventAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<ParticipationStatusDto>> UpdateParticipationStatusAsync(Guid eventId, Guid userId, ManageParticipationStatusRequest request, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<ParticipationStatusDto>> WithdrawAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<MyParticipationDto>>> GetMyParticipationsAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<EventParticipantsResponse>> GetEventParticipantsAsync(Guid eventId, CancellationToken cancellationToken);
    
    Task<Result<Guid>> CreateEventAsync(CreateEventRequest request, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<EventDetailsDto>> GetEventDetailsAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<EventSummaryDto>> UpdateEventAsync(Guid eventId, UpdateEventRequest request, UserContext userContext, CancellationToken cancellationToken);
    Task<Result> CancelEventAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<EventSummaryDto>>> GetMyCreatedEventsAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<IEnumerable<EventSummaryDto>>> GetSimilarEventsAsync(Guid eventId, int count, CancellationToken cancellationToken);
    Task<Result> ToggleBookmarkAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<EventSummaryDto>>> GetMyBookmarksAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken);
}

public interface IEventLifecycleService
{
    Task ProcessTransitionsAndNotifyAsync(CancellationToken cancellationToken);
}
