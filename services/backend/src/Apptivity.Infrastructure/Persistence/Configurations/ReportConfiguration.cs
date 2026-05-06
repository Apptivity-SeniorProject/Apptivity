using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.ToTable("reports");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.TargetId).IsRequired();
        builder.Property(x => x.TargetType).HasConversion<int>().IsRequired();
        builder.Property(x => x.ReasonCategory).HasConversion<int>().IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();

        builder.HasOne(x => x.Reporter)
            .WithMany(x => x.FiledReports)
            .HasForeignKey(x => x.ReporterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => new { x.TargetType, x.TargetId });
        builder.HasIndex(x => x.ReporterId);
    }
}
