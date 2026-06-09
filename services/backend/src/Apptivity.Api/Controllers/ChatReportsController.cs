using Apptivity.Api.Common;
using Apptivity.Api.Security;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.ChatReports;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/chat-reports")]
[Authorize]
public class ChatReportsController : ApiControllerBase
{
    private readonly IChatReportService _chatReportService;
    private readonly IUserContextAccessor _userContextAccessor;

    public ChatReportsController(IChatReportService chatReportService, IUserContextAccessor userContextAccessor)
    {
        _chatReportService = chatReportService;
        _userContextAccessor = userContextAccessor;
    }

    [HttpPost]
    public async Task<IActionResult> CreateChatReport([FromBody] CreateChatReportRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[] { new ErrorDetail("AUTH_401", "Unauthorized.") }, HttpContext.TraceIdentifier));
        }

        var result = await _chatReportService.CreateChatReportAsync(request, context, cancellationToken);
        return FromResult(result);
    }
}
