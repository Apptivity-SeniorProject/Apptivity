using Apptivity.Application.Contracts.Events;

namespace Apptivity.Api.Background;

/// <summary>
/// Background service that periodically checks for completed events whose
/// voting window has expired (VotingClosesAt &lt;= utcNow) and automatically
/// closes them, triggering the reputation/rating calculation pipeline.
///
/// Runs every 5 minutes. Events are processed in individual transactions so
/// a failure on one event does not block the others.
/// </summary>
public sealed class VotingCloseWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<VotingCloseWorker> _logger;

    public VotingCloseWorker(IServiceScopeFactory scopeFactory, ILogger<VotingCloseWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var lifecycleService = scope.ServiceProvider.GetRequiredService<IEventLifecycleService>();
                await lifecycleService.CloseExpiredVotingsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Voting close worker iteration failed.");
            }

            await timer.WaitForNextTickAsync(stoppingToken);
        }
    }
}
