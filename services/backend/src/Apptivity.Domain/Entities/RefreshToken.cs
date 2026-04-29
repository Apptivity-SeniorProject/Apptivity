using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class RefreshToken : AuditableEntity<Guid>
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public required string TokenHash { get; set; }
    public required string DeviceId { get; set; }
    public DateTime ExpiresUtc { get; set; }
    public DateTime? RevokedUtc { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => RevokedUtc is null && ExpiresUtc > DateTime.UtcNow;
}
