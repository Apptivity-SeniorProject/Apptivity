using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Action).HasMaxLength(120).IsRequired();
        builder.Property(x => x.EntityType).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Details).HasMaxLength(3000);

        builder.HasOne(x => x.AdminAccount)
            .WithMany(x => x.AuditLogs)
            .HasForeignKey(x => x.AdminAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.AdminAccountId);
        builder.HasIndex(x => x.CreatedAt);
    }
}
