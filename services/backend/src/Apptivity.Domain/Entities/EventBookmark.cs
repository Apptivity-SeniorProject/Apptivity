using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class EventBookmark : BaseEntity
{
    public Guid AccountId { get; set; }
    public Guid EventId { get; set; }

    public Account Account { get; set; } = null!;
    public Event Event { get; set; } = null!;
}
