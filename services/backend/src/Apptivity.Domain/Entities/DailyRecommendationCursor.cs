namespace Apptivity.Domain.Entities;

public sealed class DailyRecommendationCursor
{
    public Guid PlanId { get; set; }
    public DailyRecommendationPlan Plan { get; set; } = null!;

    public int CurrentTagOrder { get; set; } = 1;
    public bool IsDepleted { get; set; }
}
