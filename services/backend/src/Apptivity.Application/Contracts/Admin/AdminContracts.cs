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
    AccountStatus? Status,
    AccountStatus? ExcludeStatus,
    AccountType? Type,
    int? MinReportCount,
    string? Query,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record AdminAccountDto(
    Guid AccountId,
    string Username,
    string Phone,
    string? Email,
    AccountType Type,
    AccountStatus Status,
    bool IsActive,
    int ReportCount,
    DateTime CreatedAt,
    string? DisplayName,
    string? OrganizationName,
    string? OrganizationCity,
    DateTime? SuspendedUntilUtc);

public sealed record CreateAdminOrganizationRequest(
    string Username,
    string Phone,
    string? Email,
    string Password,
    string Name,
    string LocationCity,
    string? Description,
    decimal? Latitude,
    decimal? Longitude);

public sealed record UpdateAccountStatusRequest(AccountStatus Status, int? SuspensionDays = null);

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

public sealed record AdminEventsFilterRequest(
    EventStatus? Status,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record ReportsFilterRequest(
    ReportStatus? Status,
    ReportTargetType? TargetType,
    string? AccountQuery,
    string? OrganizationQuery,
    string? UserQuery,
    string? EventQuery,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record AdminReportDto(
    Guid ReportId,
    Guid ReporterId,
    string ReporterUsername,
    Guid TargetId,
    ReportTargetType TargetType,
    ReportReasonCategory ReasonCategory,
    string Description,
    string? EvidenceImageUrl,
    ReportStatus Status,
    DateTime CreatedAt,
    Guid? EventId,
    string? EventName,
    Guid? RelatedAccountId,
    AccountType? RelatedAccountType,
    string? RelatedUsername,
    string? RelatedUserFullName,
    string? RelatedOrganizationName);

public sealed record AdminReportStatusDto(
    Guid ReportId,
    ReportStatus Status);

public sealed record ChatReportsFilterRequest(
    ReportStatus? Status,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record AdminChatReportDto(
    Guid ReportId,
    Guid ReporterId,
    string ReporterUsername,
    Guid EventId,
    string EventName,
    ReportReasonCategory ReasonCategory,
    ReportStatus Status,
    DateTime CreatedAt);

public sealed record AdminChatReportMessageDto(
    Guid SenderAccountId,
    string SenderDisplayName,
    string Content,
    DateTime OriginalSentAtUtc);

public sealed record AdminChatReportDetailDto(
    Guid ReportId,
    Guid ReporterId,
    string ReporterUsername,
    Guid EventId,
    string EventName,
    string? Description,
    ReportReasonCategory ReasonCategory,
    ReportStatus Status,
    DateTime CreatedAt,
    IReadOnlyCollection<AdminChatReportMessageDto> Messages);

public interface IAdminService
{
    Task<Result<AdminDashboardStatsDto>> GetDashboardStatsAsync(CancellationToken cancellationToken);
    Task<Result<PagedResult<AdminAccountDto>>> GetAccountsAsync(AdminAccountsFilterRequest request, CancellationToken cancellationToken);
    Task<Result<AdminAccountDto>> CreateOrganizationAsync(CreateAdminOrganizationRequest request, UserContext adminContext, CancellationToken cancellationToken);
    Task<Result<AdminAccountDto>> UpdateAccountStatusAsync(Guid accountId, UpdateAccountStatusRequest request, UserContext adminContext, CancellationToken cancellationToken);
    Task<Result<AdminClubDto>> VerifyClubAsync(Guid clubId, VerifyClubRequest request, UserContext adminContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<AdminEventModerationDto>>> GetEventsAsync(AdminEventsFilterRequest request, CancellationToken cancellationToken);
    Task<Result<PagedResult<AdminReportDto>>> GetReportsAsync(ReportsFilterRequest request, CancellationToken cancellationToken);
    Task<Result<AdminReportStatusDto>> IgnoreReportAsync(Guid reportId, UserContext adminContext, CancellationToken cancellationToken);
    Task<Result<PagedResult<AdminChatReportDto>>> GetChatReportsAsync(ChatReportsFilterRequest request, CancellationToken cancellationToken);
    Task<Result<AdminChatReportDetailDto>> GetChatReportDetailAsync(Guid reportId, CancellationToken cancellationToken);
    Task<Result<AdminEventModerationDto>> DeleteEventAsync(Guid eventId, UserContext adminContext, CancellationToken cancellationToken);
    Task<Result<AdminEventModerationDto>> ToggleFeaturedAsync(Guid eventId, ToggleEventFeaturedRequest request, UserContext adminContext, CancellationToken cancellationToken);
}
