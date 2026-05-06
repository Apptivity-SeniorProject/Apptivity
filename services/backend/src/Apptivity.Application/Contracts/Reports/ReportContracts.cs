using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Contracts.Reports;

public sealed record CreateReportRequest(
    Guid TargetId,
    ReportTargetType TargetType,
    ReportReasonCategory ReasonCategory,
    string Description);

public sealed record ReportResponse(
    Guid Id,
    Guid ReporterId,
    Guid TargetId,
    ReportTargetType TargetType,
    ReportReasonCategory ReasonCategory,
    string Description,
    ReportStatus Status,
    DateTime CreatedAt);

public interface IReportService
{
    Task<Result<ReportResponse>> CreateAsync(CreateReportRequest request, UserContext userContext, CancellationToken cancellationToken);
}
