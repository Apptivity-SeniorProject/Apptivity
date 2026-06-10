using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Notifications;
using Apptivity.Application.Interfaces;

namespace Apptivity.Application.Services;

public sealed class NotificationHistoryService : INotificationHistoryService
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public NotificationHistoryService(INotificationRepository notificationRepository, IUnitOfWork unitOfWork)
    {
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<PagedResult<NotificationDto>>> GetMyNotificationsAsync(UserContext userContext, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var deletedNotificationCount = await _notificationRepository
            .SoftDeleteDeletedEventNotificationsByAccountIdAsync(userContext.AccountId, cancellationToken);
        if (deletedNotificationCount > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var paging = new PagedRequest
        {
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        paging.Normalize();

        var (items, totalCount) = await _notificationRepository.GetByAccountIdAsync(userContext.AccountId, paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items
            .Select(x => new NotificationDto(
                x.Id,
                x.AccountId,
                x.Title,
                x.Content,
                x.IsRead,
                x.CreatedAt,
                x.RelatedEntityId))
            .ToArray();

        return Result<PagedResult<NotificationDto>>.Success(new PagedResult<NotificationDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    public async Task<Result<NotificationDto>> MarkAsReadAsync(Guid notificationId, UserContext userContext, CancellationToken cancellationToken)
    {
        var notification = await _notificationRepository.GetByIdAsync(notificationId, cancellationToken);
        if (notification is null || notification.AccountId != userContext.AccountId)
        {
            return Result<NotificationDto>.Failure(ErrorCodes.NotificationNotFound, "Notification not found.");
        }

        notification.IsRead = true;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<NotificationDto>.Success(new NotificationDto(
            notification.Id,
            notification.AccountId,
            notification.Title,
            notification.Content,
            notification.IsRead,
            notification.CreatedAt,
            notification.RelatedEntityId));
    }

    public async Task<Result> MarkAllAsReadAsync(UserContext userContext, CancellationToken cancellationToken)
    {
        var unreadNotifications = await _notificationRepository.GetUnreadByAccountIdAsync(userContext.AccountId, cancellationToken);
        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
