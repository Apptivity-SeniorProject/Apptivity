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
        builder.Property(x => x.Capacity).IsRequired();
        builder.Property(x => x.Price).HasPrecision(18, 2);
        builder.Property(x => x.LocationData).HasMaxLength(2000);

        builder.HasOne(x => x.Owner)
            .WithMany(x => x.OwnedEvents)
            .HasForeignKey(x => x.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.PrimaryTag)
            .WithMany(x => x.PrimaryTaggedEvents)
            .HasForeignKey(x => x.PrimaryTagId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
