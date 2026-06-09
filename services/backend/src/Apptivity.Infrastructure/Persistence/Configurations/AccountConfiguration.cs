using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("accounts");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Username).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(320);
        builder.Property(x => x.Password).HasMaxLength(512);
        builder.Property(x => x.ProfilePhoto).HasMaxLength(500);
        builder.Property(x => x.SocialLinks).HasMaxLength(2000);
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.SuspendedUntilUtc);

        builder.HasIndex(x => x.Username).IsUnique();
        builder.HasIndex(x => x.Phone).IsUnique();
        builder.HasIndex(x => x.Email).IsUnique();
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.SuspendedUntilUtc);

        builder.HasMany(x => x.InterestTags)
            .WithMany(x => x.Accounts)
            .UsingEntity<Dictionary<string, object>>(
                "account_tags",
                right => right
                    .HasOne<Tag>()
                    .WithMany()
                    .HasForeignKey("tag_id")
                    .OnDelete(DeleteBehavior.Cascade),
                left => left
                    .HasOne<Account>()
                    .WithMany()
                    .HasForeignKey("account_id")
                    .OnDelete(DeleteBehavior.Cascade),
                join =>
                {
                    join.ToTable("account_tags");
                    join.HasKey("account_id", "tag_id");
                });

    }
}
