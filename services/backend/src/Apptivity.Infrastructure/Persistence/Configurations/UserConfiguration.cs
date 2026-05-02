using Apptivity.Domain.Entities;
using Apptivity.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Surname).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Gender).HasMaxLength(32);
        builder.Property(x => x.Bio).HasMaxLength(2000);

        builder.HasOne(x => x.Account)
            .WithOne(x => x.UserProfile)
            .HasForeignKey<User>(x => x.Id)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasData(ManualTestSeed.Users);
    }
}
