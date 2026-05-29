using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class DailyRecommendationServedEventConfiguration : IEntityTypeConfiguration<DailyRecommendationServedEvent>
{
    public void Configure(EntityTypeBuilder<DailyRecommendationServedEvent> builder)
    {
        builder.ToTable("user_daily_recommendation_served_events");
        builder.HasKey(x => new { x.PlanId, x.EventId });

        builder.Property(x => x.PlanId).HasColumnName("plan_id");
        builder.Property(x => x.EventId).HasColumnName("event_id");
        builder.Property(x => x.TagOrder).HasColumnName("tag_order");
        builder.Property(x => x.ServedAtUtc).HasColumnName("served_at_utc").HasColumnType("timestamp with time zone");

        builder.HasOne(x => x.Plan)
            .WithMany(x => x.ServedEvents)
            .HasForeignKey(x => x.PlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Event)
            .WithMany()
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.PlanId, x.ServedAtUtc });
    }
}
