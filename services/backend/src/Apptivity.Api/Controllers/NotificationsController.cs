using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Notifications;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController : ApiControllerBase
{
    private readonly INotificationHistoryService _notificationHistoryService;
    private readonly IUserContextAccessor _userContextAccessor;

    public NotificationsController(INotificationHistoryService notificationHistoryService, IUserContextAccessor userContextAccessor)
    {
        _notificationHistoryService = notificationHistoryService;
        _userContextAccessor = userContextAccessor;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyNotifications(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _notificationHistoryService.GetMyNotificationsAsync(context, pageNumber, pageSize, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _notificationHistoryService.MarkAsReadAsync(id, context, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _notificationHistoryService.MarkAllAsReadAsync(context, cancellationToken);
        return FromResult(result);
    }
}
