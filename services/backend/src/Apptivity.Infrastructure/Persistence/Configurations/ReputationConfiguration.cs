using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class ReputationConfiguration : IEntityTypeConfiguration<Reputation>
{
    public void Configure(EntityTypeBuilder<Reputation> builder)
    {
        builder.ToTable("reputations");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ReputationPoint)
            .HasDefaultValue(0.0)
            .HasPrecision(8, 4);

        // Shared primary key: Reputation.Id == User.Id
        builder.HasOne(x => x.User)
            .WithOne(x => x.Reputation)
            .HasForeignKey<Reputation>(x => x.Id)
            .OnDelete(DeleteBehavior.Cascade);

        // vote_point and level are computed/derived values — not stored separately.
        builder.Ignore(x => x.VotePoint);
        builder.Ignore(x => x.Level);
    }
}
