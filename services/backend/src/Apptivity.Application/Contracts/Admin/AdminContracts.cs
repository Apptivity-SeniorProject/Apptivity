using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Contracts.Admin;

public sealed record AdminDashboardStatsDto(
    int TotalUsers,
    int ActiveEvents,
    int RecentParticipations);

public sealed record AdminAccountsFilterRequest(
    bool? IsActive,
    AccountType? Type,
    int? MinReportCount,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record AdminAccountDto(
    Guid AccountId,
    string Username,
    string Phone,
    string? Email,
    AccountType Type,
    bool IsActive,
    int ReportCount,
    DateTime CreatedAt);

public sealed record UpdateAccountStatusRequest(bool IsActive);

public sealed record VerifyClubRequest(bool IsVerified = true);

public sealed record AdminClubDto(
    Guid ClubId,
    Guid AccountId,
    string Name,
    bool IsVerified);

public sealed record ToggleEventFeaturedRequest(bool IsFeatured);

public sealed record AdminEventModerationDto(
    Guid EventId,
    string EventName,
    EventStatus Status,
    bool IsFeatured,
    bool IsDeleted);

public sealed record ReportsFilterRequest(
    bool? IsResolved,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record AdminReportDto(
    Guid ReportId,
    Guid ReporterAccountId,
    Guid? TargetAccountId,
    Guid? TargetEventId,
    string Reason,
    bool IsResolved,
    DateTime CreatedAt,
    DateTime? ResolvedAt,
    Guid? ResolvedByAccountId);

public interface IAdminService
{
    Task<Result<AdminDashboardStatsDto>> GetDashboardStatsAsync(CancellationToken cancellationToken);
    Task<Result<PagedResult<AdminAccountDto>>> GetAccountsAsync(AdminAccountsFilterRequest request, CancellationToken cancellationToken);
    Task<Result<AdminAccountDto>> UpdateAccountStatusAsync(Guid accountId, UpdateAccountStatusRequest request, UserContext adminContext, CancellationToken cancellationToken);
    Task<Result<AdminClubDto>> VerifyClubAsync(Guid clubId, VerifyClubRequest request, UserContext adminContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<AdminReportDto>>> GetReportsAsync(ReportsFilterRequest request, CancellationToken cancellationToken);
    Task<Result<AdminEventModerationDto>> DeleteEventAsync(Guid eventId, UserContext adminContext, CancellationToken cancellationToken);
    Task<Result<AdminEventModerationDto>> ToggleFeaturedAsync(Guid eventId, ToggleEventFeaturedRequest request, UserContext adminContext, CancellationToken cancellationToken);
}
