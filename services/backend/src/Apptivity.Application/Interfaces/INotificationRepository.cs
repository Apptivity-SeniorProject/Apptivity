using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface INotificationRepository
{
    Task<(IReadOnlyCollection<Notification> Items, int TotalCount)> GetByAccountIdAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Notification?> GetByIdAsync(Guid notificationId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Notification>> GetUnreadByAccountIdAsync(Guid accountId, CancellationToken cancellationToken);
    Task<bool> HasUnreadChatNotificationAsync(Guid accountId, Guid eventId, CancellationToken cancellationToken);
    Task AddRangeAsync(IReadOnlyCollection<Notification> notifications, CancellationToken cancellationToken);
}
