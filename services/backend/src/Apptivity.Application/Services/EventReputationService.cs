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
    private readonly IUnitOfWork _unitOfWork;

    public EventReputationService(
        IEventRepository eventRepository,
        IReviewRepository reviewRepository,
        IReputationRepository reputationRepository,
        IUserRepository userRepository,
        ReputationCalculator calculator,
        IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _reviewRepository = reviewRepository;
        _reputationRepository = reputationRepository;
        _userRepository = userRepository;
        _calculator = calculator;
        _unitOfWork = unitOfWork;
    }

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

        // Group reviews by the account being reviewed
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

                // Prepare votes data
                var votesData = new List<(int RawVote, double ReviewerVotePoint)>();

                foreach (var review in group)
                {
                    var reviewerRep = await _reputationRepository.GetByAccountIdAsync(review.ReviewerId, cancellationToken);
                    
                    // If reviewer has no reputation, default vote point logic applies (0.5 weight for 0 point)
                    double votePoint = reviewerRep?.VotePoint ?? 0.5;
                    votesData.Add((review.Rating, votePoint));
                }

                // Batch calculate and apply
                _calculator.ApplyBatchUserReputationDelta(targetReputation, votesData);
            }
            else // Organization / Club
            {
                var clubRating = await _reputationRepository.GetClubRatingByAccountIdAsync(targetAccountId, cancellationToken);
                if (clubRating is null)
                {
                    clubRating = new Domain.Entities.ClubRating { Id = targetAccountId, Rating = 0, RatedCount = 0 };
                    await _reputationRepository.AddClubRatingAsync(clubRating, cancellationToken);
                }

                // Apply sequentially for the rolling average
                foreach (var review in group)
                {
                    _calculator.ApplyClubStarRating(clubRating, review.Rating);
                }
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
