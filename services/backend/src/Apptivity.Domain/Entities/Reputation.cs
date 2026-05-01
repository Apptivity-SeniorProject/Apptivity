using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

/// <summary>
/// Tracks the reputation score of an Individual user account.
/// Shares its primary key with the <see cref="User"/> (and therefore <see cref="Account"/>) table.
/// </summary>
public sealed class Reputation : BaseEntity
{
    /// <summary>Cumulative reputation score, clamped to [-100, +100].</summary>
    public double ReputationPoint { get; set; } = 0;

    /// <summary>
    /// Derived weight applied to this user's votes.
    /// vote_point = (reputation_point + 100) / 200  → [0, 1]
    /// </summary>
    public double VotePoint => (ReputationPoint + 100.0) / 200.0;

    // Navigation
    public User User { get; set; } = null!;
}
