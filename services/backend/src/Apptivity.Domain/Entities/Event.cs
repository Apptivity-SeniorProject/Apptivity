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
    public string? RejectedViolationReason { get; set; }
    public string? RejectedAdditionalExplanation { get; set; }
    public decimal Price { get; set; }
    public string? LocationData { get; set; }
    public decimal? LocationLat { get; set; }
    public decimal? LocationLng { get; set; }
    public string? BannerImage { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsVotingClosed { get; set; } = false;

    /// <summary>
    /// UTC timestamp after which voting is automatically closed by the background job.
    /// Set to <c>event end time + 24 hours</c> when the event transitions to Completed.
    /// Null for events that completed before this feature was introduced.
    /// </summary>
    public DateTime? VotingClosesAt { get; set; }

    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
    public ICollection<Participation> Participations { get; set; } = new List<Participation>();
    public ICollection<Chat> Chats { get; set; } = new List<Chat>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
