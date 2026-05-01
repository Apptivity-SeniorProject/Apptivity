using Apptivity.Domain.Common;
using Apptivity.Domain.Enums;

namespace Apptivity.Domain.Entities;

public sealed class Event : BaseEntity
{
    public Guid OwnerId { get; set; }
    public Account Owner { get; set; } = null!;

    public Guid? PrimaryTagId { get; set; }
    public Tag? PrimaryTag { get; set; }

    public required string Name { get; set; }
    public required string Description { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public int DurationMinutes { get; set; } = 120;
    public int Capacity { get; set; }
    public int RemainingParticipationCount { get; set; }
    public EventStatus Status { get; set; } = EventStatus.Draft;
    public decimal Price { get; set; }
    public string? LocationData { get; set; }
    public bool IsVotingClosed { get; set; } = false;

    public ICollection<Participation> Participations { get; set; } = new List<Participation>();
    public ICollection<Chat> Chats { get; set; } = new List<Chat>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
