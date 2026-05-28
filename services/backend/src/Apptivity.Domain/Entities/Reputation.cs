using Apptivity.Domain.Common;
using Apptivity.Domain.Enums;

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

    /// <summary>
    /// Derived reputation tier based on <see cref="ReputationPoint"/>.
    /// Not persisted in the database — computed on read.
    /// </summary>
    public ReputationLevel Level => ReputationPoint switch
    {
        <= -60 => ReputationLevel.Pariah,
        <= -20 => ReputationLevel.Suspicious,
        <= +20 => ReputationLevel.Neutral,
        <= +60 => ReputationLevel.Trusted,
        _      => ReputationLevel.Exemplary,
    };

    // Navigation
    public User User { get; set; } = null!;
}
