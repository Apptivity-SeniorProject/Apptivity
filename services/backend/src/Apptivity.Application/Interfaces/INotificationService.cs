namespace Apptivity.Application.Interfaces;

public sealed record PushNotificationRequest(
    Guid AccountId,
    string Title,
    string Body,
    IReadOnlyDictionary<string, string>? Data = null);

public interface INotificationService
{
    Task SendToAccountAsync(PushNotificationRequest request, CancellationToken cancellationToken);
    Task SendToAccountsAsync(IReadOnlyCollection<PushNotificationRequest> requests, CancellationToken cancellationToken);
}
