using Apptivity.Application.Common.Models;

namespace Apptivity.Application.Contracts.Feedback;

public sealed record SubmitFeedbackRequest(
    string FirstName,
    string LastName,
    string? Email,
    string Message);

public sealed record FeedbackItemDto(
    Guid FeedbackId,
    string FirstName,
    string LastName,
    string? Email,
    string Message,
    DateTime CreatedAt);

public interface IFeedbackService
{
    Task<Result> SubmitAsync(SubmitFeedbackRequest request, CancellationToken cancellationToken);
    Task<Result<PagedResult<FeedbackItemDto>>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken);
}
