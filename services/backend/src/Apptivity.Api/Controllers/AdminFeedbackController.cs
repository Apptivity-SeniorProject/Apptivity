using Apptivity.Api.Common;
using Apptivity.Api.Security;
using Apptivity.Application.Contracts.Feedback;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/admin/feedback")]
[AdminAuthorize]
public sealed class AdminFeedbackController : ApiControllerBase
{
    private readonly IFeedbackService _feedbackService;

    public AdminFeedbackController(IFeedbackService feedbackService)
    {
        _feedbackService = feedbackService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _feedbackService.GetPagedAsync(pageNumber, pageSize, cancellationToken);
        return FromResult(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _feedbackService.DeleteAsync(id, cancellationToken);
        return FromResult(result);
    }
}
