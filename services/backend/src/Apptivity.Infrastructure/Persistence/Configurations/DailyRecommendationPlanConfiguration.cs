using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class DailyRecommendationPlanConfiguration : IEntityTypeConfiguration<DailyRecommendationPlan>
{
    public void Configure(EntityTypeBuilder<DailyRecommendationPlan> builder)
    {
        builder.ToTable("user_daily_recommendation_plan");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(x => x.DayKey).HasColumnName("day_key").HasMaxLength(10).IsRequired();
        builder.Property(x => x.GeneratedAtUtc).HasColumnName("generated_at_utc").HasColumnType("timestamp with time zone");
        builder.Property(x => x.LlmGenerated).HasColumnName("llm_generated").HasDefaultValue(false);

        builder.HasIndex(x => new { x.UserId, x.DayKey })
            .IsUnique();

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
