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
        builder.Property(x => x.IconName).HasMaxLength(100);
        builder.Property(x => x.ColorCode).HasMaxLength(20);
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.HasIndex(x => x.Name).IsUnique();

        var seedTime = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        builder.HasData(
            new Tag { Id = Guid.Parse("96A9F6B2-40D7-4E15-9F8E-CB7596ED59F1"), Name = "Sports",     IconName = "football",   ColorCode = "#10B981", IsActive = true, CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false },
            new Tag { Id = Guid.Parse("40FD6D4C-0F95-49D5-BB6A-7A6419D15231"), Name = "Technology", IconName = "cpu",        ColorCode = "#3B82F6", IsActive = true, CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false },
            new Tag { Id = Guid.Parse("8BA4EFA4-9F4A-4A56-8646-644A8E3F079D"), Name = "Music",      IconName = "music-note", ColorCode = "#EC4899", IsActive = true, CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false },
            new Tag { Id = Guid.Parse("2F1769F1-0C31-4915-B9CC-D0CF79D5A5F3"), Name = "Art",        IconName = "palette",    ColorCode = "#F59E0B", IsActive = true, CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false },
            new Tag { Id = Guid.Parse("D4E42A0D-6A4D-4D35-84D1-86E4B7E7E122"), Name = "Education",  IconName = "book-open",  ColorCode = "#0EA5E9", IsActive = true, CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false },
            new Tag { Id = Guid.Parse("65558F2C-8D3E-4E47-88B5-C2A87D5A0A7F"), Name = "Gaming",     IconName = "gamepad-2",  ColorCode = "#8B5CF6", IsActive = true, CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false },
            new Tag { Id = Guid.Parse("29B5F84D-6E7F-4D71-88C8-E0C91E84AE7B"), Name = "Health",     IconName = "heart-pulse", ColorCode = "#EF4444", IsActive = true, CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false },
            new Tag { Id = Guid.Parse("91B95171-08EB-4C09-A511-61EF9E6A2D5D"), Name = "Business",   IconName = "briefcase",  ColorCode = "#14B8A6", IsActive = true, CreatedAt = seedTime, UpdatedAt = seedTime, IsDeleted = false }
        );
    }
}
