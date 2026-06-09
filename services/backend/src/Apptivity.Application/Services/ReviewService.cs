using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Reviews;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

/// <summary>
/// Orchestrates the post-event review flow:
/// validates business rules -> saves the review -> updates reputation/rating -> commits via UoW.
/// All mutations occur within a single transaction (shared DbContext / UoW).
/// </summary>
public sealed class ReviewService : IReviewService
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;
    private readonly IReputationRepository _reputationRepository;
    private readonly ReputationCalculator _calculator;
    private readonly IUnitOfWork _unitOfWork;

    // These are concrete infrastructure repositories used directly (same pattern as EventsController).
    private readonly IEventRepository _eventRepository;
    private readonly IParticipationRepository _participationRepository;

    public ReviewService(
        IUserRepository userRepository,
        IReviewRepository reviewRepository,
        IReputationRepository reputationRepository,
        ReputationCalculator calculator,
        IEventRepository eventRepository,
        IParticipationRepository participationRepository,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
        _reputationRepository = reputationRepository;
        _calculator = calculator;
        _eventRepository = eventRepository;
        _participationRepository = participationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ReviewResponse>> SubmitReviewAsync(
        Guid reviewerAccountId,
        SubmitReviewRequest request,
        CancellationToken cancellationToken)
    {
        var reviewerAccount = await _userRepository.GetAccountByIdAsync(reviewerAccountId, cancellationToken);
        if (reviewerAccount is null)
        {
            return Result<ReviewResponse>.Failure(ErrorCodes.AccountNotFound, "Reviewer account not found.");
        }

        if (reviewerAccount.Type != AccountType.Individual)
        {
            return Result<ReviewResponse>.Failure(
                ErrorCodes.ReviewClubCannotReview,
                "Only individual users can submit reviews.");
        }

        if (reviewerAccountId == request.ReviewedAccountId)
        {
            return Result<ReviewResponse>.Failure(
                ErrorCodes.ReviewSelfReview,
                "You cannot review yourself.");
        }

        var reviewedAccount = await _userRepository.GetAccountByIdAsync(request.ReviewedAccountId, cancellationToken);
        if (reviewedAccount is null)
        {
            return Result<ReviewResponse>.Failure(ErrorCodes.AccountNotFound, "Reviewed account not found.");
        }

        if (reviewedAccount.Type != AccountType.Individual && reviewedAccount.Type != AccountType.Organization)
        {
            return Result<ReviewResponse>.Failure(
                ErrorCodes.ReviewInvalidTarget,
                "The target account type cannot be reviewed.");
        }

        if (reviewedAccount.Type == AccountType.Individual)
        {
            if (request.Rating < -2 || request.Rating > 2)
            {
                return Result<ReviewResponse>.Failure(
                    ErrorCodes.ReviewInvalidRating,
                    "Rating for a user must be between -2 and +2.");
            }
        }
        else
        {
            if (request.Rating < 1 || request.Rating > 5)
            {
                return Result<ReviewResponse>.Failure(
                    ErrorCodes.ReviewInvalidRating,
                    "Star rating for a club must be between 1 and 5.");
            }
        }

        var @event = await _eventRepository.GetByIdAsync(request.EventId, cancellationToken);
        if (@event is null)
        {
            return Result<ReviewResponse>.Failure(ErrorCodes.ReviewNotFound, "Event not found.");
        }

        if (@event.Status != EventStatus.Completed)
        {
            return Result<ReviewResponse>.Failure(
                ErrorCodes.ReviewEventNotCompleted,
                "Reviews can only be submitted for completed events.");
        }

        if (@event.IsVotingClosed)
        {
            return Result<ReviewResponse>.Failure(
                ErrorCodes.ReviewVotingClosed,
                "Voting is closed for this event.");
        }

        if (reviewerAccount.UserProfile is null)
        {
            return Result<ReviewResponse>.Failure(ErrorCodes.ReviewNotParticipant, "Reviewer profile not found.");
        }

        var participation = await _participationRepository.GetByUserAndEventAsync(
            reviewerAccount.UserProfile.Id,
            request.EventId,
            cancellationToken);

        var isEventOwner = @event.OwnerId == reviewerAccountId;
        if (!isEventOwner && (participation is null || participation.Status != ParticipationStatus.Approved))
        {
            return Result<ReviewResponse>.Failure(
                ErrorCodes.ReviewNotParticipant,
                "You must be an approved participant of this event to leave a review.");
        }

        var duplicate = await _reviewRepository.GetDuplicateAsync(
            reviewerAccountId,
            request.ReviewedAccountId,
            request.EventId,
            cancellationToken);

        if (duplicate is not null)
        {
            return Result<ReviewResponse>.Failure(
                ErrorCodes.ReviewDuplicate,
                "You have already submitted a review for this account on this event.");
        }

        var review = new Review
        {
            Id = Guid.NewGuid(),
            ReviewerId = reviewerAccountId,
            ReviewedId = request.ReviewedAccountId,
            EventId = request.EventId,
            Rating = request.Rating,
            Comment = request.Comment?.Trim()
        };

        await _reviewRepository.AddAsync(review, cancellationToken);

        if (reviewedAccount.Type == AccountType.Organization)
        {
            var clubRating = await _reputationRepository.GetClubRatingByAccountIdAsync(request.ReviewedAccountId, cancellationToken);
            if (clubRating is null)
            {
                clubRating = new ClubRating
                {
                    Id = request.ReviewedAccountId,
                    Rating = 0,
                    RatedCount = 0
                };

                await _reputationRepository.AddClubRatingAsync(clubRating, cancellationToken);
            }

            _calculator.ApplyClubStarRating(clubRating, request.Rating);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var response = new ReviewResponse(
            review.Id,
            reviewerAccountId,
            reviewerAccount.Username,
            request.ReviewedAccountId,
            reviewedAccount.Username,
            request.EventId,
            @event.Name,
            review.Rating,
            review.Comment,
            DateTime.UtcNow);

        return Result<ReviewResponse>.Success(response);
    }

    public async Task<Result<ReviewListResponse>> GetReviewsForAccountAsync(
        Guid accountId,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var total = await _reviewRepository.CountByReviewedAccountIdAsync(accountId, cancellationToken);
        var items = await _reviewRepository.GetByReviewedAccountIdAsync(
            accountId, (pageNumber - 1) * pageSize, pageSize, cancellationToken);

        var responses = items.Select(r => new ReviewResponse(
            r.Id,
            r.ReviewerId,
            r.Reviewer.Username,
            r.ReviewedId,
            r.Reviewed.Username,
            r.EventId,
            r.Event.Name,
            r.Rating,
            r.Comment,
            r.CreatedAt)).ToList();

        return Result<ReviewListResponse>.Success(
            new ReviewListResponse(responses, total, pageNumber, pageSize));
    }
}
