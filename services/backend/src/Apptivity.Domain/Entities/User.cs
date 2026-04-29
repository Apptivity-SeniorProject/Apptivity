using Apptivity.Domain.Common;
using Apptivity.Domain.Enums;

namespace Apptivity.Domain.Entities;

public sealed class User : AuditableEntity<Guid>
{
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? PasswordHash { get; set; }
    public required string DisplayName { get; set; }
    public UserRole Role { get; set; }
    public int ReputationScore { get; set; }

    public ICollection<Event> OrganizedEvents { get; set; } = new List<Event>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
