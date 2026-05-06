using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
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
    private readonly INotificationRepository _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public FirebaseNotificationService(
        IDeviceTokenRepository deviceTokenRepository,
        IHttpClientFactory httpClientFactory,
        IOptions<FcmOptions> fcmOptions,
        ILogger<FirebaseNotificationService> logger,
        INotificationRepository notificationRepository,
        IUnitOfWork unitOfWork)
    {
        _deviceTokenRepository = deviceTokenRepository;
        _httpClientFactory = httpClientFactory;
        _fcmOptions = fcmOptions;
        _logger = logger;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
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

        var notifications = requests.Select(x => new Notification
        {
            Id = Guid.NewGuid(),
            AccountId = x.AccountId,
            Title = x.Title,
            Content = x.Body,
            IsRead = false,
            RelatedEntityId = TryResolveRelatedEntityId(x.Data)
        }).ToArray();

        await _notificationRepository.AddRangeAsync(notifications, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

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

    private static Guid? TryResolveRelatedEntityId(IReadOnlyDictionary<string, string>? data)
    {
        if (data is null)
        {
            return null;
        }

        if (data.TryGetValue("relatedEntityId", out var raw) && Guid.TryParse(raw, out var parsed))
        {
            return parsed;
        }

        if (data.TryGetValue("eventId", out raw) && Guid.TryParse(raw, out parsed))
        {
            return parsed;
        }

        return null;
    }
}
