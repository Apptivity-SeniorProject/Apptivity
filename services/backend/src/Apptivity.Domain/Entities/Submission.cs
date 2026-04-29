using Apptivity.Domain.Common;
using Apptivity.Domain.Enums;

namespace Apptivity.Domain.Entities;

public sealed class Submission : AuditableEntity<Guid>
{
    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public Guid AttendeeId { get; set; }
    public User Attendee { get; set; } = null!;

    public SubmissionStatus Status { get; set; } = SubmissionStatus.Pending;
    public string? Note { get; set; }
}
