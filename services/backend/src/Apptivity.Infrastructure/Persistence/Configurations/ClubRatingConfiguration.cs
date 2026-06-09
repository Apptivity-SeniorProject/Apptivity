using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class ClubRatingConfiguration : IEntityTypeConfiguration<ClubRating>
{
    public void Configure(EntityTypeBuilder<ClubRating> builder)
    {
        builder.ToTable("club_ratings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Rating)
            .HasDefaultValue(0.0)
            .HasPrecision(4, 2);

        builder.Property(x => x.RatedCount)
            .HasDefaultValue(0);

        // Shared primary key: ClubRating.Id == Club.Id
        builder.HasOne(x => x.Club)
            .WithOne(x => x.ClubRating)
            .HasForeignKey<ClubRating>(x => x.Id)
            .OnDelete(DeleteBehavior.Cascade);

    }
}
