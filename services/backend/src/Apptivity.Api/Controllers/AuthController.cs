using Apptivity.Api.Common;
using Apptivity.Application.Contracts.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("send-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.SendOtpAsync(request.PhoneNumber, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("verify-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyOtp([FromBody] OtpVerifyRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.VerifyOtpAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("register-individual")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterIndividual([FromBody] RegisterIndividualRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterIndividualAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("register-organization")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterOrganization([FromBody] RegisterOrganizationRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterOrganizationAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshAsync(request, cancellationToken);
        return FromResult(result);
    }
}
