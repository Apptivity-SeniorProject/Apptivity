using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class OtpVerificationConfiguration : IEntityTypeConfiguration<OtpVerification>
{
    public void Configure(EntityTypeBuilder<OtpVerification> builder)
    {
        builder.ToTable("otp_verifications");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.PhoneNumber).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(16).IsRequired();

        builder.HasIndex(x => new { x.PhoneNumber, x.Code });
    }
}
