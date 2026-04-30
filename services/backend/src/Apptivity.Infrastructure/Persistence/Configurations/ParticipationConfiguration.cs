using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class ParticipationConfiguration : IEntityTypeConfiguration<Participation>
{
    public void Configure(EntityTypeBuilder<Participation> builder)
    {
        builder.ToTable("participations");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.RejectionReason).HasMaxLength(1000);

        builder.HasOne(x => x.User)
            .WithMany(x => x.Participations)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Event)
            .WithMany(x => x.Participations)
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.UserId, x.EventId }).IsUnique();
    }
}
