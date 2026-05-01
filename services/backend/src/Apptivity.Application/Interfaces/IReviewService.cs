using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Reviews;

namespace Apptivity.Application.Interfaces;

public interface IReviewService
{
    Task<Result<ReviewResponse>> SubmitReviewAsync(Guid reviewerAccountId, SubmitReviewRequest request, CancellationToken cancellationToken);

    Task<Result<ReviewListResponse>> GetReviewsForAccountAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken);
}
