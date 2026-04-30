using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class Chat : BaseEntity
{
    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public Guid CreatedByAccountId { get; set; }
    public Account CreatedByAccount { get; set; } = null!;

    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
