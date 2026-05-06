using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Interfaces;

public sealed record AdminAccountFilter(
    bool? IsActive,
    AccountType? Type,
    int? MinReportCount);

public sealed record AdminAccountListItem(
    Account Account,
    int ReportCount);

public interface IAdminRepository
{
    Task<int> CountAccountsAsync(CancellationToken cancellationToken);
    Task<int> CountActiveEventsAsync(CancellationToken cancellationToken);
    Task<int> CountRecentParticipationsAsync(DateTime fromUtc, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<AdminAccountListItem> Items, int TotalCount)> GetAccountsAsync(AdminAccountFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Club?> GetClubByIdAsync(Guid clubId, CancellationToken cancellationToken);
    Task<Event?> GetEventByIdAsync(Guid eventId, CancellationToken cancellationToken);
    Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Report> Items, int TotalCount)> GetReportsAsync(ReportStatus? status, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task AddAuditLogAsync(AuditLog auditLog, CancellationToken cancellationToken);
}
