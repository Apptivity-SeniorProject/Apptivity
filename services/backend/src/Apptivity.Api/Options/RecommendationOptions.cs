namespace Apptivity.Api.Options;

public sealed class RecommendationOptions
{
    public const string SectionName = "Recommendations";

    public bool RecommendedV6Enabled { get; set; } = true;
    public bool KillSwitchEnabled { get; set; } = false;
    public int RolloutPercentage { get; set; } = 100;
}
