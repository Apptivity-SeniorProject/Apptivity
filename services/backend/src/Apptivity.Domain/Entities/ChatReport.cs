using Apptivity.Domain.Common;
using Apptivity.Domain.Enums;

namespace Apptivity.Domain.Entities;

public sealed class ChatReport : BaseEntity
{
    public Guid ReporterId { get; set; }
    public Account Reporter { get; set; } = null!;

    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public ReportReasonCategory ReasonCategory { get; set; }
    public string? Description { get; set; }
    public ReportStatus Status { get; set; } = ReportStatus.Pending;

    public ICollection<ChatReportMessage> Messages { get; set; } = new List<ChatReportMessage>();
}
