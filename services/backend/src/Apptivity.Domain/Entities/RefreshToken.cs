using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class RefreshToken : BaseEntity
{
    public Guid AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public required string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}
