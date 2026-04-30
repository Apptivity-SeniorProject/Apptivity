using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class DeviceTokenConfiguration : IEntityTypeConfiguration<DeviceToken>
{
    public void Configure(EntityTypeBuilder<DeviceToken> builder)
    {
        builder.ToTable("device_tokens");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.FcmToken).HasMaxLength(1024).IsRequired();
        builder.Property(x => x.DeviceType).HasMaxLength(32).IsRequired();

        builder.HasOne(x => x.Account)
            .WithMany(x => x.DeviceTokens)
            .HasForeignKey(x => x.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.FcmToken).IsUnique();
    }
}
