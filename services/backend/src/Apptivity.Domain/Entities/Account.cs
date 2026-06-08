using Apptivity.Domain.Common;
using Apptivity.Domain.Enums;

namespace Apptivity.Domain.Entities;

public sealed class Account : BaseEntity
{
    public AccountType Type { get; set; }
    public required string Username { get; set; }
    public required string Phone { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? ProfilePhoto { get; set; }
    public string? SocialLinks { get; set; }
    public AccountStatus Status { get; set; } = AccountStatus.Active;
    public bool IsActive { get; set; } = true;
    public DateTime? SuspendedUntilUtc { get; set; }

    public User? UserProfile { get; set; }
    public Club? ClubProfile { get; set; }

    public ICollection<Event> OwnedEvents { get; set; } = new List<Event>();
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    public ICollection<Chat> CreatedChats { get; set; } = new List<Chat>();

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<DeviceToken> DeviceTokens { get; set; } = new List<DeviceToken>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<Review> WrittenReviews { get; set; } = new List<Review>();
    public ICollection<Review> ReceivedReviews { get; set; } = new List<Review>();
    public ICollection<Report> FiledReports { get; set; } = new List<Report>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<Tag> InterestTags { get; set; } = new List<Tag>();
}
