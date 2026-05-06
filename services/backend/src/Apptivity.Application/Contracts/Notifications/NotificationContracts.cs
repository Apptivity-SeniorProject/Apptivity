using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;

namespace Apptivity.Application.Contracts.Notifications;

public sealed record NotificationDto(
    Guid Id,
    Guid AccountId,
    string Title,
    string Content,
    bool IsRead,
    DateTime CreatedAt,
    Guid? RelatedEntityId);

public sealed record MarkNotificationReadRequest(bool IsRead = true);

public interface INotificationHistoryService
{
    Task<Result<PagedResult<NotificationDto>>> GetMyNotificationsAsync(UserContext userContext, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Result<NotificationDto>> MarkAsReadAsync(Guid notificationId, UserContext userContext, CancellationToken cancellationToken);
    Task<Result> MarkAllAsReadAsync(UserContext userContext, CancellationToken cancellationToken);
}
