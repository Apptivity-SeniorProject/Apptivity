using Apptivity.Application.Interfaces;

namespace Apptivity.Infrastructure.Options;

public sealed class RecommendationFeatureFlags : IRecommendationFeatureFlags
{
    public const string SectionName = "Recommendations";

    public bool DisableDailyLlmPlanReuseForTesting { get; init; }
}
