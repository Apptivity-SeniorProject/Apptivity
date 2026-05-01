using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IReviewRepository
{
    Task AddAsync(Review review, CancellationToken cancellationToken);

    Task<Review?> GetByIdAsync(Guid reviewId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the existing review for the given reviewer/reviewed pair on the given event,
    /// or null if none exists. Used for duplicate-check guard.
    /// </summary>
    Task<Review?> GetDuplicateAsync(Guid reviewerId, Guid reviewedId, Guid eventId, CancellationToken cancellationToken);

    /// <summary>Returns all reviews received by an account, ordered newest-first.</summary>
    Task<List<Review>> GetByReviewedAccountIdAsync(Guid accountId, int skip, int take, CancellationToken cancellationToken);

    Task<int> CountByReviewedAccountIdAsync(Guid accountId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the count of reviews already cast on a specific target user for a specific event.
    /// Used by the reputation formula to determine voter_count (n).
    /// </summary>
    Task<int> CountReviewsForUserInEventAsync(Guid reviewedUserId, Guid eventId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns all reviews submitted for a specific event. Used for batch reputation calculation.
    /// </summary>
    Task<List<Review>> GetReviewsByEventIdAsync(Guid eventId, CancellationToken cancellationToken);
}
