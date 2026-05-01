using Apptivity.Application.Contracts.Events;

namespace Apptivity.Api.Background;

public sealed class EventLifecycleWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EventLifecycleWorker> _logger;

    public EventLifecycleWorker(IServiceScopeFactory scopeFactory, ILogger<EventLifecycleWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var lifecycleService = scope.ServiceProvider.GetRequiredService<IEventLifecycleService>();
                await lifecycleService.ProcessTransitionsAndNotifyAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Event lifecycle worker iteration failed.");
            }

            await timer.WaitForNextTickAsync(stoppingToken);
        }
    }
}
