using Apptivity.Domain.Common;
using Apptivity.Domain.Enums;

namespace Apptivity.Domain.Entities;

public sealed class Participation : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public ParticipationStatus Status { get; set; } = ParticipationStatus.Pending;
    public string? RejectionReason { get; set; }
}
