using Apptivity.Api.Common;
using Apptivity.Application.Contracts.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("web/login")]
    [AllowAnonymous]
    public async Task<IActionResult> WebLogin([FromBody] WebLoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginWebAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("mobile/verify-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> MobileLogin([FromBody] MobileOtpLoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginMobileWithOtpAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.LogoutAsync(request, cancellationToken);
        return FromResult(result);
    }
}
