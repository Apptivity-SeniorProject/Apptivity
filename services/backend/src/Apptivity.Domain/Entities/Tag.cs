using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class Tag : BaseEntity
{
    public required string Name { get; set; }
    public string? IconName { get; set; }
    public string? ColorCode { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Event> PrimaryTaggedEvents { get; set; } = new List<Event>();
    public ICollection<Event> Events { get; set; } = new List<Event>();
}
