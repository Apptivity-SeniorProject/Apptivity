using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

/// <summary>
/// Tracks the star rating of a Club (Organization) account.
/// Shares its primary key with the <see cref="Club"/> (and therefore <see cref="Account"/>) table.
/// </summary>
public sealed class ClubRating : BaseEntity
{
    /// <summary>Current rolling average rating (1–5 stars).</summary>
    public double Rating { get; set; } = 0;

    /// <summary>Total number of ratings received.</summary>
    public int RatedCount { get; set; } = 0;

    // Navigation
    public Club Club { get; set; } = null!;
}
