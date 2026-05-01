using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class Report : BaseEntity
{
    public Guid ReporterAccountId { get; set; }
    public Account ReporterAccount { get; set; } = null!;

    public Guid? TargetAccountId { get; set; }
    public Account? TargetAccount { get; set; }

    public Guid? TargetEventId { get; set; }
    public Event? TargetEvent { get; set; }

    public required string Reason { get; set; }
    public bool IsResolved { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public Guid? ResolvedByAccountId { get; set; }
    public Account? ResolvedByAccount { get; set; }
}
