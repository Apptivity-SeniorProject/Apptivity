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

        builder.Property(x => x.Reason).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.IsResolved).HasDefaultValue(false);

        builder.HasOne(x => x.ReporterAccount)
            .WithMany(x => x.FiledReports)
            .HasForeignKey(x => x.ReporterAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.TargetAccount)
            .WithMany(x => x.ReceivedReports)
            .HasForeignKey(x => x.TargetAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.TargetEvent)
            .WithMany(x => x.Reports)
            .HasForeignKey(x => x.TargetEventId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ResolvedByAccount)
            .WithMany(x => x.ReviewedReports)
            .HasForeignKey(x => x.ResolvedByAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.IsResolved);
        builder.HasIndex(x => x.TargetAccountId);
        builder.HasIndex(x => x.TargetEventId);
    }
}
