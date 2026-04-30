using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("messages");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Content).HasMaxLength(4000).IsRequired();

        builder.HasOne(x => x.Chat)
            .WithMany(x => x.Messages)
            .HasForeignKey(x => x.ChatId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.SenderAccount)
            .WithMany(x => x.SentMessages)
            .HasForeignKey(x => x.SenderAccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
