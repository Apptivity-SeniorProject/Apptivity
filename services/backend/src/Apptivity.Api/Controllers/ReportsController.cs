using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Reports;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public sealed class ReportsController : ApiControllerBase
{
    private readonly IReportService _reportService;
    private readonly IUserContextAccessor _userContextAccessor;

    public ReportsController(IReportService reportService, IUserContextAccessor userContextAccessor)
    {
        _reportService = reportService;
        _userContextAccessor = userContextAccessor;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReportRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _reportService.CreateAsync(request, context, cancellationToken);
        return FromResult(result);
    }
}
