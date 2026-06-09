using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Contracts.ChatReports;

public sealed record CreateChatReportRequest(
    Guid EventId,
    ReportReasonCategory ReasonCategory,
    string? Description);

public sealed record ChatReportMessageDto(
    Guid SenderAccountId,
    string SenderDisplayName,
    string Content,
    DateTime OriginalSentAtUtc);

public sealed record ChatReportResponse(
    Guid Id,
    Guid ReporterId,
    Guid EventId,
    ReportReasonCategory ReasonCategory,
    string? Description,
    ReportStatus Status,
    DateTime CreatedAt,
    int MessageCount);

public sealed record ChatReportDetailDto(
    Guid Id,
    Guid ReporterId,
    string ReporterUsername,
    Guid EventId,
    string EventName,
    ReportReasonCategory ReasonCategory,
    string? Description,
    ReportStatus Status,
    DateTime CreatedAt,
    IReadOnlyCollection<ChatReportMessageDto> Messages);

public interface IChatReportService
{
    Task<Result<Guid>> CreateChatReportAsync(CreateChatReportRequest request, UserContext userContext, CancellationToken cancellationToken);
}
