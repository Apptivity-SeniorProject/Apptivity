using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.ToTable("events");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.DurationMinutes).IsRequired();
        builder.Property(x => x.Capacity).IsRequired();
        builder.Property(x => x.RemainingParticipationCount).IsRequired();
        builder.Property(x => x.Price).HasPrecision(18, 2);
        builder.Property(x => x.RejectedViolationReason).HasMaxLength(100);
        builder.Property(x => x.RejectedAdditionalExplanation).HasMaxLength(500);
        builder.Property(x => x.LocationData).HasMaxLength(2000);
        builder.Property(x => x.LocationLat).HasPrecision(9, 6);
        builder.Property(x => x.LocationLng).HasPrecision(9, 6);
        builder.Property(x => x.BannerImage).HasMaxLength(500);
        builder.Property(x => x.IsFeatured).HasDefaultValue(false);

        builder.HasOne(x => x.Owner)
            .WithMany(x => x.OwnedEvents)
            .HasForeignKey(x => x.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.PrimaryTag)
            .WithMany(x => x.PrimaryTaggedEvents)
            .HasForeignKey(x => x.PrimaryTagId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(x => x.Tags)
            .WithMany(x => x.Events)
            .UsingEntity<Dictionary<string, object>>(
                "event_tags",
                right => right
                    .HasOne<Tag>()
                    .WithMany()
                    .HasForeignKey("tag_id")
                    .OnDelete(DeleteBehavior.Cascade),
                left => left
                    .HasOne<Event>()
                    .WithMany()
                    .HasForeignKey("event_id")
                    .OnDelete(DeleteBehavior.Cascade),
                join =>
                {
                    join.ToTable("event_tags");
                    join.HasKey("event_id", "tag_id");
                });

        builder.HasIndex(x => x.IsFeatured);
        builder.HasIndex(x => new { x.LocationLat, x.LocationLng });
    }
}
