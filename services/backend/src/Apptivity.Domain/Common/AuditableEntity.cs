namespace Apptivity.Domain.Common;

public abstract class AuditableEntity<TId> : Entity<TId>
{
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
}
