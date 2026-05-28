namespace Apptivity.Domain.Enums;

/// <summary>
/// Represents the reputation tier of an individual user account,
/// derived from their <see cref="Entities.Reputation.ReputationPoint"/> value.
/// </summary>
/// <remarks>
/// Thresholds:
///   Pariah    : (-∞, -60]
///   Suspicious: (-60, -20]
///   Neutral   : (-20, +20]
///   Trusted   : (+20, +60]
///   Exemplary : (+60, +∞)
/// </remarks>
public enum ReputationLevel
{
    Pariah = 0,
    Suspicious = 1,
    Neutral = 2,
    Trusted = 3,
    Exemplary = 4,
}
