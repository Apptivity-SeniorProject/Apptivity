using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Token).HasMaxLength(512).IsRequired();

        builder.HasOne(x => x.Account)
            .WithMany(x => x.RefreshTokens)
            .HasForeignKey(x => x.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Token).IsUnique();
    }
}
