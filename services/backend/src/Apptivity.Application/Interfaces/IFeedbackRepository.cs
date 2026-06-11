using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IFeedbackRepository
{
    Task AddAsync(FeedbackSubmission submission, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<FeedbackSubmission> Items, int TotalCount)> GetPagedAsync(
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);
    Task<FeedbackSubmission?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    void Remove(FeedbackSubmission submission);
}
