using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Interfaces;

public sealed record ChatReportFilter(
    ReportStatus? Status,
    int PageNumber,
    int PageSize);

public interface IChatReportRepository
{
    Task AddAsync(ChatReport chatReport, CancellationToken cancellationToken);
    Task<ChatReport?> GetByIdWithMessagesAsync(Guid id, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<ChatReport> Items, int TotalCount)> GetListAsync(ChatReportFilter filter, CancellationToken cancellationToken);
}
