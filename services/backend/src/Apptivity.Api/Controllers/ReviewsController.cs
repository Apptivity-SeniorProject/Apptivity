using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Reviews;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/reviews")]
[Authorize]
public sealed class ReviewsController : ApiControllerBase
{
    private readonly IReviewService _reviewService;
    private readonly IUserContextAccessor _userContextAccessor;

    public ReviewsController(IReviewService reviewService, IUserContextAccessor userContextAccessor)
    {
        _reviewService = reviewService;
        _userContextAccessor = userContextAccessor;
    }

    /// <summary>
    /// Submit a review for an account after a completed event.
    /// - Reviewer must be an Individual (Club accounts cannot review).
    /// - Event must have Status = Completed.
    /// - Reviewer must be an Approved participant (or be the event owner).
    /// - Rating scale: -2..+2 for User targets, 1..5 for Club targets.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> SubmitReview(
        [FromBody] SubmitReviewRequest request,
        CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var result = await _reviewService.SubmitReviewAsync(context.AccountId, request, cancellationToken);
        return FromResult(result);
    }

    /// <summary>
    /// Returns a paginated list of reviews received by the specified account.
    /// </summary>
    [HttpGet("account/{id:guid}")]
    public async Task<IActionResult> GetReviewsForAccount(
        [FromRoute] Guid id,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _reviewService.GetReviewsForAccountAsync(id, pageNumber, pageSize, cancellationToken);
        return FromResult(result);
    }
}
