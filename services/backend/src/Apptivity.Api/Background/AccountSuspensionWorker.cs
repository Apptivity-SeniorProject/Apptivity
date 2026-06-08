using Apptivity.Domain.Enums;
using Apptivity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Apptivity.Api.Background;

public sealed class AccountSuspensionWorker : BackgroundService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<AccountSuspensionWorker> _logger;

    public AccountSuspensionWorker(IServiceScopeFactory serviceScopeFactory, ILogger<AccountSuspensionWorker> logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ReleaseExpiredSuspensionsAsync(stoppingToken);
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to release expired account suspensions.");
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }

    private async Task ReleaseExpiredSuspensionsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var nowUtc = DateTime.UtcNow;

        var expiredAccounts = await dbContext.Accounts
            .Where(x =>
                x.Status == AccountStatus.Suspended &&
                x.SuspendedUntilUtc.HasValue &&
                x.SuspendedUntilUtc.Value <= nowUtc)
            .ToListAsync(cancellationToken);

        if (expiredAccounts.Count == 0)
        {
            return;
        }

        foreach (var account in expiredAccounts)
        {
            account.Status = AccountStatus.Active;
            account.IsActive = true;
            account.SuspendedUntilUtc = null;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
