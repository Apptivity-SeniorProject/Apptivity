using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Auth;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUserContextAccessor _userContextAccessor;

    public AuthController(IAuthService authService, IUserContextAccessor userContextAccessor)
    {
        _authService = authService;
        _userContextAccessor = userContextAccessor;
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
        var ipAddress = HttpContext.Request.Headers["CF-Connecting-IP"].FirstOrDefault() 
                        ?? HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim()
                        ?? HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

        var result = await _authService.RegisterIndividualAsync(request, ipAddress, userAgent, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("register-organization")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterOrganization([FromBody] RegisterOrganizationRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Request.Headers["CF-Connecting-IP"].FirstOrDefault() 
                        ?? HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim()
                        ?? HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

        var result = await _authService.RegisterOrganizationAsync(request, ipAddress, userAgent, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost("change-phone")]
    [Authorize]
    public async Task<IActionResult> ChangePhone([FromBody] ChangePhoneRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var result = await _authService.ChangePhoneAsync(request, context, cancellationToken);
        return FromResult(result);
    }
}
