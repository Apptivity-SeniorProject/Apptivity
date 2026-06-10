using Apptivity.Api.Common;
using Apptivity.Application.Contracts.Feedback;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/feedback")]
public sealed class FeedbackController : ApiControllerBase
{
    private readonly IFeedbackService _feedbackService;

    public FeedbackController(IFeedbackService feedbackService)
    {
        _feedbackService = feedbackService;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Submit([FromBody] SubmitFeedbackRequest request, CancellationToken cancellationToken)
    {
        var result = await _feedbackService.SubmitAsync(request, cancellationToken);
        return FromResult(result);
    }
}
