using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public sealed record EventSearchFilter(
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
    string? Sort);

public interface IEventRepository
{
    Task<Event?> GetByIdAsync(Guid eventId, CancellationToken cancellationToken);
    Task<Event?> GetByIdWithOwnerAsync(Guid eventId, CancellationToken cancellationToken);
    Task<int> CountByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByOwnerIdAsync(Guid ownerId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByApprovedParticipantAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Event?> GetWithParticipantsAsync(Guid eventId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Event>> GetPublishedAndOngoingAsync(CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Event> Items, int TotalCount)> SearchAsync(EventSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetRecommendedByTagIdsAsync(IReadOnlyCollection<Guid> tagIds, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<string>> GetApprovedHistoryTagNamesAsync(Guid accountId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Event>> GetSimilarEventsAsync(Guid eventId, Guid primaryTagId, int count, CancellationToken cancellationToken);
    IQueryable<Event> Query();
    Task AddAsync(Event entity, CancellationToken cancellationToken);

    /// <summary>
    /// Returns Completed events where <c>VotingClosesAt &lt;= utcNow</c>
    /// and <c>IsVotingClosed == false</c>. Used by the voting-close background job.
    /// </summary>
    Task<IReadOnlyCollection<Event>> GetCompletedWithExpiredVotingAsync(CancellationToken cancellationToken);
}
