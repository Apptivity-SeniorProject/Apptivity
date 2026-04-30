using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class Review : BaseEntity
{
    public Guid ReviewerId { get; set; }
    public Account Reviewer { get; set; } = null!;

    public Guid ReviewedId { get; set; }
    public Account Reviewed { get; set; } = null!;

    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public int Rating { get; set; }
    public string? Comment { get; set; }
}
