using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apptivity.Infrastructure.Persistence.Configurations;

public sealed class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.ToTable("tags");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(400);

        builder.HasIndex(x => x.Name).IsUnique();

        var seedTime = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        builder.HasData(
            new Tag { Id = Guid.Parse("96A9F6B2-40D7-4E15-9F8E-CB7596ED59F1"), Name = "Spor", CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false },
            new Tag { Id = Guid.Parse("40FD6D4C-0F95-49D5-BB6A-7A6419D15231"), Name = "Teknoloji", CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false },
            new Tag { Id = Guid.Parse("8BA4EFA4-9F4A-4A56-8646-644A8E3F079D"), Name = "Müzik", CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false }
        );
    }
}
