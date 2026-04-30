using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class ClubConfiguration : IEntityTypeConfiguration<Club>
{
    public void Configure(EntityTypeBuilder<Club> builder)
    {
        builder.ToTable("clubs");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(180).IsRequired();
        builder.Property(x => x.LocationCity).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(3000);
        builder.Property(x => x.Latitude).HasPrecision(9, 6);
        builder.Property(x => x.Longitude).HasPrecision(9, 6);

        builder.HasOne(x => x.Account)
            .WithOne(x => x.ClubProfile)
            .HasForeignKey<Club>(x => x.Id)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
