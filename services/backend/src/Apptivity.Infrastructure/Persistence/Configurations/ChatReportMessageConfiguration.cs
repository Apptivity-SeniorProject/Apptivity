using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class ChatReportMessageConfiguration : IEntityTypeConfiguration<ChatReportMessage>
{
    public void Configure(EntityTypeBuilder<ChatReportMessage> builder)
    {
        builder.ToTable("chat_report_messages");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.SenderDisplayName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Content).HasMaxLength(2000).IsRequired();

        builder.HasIndex(x => x.ChatReportId);
    }
}
