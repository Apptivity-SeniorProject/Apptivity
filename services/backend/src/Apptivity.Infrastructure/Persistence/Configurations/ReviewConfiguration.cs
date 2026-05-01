using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("reviews");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Comment).HasMaxLength(2000);

        builder.HasOne(x => x.Reviewer)
            .WithMany(x => x.WrittenReviews)
            .HasForeignKey(x => x.ReviewerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Reviewed)
            .WithMany(x => x.ReceivedReviews)
            .HasForeignKey(x => x.ReviewedId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Event)
            .WithMany(x => x.Reviews)
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Restrict);

        // Enforce: one review per reviewer/reviewed pair per event.
        builder.HasIndex(x => new { x.ReviewerId, x.ReviewedId, x.EventId })
            .IsUnique()
            .HasDatabaseName("ix_reviews_reviewer_reviewed_event_unique");
    }
}
