using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

/// <summary>
/// Repository for reading and persisting <see cref="Reputation"/> and <see cref="ClubRating"/> rows.
/// Both entities use shared PKs, so lookups are always by Account/Club ID.
/// </summary>
public interface IReputationRepository
{
    Task<Reputation?> GetByAccountIdAsync(Guid accountId, CancellationToken cancellationToken);
    Task<ClubRating?> GetClubRatingByAccountIdAsync(Guid accountId, CancellationToken cancellationToken);

    /// <summary>
    /// Batch-fetches <see cref="Reputation"/> rows for multiple accounts in a single query.
    /// Returns a dictionary keyed by AccountId for O(1) lookups.
    /// </summary>
    Task<Dictionary<Guid, Reputation>> GetByAccountIdsAsync(IReadOnlyCollection<Guid> accountIds, CancellationToken cancellationToken);

    Task AddReputationAsync(Reputation reputation, CancellationToken cancellationToken);
    Task AddClubRatingAsync(ClubRating clubRating, CancellationToken cancellationToken);
}
