using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Devices;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/devices")]
[Authorize]
public sealed class DevicesController : ApiControllerBase
{
    private readonly IDeviceService _deviceService;
    private readonly IUserContextAccessor _userContextAccessor;

    public DevicesController(IDeviceService deviceService, IUserContextAccessor userContextAccessor)
    {
        _deviceService = deviceService;
        _userContextAccessor = userContextAccessor;
    }

    [HttpPost("tokens")]
    public async Task<IActionResult> RegisterToken([FromBody] RegisterDeviceTokenRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var result = await _deviceService.RegisterOrUpdateTokenAsync(request, context, cancellationToken);
        return FromResult(result);
    }
}
