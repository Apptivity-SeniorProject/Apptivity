namespace Apptivity.Domain.Entities;

public sealed class DailyRecommendationServedEvent
{
    public Guid PlanId { get; set; }
    public DailyRecommendationPlan Plan { get; set; } = null!;

    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public int TagOrder { get; set; }
    public DateTime ServedAtUtc { get; set; }
}
