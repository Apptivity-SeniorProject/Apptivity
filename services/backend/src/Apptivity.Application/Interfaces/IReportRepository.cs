using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Interfaces;

public interface IReportRepository
{
    Task AddAsync(Report report, CancellationToken cancellationToken);
    Task<Report?> GetByIdAsync(Guid reportId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Report>> GetNonResolvedByTargetAsync(ReportTargetType targetType, Guid targetId, CancellationToken cancellationToken);
}
