namespace Apptivity.Domain.Entities;

public sealed class DailyRecommendationPlan
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Account User { get; set; } = null!;

    public required string DayKey { get; set; }
    public DateTime GeneratedAtUtc { get; set; }
    public bool LlmGenerated { get; set; }

    public ICollection<DailyRecommendationPlanTag> Tags { get; set; } = new List<DailyRecommendationPlanTag>();
    public ICollection<DailyRecommendationServedEvent> ServedEvents { get; set; } = new List<DailyRecommendationServedEvent>();
    public DailyRecommendationCursor? Cursor { get; set; }
}
