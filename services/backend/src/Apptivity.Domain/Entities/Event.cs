using Apptivity.Domain.Common;
using Apptivity.Domain.Enums;

namespace Apptivity.Domain.Entities;

public sealed class Event : AuditableEntity<Guid>
{
    public Guid OrganizerId { get; set; }
    public User Organizer { get; set; } = null!;

    public required string Title { get; set; }
    public required string Description { get; set; }
    public required string Location { get; set; }
    public DateTime StartUtc { get; set; }
    public DateTime EndUtc { get; set; }
    public EventStatus Status { get; set; } = EventStatus.Draft;
    public string? BannerUrl { get; set; }

    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
