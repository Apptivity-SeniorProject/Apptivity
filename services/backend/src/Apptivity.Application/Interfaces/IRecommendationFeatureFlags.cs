namespace Apptivity.Application.Interfaces;

public interface IRecommendationFeatureFlags
{
    bool DisableDailyLlmPlanReuseForTesting { get; }
}
