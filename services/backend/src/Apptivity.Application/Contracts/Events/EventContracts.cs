using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Contracts.Events;

public sealed record EventSearchRequest(
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

public interface IEventService
{
    Task<Result<PagedResult<EventSummaryDto>>> SearchAsync(EventSearchRequest request, CancellationToken cancellationToken);
    Task<Result<ApplyToEventResponse>> ApplyToEventAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<ParticipationStatusDto>> UpdateParticipationStatusAsync(Guid eventId, Guid userId, ManageParticipationStatusRequest request, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<ParticipationStatusDto>> WithdrawAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<MyParticipationDto>>> GetMyParticipationsAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken);
}
