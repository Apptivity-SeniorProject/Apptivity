using Apptivity.Api.Common;
using Apptivity.Api.Security;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Admin;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/admin")]
[AdminAuthorize]
public sealed class AdminController : ApiControllerBase
{
    private readonly IAdminService _adminService;
    private readonly IUserContextAccessor _userContextAccessor;

    public AdminController(IAdminService adminService, IUserContextAccessor userContextAccessor)
    {
        _adminService = adminService;
        _userContextAccessor = userContextAccessor;
    }

    [HttpGet("dashboard/stats")]
    public async Task<IActionResult> GetDashboardStats(CancellationToken cancellationToken)
    {
        var result = await _adminService.GetDashboardStatsAsync(cancellationToken);
        return FromResult(result);
    }

    [HttpGet("accounts")]
    public async Task<IActionResult> GetAccounts(
        [FromQuery] bool? isActive,
        [FromQuery] AccountStatus? status,
        [FromQuery] AccountType? type,
        [FromQuery] int? minReportCount,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var request = new AdminAccountsFilterRequest(isActive, status, type, minReportCount, pageNumber, pageSize);
        var result = await _adminService.GetAccountsAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("accounts/{id:guid}/status")]
    public async Task<IActionResult> UpdateAccountStatus(Guid id, [FromBody] UpdateAccountStatusRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return UnauthorizedResponse();
        }

        var result = await _adminService.UpdateAccountStatusAsync(id, request, context, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("clubs/{id:guid}/verify")]
    public async Task<IActionResult> VerifyClub(Guid id, [FromBody] VerifyClubRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return UnauthorizedResponse();
        }

        var result = await _adminService.VerifyClubAsync(id, request, context, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("events")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEvents(
        [FromQuery] EventStatus? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var request = new AdminEventsFilterRequest(status, pageNumber, pageSize);
        var result = await _adminService.GetEventsAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports(
        [FromQuery] ReportStatus? status,
        [FromQuery] string? organizationQuery,
        [FromQuery] string? userQuery,
        [FromQuery] string? eventQuery,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var request = new ReportsFilterRequest(status, organizationQuery, userQuery, eventQuery, pageNumber, pageSize);
        var result = await _adminService.GetReportsAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpDelete("events/{id:guid}")]
    public async Task<IActionResult> DeleteEvent(Guid id, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return UnauthorizedResponse();
        }

        var result = await _adminService.DeleteEventAsync(id, context, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("events/{id:guid}/featured")]
    public async Task<IActionResult> ToggleEventFeatured(Guid id, [FromBody] ToggleEventFeaturedRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return UnauthorizedResponse();
        }

        var result = await _adminService.ToggleFeaturedAsync(id, request, context, cancellationToken);
        return FromResult(result);
    }

    private IActionResult UnauthorizedResponse()
    {
        return Unauthorized(ApiEnvelope<object?>.Failure(new[]
        {
            new ErrorDetail("AUTH_401", "Unauthorized.")
        }, HttpContext.TraceIdentifier));
    }
}
