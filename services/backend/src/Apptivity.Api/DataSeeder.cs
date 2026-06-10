using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
using Apptivity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Apptivity.Api;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext dbContext, IPasswordHasher passwordHasher, IConfiguration configuration, IWebHostEnvironment environment)
    {
        // Seed admin user from environment
        var adminEmail = configuration["Admin:Email"];
        var adminPassword = configuration["Admin:Password"];

        if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
        {
            var adminAccount = await dbContext.Accounts.FirstOrDefaultAsync(a => a.Email == adminEmail);
            if (adminAccount is null)
            {
                var adminAccountId = Guid.NewGuid();
                adminAccount = new Account
                {
                    Id = adminAccountId,
                    Username = "system.admin",
                    Email = adminEmail,
                    Password = passwordHasher.Hash(adminPassword),
                    Phone = "+900000000000",
                    Type = AccountType.Admin,
                    Status = AccountStatus.Active,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var adminUser = new User
                {
                    Id = adminAccountId,
                    Name = "System",
                    Surname = "Admin",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var adminReputation = new Reputation
                {
                    Id = adminAccountId,
                    ReputationPoint = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await dbContext.Accounts.AddAsync(adminAccount);
                await dbContext.Users.AddAsync(adminUser);
                await dbContext.Reputations.AddAsync(adminReputation);
                
                await dbContext.SaveChangesAsync();
            }
            else
            {
                // Sync the password with configuration if it has changed
                if (string.IsNullOrEmpty(adminAccount.Password) || !passwordHasher.Verify(adminPassword, adminAccount.Password))
                {
                    adminAccount.Password = passwordHasher.Hash(adminPassword);
                    adminAccount.UpdatedAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync();
                }
            }
        }
    }
}
