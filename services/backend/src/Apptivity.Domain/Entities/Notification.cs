using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class Notification : BaseEntity
{
    public Guid AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public required string Title { get; set; }
    public required string Content { get; set; }
    public bool IsRead { get; set; }
    public Guid? RelatedEntityId { get; set; }
}
