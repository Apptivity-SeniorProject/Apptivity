using Apptivity.Domain.Entities;

namespace Apptivity.Application.Services;

/// <summary>
/// Encapsulates all reputation and star-rating calculation logic.
/// Called by <see cref="ReviewService"/> inside the same UoW transaction.
/// Pure math — no external dependencies.
/// </summary>
public sealed class ReputationCalculator
{
    // The log base used per the spec: Point_max = log_{3/2}(n+1)
    // Change-of-base: log_{3/2}(x) = ln(x) / ln(3/2)
    private static readonly double Log32 = Math.Log(1.5);

    /// <summary>
    /// Updates a Club's rolling-average star rating after a new review is submitted.
    /// Formula: new_avg = (rated_count × rating + new_rating) / (rated_count + 1)
    /// </summary>
    /// <param name="clubRating">Tracked EF entity — mutations are written via UoW.</param>
    /// <param name="newStarRating">The incoming 1–5 star rating.</param>
    public void ApplyClubStarRating(ClubRating clubRating, int newStarRating)
    {
        var count = clubRating.RatedCount;
        clubRating.Rating = (count * clubRating.Rating + newStarRating) / (count + 1.0);
        clubRating.RatedCount = count + 1;
    }

    /// <summary>
    /// Calculates and applies the total reputation delta for a user based on all received votes in an event.
    ///
    /// Formula (per spec):
    ///   vote_point_i   = (reviewer.reputation_point + 100) / 200    → [0,1]
    ///   Score_i        = raw_vote × vote_point_i                     → raw_vote ∈ {-2,-1,0,+1,+2}
    ///   Point_max      = log_{3/2}(n + 1)
    ///   delta          = (Point_max / (2 × n²)) × Σ(Score_i)
    ///   reputation_point = clamp(reputation_point + delta, -100, +100)
    /// </summary>
    /// <param name="targetReputation">Tracked EF entity for the reviewed user.</param>
    /// <param name="votes">List of (rawVote, reviewerVotePoint) pairs for this event.</param>
    public void ApplyBatchUserReputationDelta(
        Reputation targetReputation,
        IReadOnlyList<(int RawVote, double ReviewerVotePoint)> votes)
    {
        var n = votes.Count;
        if (n == 0) return;

        double sumOfScores = 0;
        foreach (var vote in votes)
        {
            sumOfScores += vote.RawVote * vote.ReviewerVotePoint;
        }

        var pointMax = Math.Log(n + 1.0) / Log32;   // log_{3/2}(n+1)

        var delta = (pointMax / (2.0 * n * n)) * sumOfScores;

        targetReputation.ReputationPoint = Math.Clamp(
            targetReputation.ReputationPoint + delta,
            -100.0,
            100.0);
    }
}
