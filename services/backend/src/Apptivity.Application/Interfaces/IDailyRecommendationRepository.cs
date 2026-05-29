using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IDailyRecommendationRepository
{
    Task AcquireUserRecommendationLockAsync(Guid userId, CancellationToken cancellationToken);
    Task<DailyRecommendationPlan?> GetPlanForDayAsync(Guid userId, string dayKey, CancellationToken cancellationToken);
    Task<DailyRecommendationCursor?> GetCursorForUpdateAsync(Guid planId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DailyRecommendationServedEvent>> GetRecentServedEventsAsync(Guid userId, DateTime sinceUtc, CancellationToken cancellationToken);
    Task<string?> GetMostFrequentServedClubCityAsync(Guid userId, CancellationToken cancellationToken);
    Task AddPlanAsync(DailyRecommendationPlan plan, CancellationToken cancellationToken);
}
