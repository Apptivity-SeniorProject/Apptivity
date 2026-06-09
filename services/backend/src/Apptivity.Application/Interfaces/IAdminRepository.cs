using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Interfaces;

public sealed record AdminAccountFilter(
    bool? IsActive,
    AccountStatus? Status,
    AccountStatus? ExcludeStatus,
    AccountType? Type,
    int? MinReportCount,
    string? Query);

public sealed record AdminAccountListItem(
    Account Account,
    int ReportCount,
    string? DisplayName,
    string? OrganizationName,
    string? OrganizationCity,
    DateTime? SuspendedUntilUtc);

public sealed record AdminReportFilter(
    ReportStatus? Status,
    ReportTargetType? TargetType,
    string? AccountQuery,
    string? OrganizationQuery,
    string? UserQuery,
    string? EventQuery);

public sealed record AdminReportListItem(
    Report Report,
    string ReporterUsername,
    Guid? EventId,
    string? EventName,
    Guid? RelatedAccountId,
    AccountType? RelatedAccountType,
    string? RelatedUsername,
    string? RelatedUserFullName,
    string? RelatedOrganizationName);

public interface IAdminRepository
{
    Task<int> CountAccountsAsync(CancellationToken cancellationToken);
    Task<int> CountActiveEventsAsync(CancellationToken cancellationToken);
    Task<int> CountRecentParticipationsAsync(DateTime fromUtc, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<AdminAccountListItem> Items, int TotalCount)> GetAccountsAsync(AdminAccountFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetEventsAsync(EventStatus? status, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Club?> GetClubByIdAsync(Guid clubId, CancellationToken cancellationToken);
    Task<Event?> GetEventByIdAsync(Guid eventId, CancellationToken cancellationToken);
    Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<AdminReportListItem> Items, int TotalCount)> GetReportsAsync(AdminReportFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task AddAuditLogAsync(AuditLog auditLog, CancellationToken cancellationToken);
}
