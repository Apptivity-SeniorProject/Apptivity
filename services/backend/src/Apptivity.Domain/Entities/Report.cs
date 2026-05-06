using Apptivity.Domain.Common;
using Apptivity.Domain.Enums;

namespace Apptivity.Domain.Entities;

public sealed class Report : BaseEntity
{
    public Guid ReporterId { get; set; }
    public Account Reporter { get; set; } = null!;
    public Guid TargetId { get; set; }
    public ReportTargetType TargetType { get; set; }
    public ReportReasonCategory ReasonCategory { get; set; }
    public required string Description { get; set; }
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
}
