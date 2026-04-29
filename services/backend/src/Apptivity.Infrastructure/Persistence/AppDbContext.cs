using Apptivity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Apptivity.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(builder =>
        {
            builder.ToTable("users");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Email).HasMaxLength(320);
            builder.Property(x => x.PhoneNumber).HasMaxLength(24);
            builder.Property(x => x.DisplayName).HasMaxLength(120).IsRequired();
            builder.Property(x => x.PasswordHash).HasMaxLength(512);
            builder.HasIndex(x => x.Email).IsUnique();
            builder.HasIndex(x => x.PhoneNumber).IsUnique();
        });

        modelBuilder.Entity<Event>(builder =>
        {
            builder.ToTable("events");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
            builder.Property(x => x.Description).HasMaxLength(4000).IsRequired();
            builder.Property(x => x.Location).HasMaxLength(200).IsRequired();
            builder.Property(x => x.BannerUrl).HasMaxLength(500);
            builder.HasOne(x => x.Organizer)
                .WithMany(x => x.OrganizedEvents)
                .HasForeignKey(x => x.OrganizerId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.HasIndex(x => new { x.Status, x.StartUtc });
        });

        modelBuilder.Entity<Submission>(builder =>
        {
            builder.ToTable("submissions");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Note).HasMaxLength(1000);
            builder.HasOne(x => x.Event)
                .WithMany(x => x.Submissions)
                .HasForeignKey(x => x.EventId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(x => x.Attendee)
                .WithMany(x => x.Submissions)
                .HasForeignKey(x => x.AttendeeId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.HasIndex(x => new { x.EventId, x.AttendeeId }).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(builder =>
        {
            builder.ToTable("refresh_tokens");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.TokenHash).HasMaxLength(256).IsRequired();
            builder.Property(x => x.DeviceId).HasMaxLength(200).IsRequired();
            builder.Property(x => x.ReplacedByTokenHash).HasMaxLength(256);
            builder.HasOne(x => x.User)
                .WithMany(x => x.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasIndex(x => x.TokenHash).IsUnique();
            builder.HasIndex(x => new { x.UserId, x.DeviceId });
        });

        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is not Domain.Common.AuditableEntity<Guid> auditable)
            {
                continue;
            }

            if (entry.State == EntityState.Added)
            {
                auditable.CreatedUtc = now;
            }

            if (entry.State is EntityState.Modified or EntityState.Added)
            {
                auditable.UpdatedUtc = now;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
