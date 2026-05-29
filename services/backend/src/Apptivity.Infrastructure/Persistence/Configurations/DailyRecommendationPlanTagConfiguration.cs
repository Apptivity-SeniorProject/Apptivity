using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class DailyRecommendationPlanTagConfiguration : IEntityTypeConfiguration<DailyRecommendationPlanTag>
{
    public void Configure(EntityTypeBuilder<DailyRecommendationPlanTag> builder)
    {
        builder.ToTable("user_daily_recommendation_plan_tags");
        builder.HasKey(x => new { x.PlanId, x.TagOrder });

        builder.Property(x => x.PlanId).HasColumnName("plan_id");
        builder.Property(x => x.TagOrder).HasColumnName("tag_order");
        builder.Property(x => x.TagId).HasColumnName("tag_id");
        builder.Property(x => x.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(32);

        builder.HasOne(x => x.Plan)
            .WithMany(x => x.Tags)
            .HasForeignKey(x => x.PlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Tag)
            .WithMany()
            .HasForeignKey(x => x.TagId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.PlanId, x.TagId });
    }
}
