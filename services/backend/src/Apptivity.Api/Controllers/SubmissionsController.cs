using Apptivity.Api.Common;
using Apptivity.Application.Contracts.Submissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public sealed class SubmissionsController : ApiControllerBase
{
    private readonly ISubmissionService _submissionService;

    public SubmissionsController(ISubmissionService submissionService)
    {
        _submissionService = submissionService;
    }

    [HttpPost("events/{eventId:guid}/submissions")]
    [Authorize(Roles = "Individual")]
    public async Task<IActionResult> Create([FromRoute] Guid eventId, [FromBody] CreateSubmissionRequestBody request, CancellationToken cancellationToken)
    {
        var result = await _submissionService.CreateAsync(new CreateSubmissionRequest(eventId, request.Note), cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("submissions/{submissionId:guid}/status")]
    [Authorize(Roles = "Admin,Organization")]
    public async Task<IActionResult> ChangeStatus([FromRoute] Guid submissionId, [FromBody] ChangeSubmissionStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await _submissionService.ChangeStatusAsync(submissionId, request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("submissions/{submissionId:guid}/withdraw")]
    [Authorize(Roles = "Individual")]
    public async Task<IActionResult> Withdraw([FromRoute] Guid submissionId, CancellationToken cancellationToken)
    {
        var result = await _submissionService.WithdrawAsync(submissionId, cancellationToken);
        return FromResult(result);
    }

    public sealed record CreateSubmissionRequestBody(string? Note);
}
