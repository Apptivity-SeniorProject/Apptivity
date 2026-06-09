using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class ChatReportConfiguration : IEntityTypeConfiguration<ChatReport>
{
    public void Configure(EntityTypeBuilder<ChatReport> builder)
    {
        builder.ToTable("chat_reports");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ReasonCategory).HasConversion<int>().IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();

        builder.HasOne(x => x.Reporter)
            .WithMany(x => x.FiledChatReports)
            .HasForeignKey(x => x.ReporterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Event)
            .WithMany() // Assuming Event doesn't need a collection of ChatReports to keep it clean
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Messages)
            .WithOne(x => x.ChatReport)
            .HasForeignKey(x => x.ChatReportId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.EventId);
        builder.HasIndex(x => x.ReporterId);
    }
}
