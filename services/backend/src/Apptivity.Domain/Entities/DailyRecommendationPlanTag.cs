using Apptivity.Domain.Enums;

namespace Apptivity.Domain.Entities;

public sealed class DailyRecommendationPlanTag
{
    public Guid PlanId { get; set; }
    public DailyRecommendationPlan Plan { get; set; } = null!;

    public int TagOrder { get; set; }

    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;

    public DailyRecommendationTagSource Source { get; set; }
}
