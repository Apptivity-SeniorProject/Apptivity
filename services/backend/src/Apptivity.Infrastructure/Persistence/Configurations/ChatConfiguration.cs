using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class ChatConfiguration : IEntityTypeConfiguration<Chat>
{
    public void Configure(EntityTypeBuilder<Chat> builder)
    {
        builder.ToTable("chats");
        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Event)
            .WithMany(x => x.Chats)
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CreatedByAccount)
            .WithMany(x => x.CreatedChats)
            .HasForeignKey(x => x.CreatedByAccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
