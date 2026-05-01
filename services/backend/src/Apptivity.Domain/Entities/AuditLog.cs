using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class AuditLog : BaseEntity
{
    public Guid AdminAccountId { get; set; }
    public Account AdminAccount { get; set; } = null!;

    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public string? Details { get; set; }
}
