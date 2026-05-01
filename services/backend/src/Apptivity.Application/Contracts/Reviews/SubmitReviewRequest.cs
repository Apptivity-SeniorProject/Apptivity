namespace Apptivity.Application.Contracts.Reviews;

/// <summary>
/// Request body for submitting a review.
/// Rating scale depends on the target account type:
///   - User target  → Rating ∈ {-2, -1, 0, +1, +2}
///   - Club target  → Rating ∈ {1, 2, 3, 4, 5}
/// </summary>
public sealed record SubmitReviewRequest(
    Guid ReviewedAccountId,
    Guid EventId,
    int Rating,
    string? Comment);
