using Apptivity.Application.Interfaces;
using Apptivity.Infrastructure.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http;
using System.Net.Http.Json;

namespace Apptivity.Infrastructure.External;

public sealed class FirebaseNotificationService : INotificationService
{
    private readonly IDeviceTokenRepository _deviceTokenRepository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<FcmOptions> _fcmOptions;
    private readonly ILogger<FirebaseNotificationService> _logger;

    public FirebaseNotificationService(
        IDeviceTokenRepository deviceTokenRepository,
        IHttpClientFactory httpClientFactory,
        IOptions<FcmOptions> fcmOptions,
        ILogger<FirebaseNotificationService> logger)
    {
        _deviceTokenRepository = deviceTokenRepository;
        _httpClientFactory = httpClientFactory;
        _fcmOptions = fcmOptions;
        _logger = logger;
    }

    public async Task SendToAccountAsync(PushNotificationRequest request, CancellationToken cancellationToken)
    {
        await SendToAccountsAsync(new[] { request }, cancellationToken);
    }

    public async Task SendToAccountsAsync(IReadOnlyCollection<PushNotificationRequest> requests, CancellationToken cancellationToken)
    {
        if (requests.Count == 0)
        {
            return;
        }

        var options = _fcmOptions.Value;
        if (!options.Enabled)
        {
            _logger.LogInformation("FCM notifications are disabled. Skipping push send.");
            return;
        }

        if (string.IsNullOrWhiteSpace(options.ServerKey))
        {
            _logger.LogWarning("FCM ServerKey is missing. Skipping push notifications.");
            return;
        }

        var accountIds = requests.Select(x => x.AccountId).Distinct().ToArray();
        var tokens = await _deviceTokenRepository.GetByAccountIdsAsync(accountIds, cancellationToken);

        var tokenMap = tokens
            .GroupBy(x => x.AccountId)
            .ToDictionary(g => g.Key, g => g.Select(t => t.FcmToken).Distinct().ToArray());

        var httpClient = _httpClientFactory.CreateClient(nameof(FirebaseNotificationService));
        httpClient.DefaultRequestHeaders.Remove("Authorization");
        httpClient.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"key={options.ServerKey}");

        foreach (var request in requests)
        {
            if (!tokenMap.TryGetValue(request.AccountId, out var fcmTokens) || fcmTokens.Length == 0)
            {
                continue;
            }

            foreach (var fcmToken in fcmTokens)
            {
                var payload = new
                {
                    to = fcmToken,
                    notification = new
                    {
                        title = request.Title,
                        body = request.Body
                    },
                    data = request.Data ?? new Dictionary<string, string>()
                };

                using var response = await httpClient.PostAsJsonAsync(options.Endpoint, payload, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogWarning(
                        "FCM push failed. AccountId: {AccountId}, StatusCode: {StatusCode}, Response: {Response}",
                        request.AccountId,
                        response.StatusCode,
                        responseText);
                }
            }
        }
    }
}
