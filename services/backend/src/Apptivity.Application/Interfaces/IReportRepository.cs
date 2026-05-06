using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IReportRepository
{
    Task AddAsync(Report report, CancellationToken cancellationToken);
}
