using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class DailyRecommendationCursorConfiguration : IEntityTypeConfiguration<DailyRecommendationCursor>
{
    public void Configure(EntityTypeBuilder<DailyRecommendationCursor> builder)
    {
        builder.ToTable("user_daily_recommendation_cursor");
        builder.HasKey(x => x.PlanId);

        builder.Property(x => x.PlanId).HasColumnName("plan_id");
        builder.Property(x => x.CurrentTagOrder).HasColumnName("current_tag_order");
        builder.Property(x => x.IsDepleted).HasColumnName("is_depleted").HasDefaultValue(false);

        builder.HasOne(x => x.Plan)
            .WithOne(x => x.Cursor)
            .HasForeignKey<DailyRecommendationCursor>(x => x.PlanId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
