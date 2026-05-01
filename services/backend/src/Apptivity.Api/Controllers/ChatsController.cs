using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Chats;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/chats")]
[Authorize]
public sealed class ChatsController : ApiControllerBase
{
    private readonly IChatService _chatService;
    private readonly IUserContextAccessor _userContextAccessor;

    public ChatsController(IChatService chatService, IUserContextAccessor userContextAccessor)
    {
        _chatService = chatService;
        _userContextAccessor = userContextAccessor;
    }

    [HttpGet("{eventId:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid eventId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var result = await _chatService.GetMessagesAsync(eventId, pageNumber, pageSize, context, cancellationToken);
        return FromResult(result);
    }
}
