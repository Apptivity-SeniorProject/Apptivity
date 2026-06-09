using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class EventReputationService : IEventReputationService
{
    private readonly IEventRepository _eventRepository;
    private readonly IReviewRepository _reviewRepository;
    private readonly IReputationRepository _reputationRepository;
    private readonly IUserRepository _userRepository;
    private readonly ReputationCalculator _calculator;

    public EventReputationService(
        IEventRepository eventRepository,
        IReviewRepository reviewRepository,
        IReputationRepository reputationRepository,
        IUserRepository userRepository,
        ReputationCalculator calculator)
    {
        _eventRepository = eventRepository;
        _reviewRepository = reviewRepository;
        _reputationRepository = reputationRepository;
        _userRepository = userRepository;
        _calculator = calculator;
    }

    /// <summary>
    /// Calculates reputation/rating deltas for all reviewed accounts in the given event
    /// and applies them to the tracked EF entities.
    ///
    /// <para><b>Important:</b> This method does NOT call <c>SaveChangesAsync</c>.
    /// The caller (e.g. <see cref="EventLifecycleService"/>) is responsible for
    /// committing the transaction, which allows bundling the reputation update
    /// with <c>IsVotingClosed = true</c> in a single atomic write.</para>
    /// </summary>
    public async Task CalculateEventReputationsAsync(Guid eventId, CancellationToken cancellationToken)
    {
        var @event = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (@event is null)
        {
            return;
        }

        var reviews = await _reviewRepository.GetReviewsByEventIdAsync(eventId, cancellationToken);
        if (reviews.Count == 0)
        {
            return;
        }

        // ── Batch-fetch all reviewer reputations in a single query (N+1 fix) ────────
        var reviewerIds = reviews.Select(r => r.ReviewerId).Distinct().ToList();
        var reviewerReputationMap = await _reputationRepository.GetByAccountIdsAsync(reviewerIds, cancellationToken);

        // ── Group reviews by the account being reviewed ──────────────────────────────
        var reviewsByTarget = reviews.GroupBy(r => r.ReviewedId);

        foreach (var group in reviewsByTarget)
        {
            var targetAccountId = group.Key;
            var targetAccount = await _userRepository.GetAccountByIdAsync(targetAccountId, cancellationToken);

            if (targetAccount is null) continue;

            if (targetAccount.Type == AccountType.Individual)
            {
                // Ensure target has a reputation row (in case it wasn't seeded properly)
                var targetReputation = await _reputationRepository.GetByAccountIdAsync(targetAccountId, cancellationToken);
                if (targetReputation is null)
                {
                    targetReputation = new Domain.Entities.Reputation { Id = targetAccountId, ReputationPoint = 0 };
                    await _reputationRepository.AddReputationAsync(targetReputation, cancellationToken);
                }

                // Build votes list using the pre-fetched reviewer reputation map
                var votesData = group
                    .Select(review =>
                    {
                        // Default vote_point for a brand-new user (0 reputation) is 0.5
                        var votePoint = reviewerReputationMap.TryGetValue(review.ReviewerId, out var rep)
                            ? rep.VotePoint
                            : 0.5;
                        return (review.Rating, votePoint);
                    })
                    .ToList();

                _calculator.ApplyBatchUserReputationDelta(targetReputation, votesData);
            }
            else // Organization / Club
            {
                // Club star ratings are applied immediately when each review is submitted.
                // Skip them here so the voting-close worker does not double-apply the same reviews.
                continue;
            }
        }

        // NOTE: SaveChangesAsync is intentionally NOT called here.
        // The caller is responsible for the commit so that reputation updates
        // and IsVotingClosed = true are written in a single atomic transaction.
    }
}
