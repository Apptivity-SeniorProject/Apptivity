using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class Tag : BaseEntity
{
    public required string Name { get; set; }
    public string? Description { get; set; }

    public ICollection<Event> PrimaryTaggedEvents { get; set; } = new List<Event>();
}
