using Apptivity.Api.Common;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/v1/profile")]
[Authorize]
public sealed class ProfileController : ApiControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IUserContextAccessor _userContextAccessor;

    public ProfileController(IUserRepository userRepository, IUserContextAccessor userContextAccessor)
    {
        _userRepository = userRepository;
        _userContextAccessor = userContextAccessor;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new Apptivity.Application.Common.Models.ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var user = await _userRepository.GetByIdAsync(context.UserId, cancellationToken);
        if (user is null)
        {
            return NotFound(ApiEnvelope<object?>.Failure(new[]
            {
                new Apptivity.Application.Common.Models.ErrorDetail("USER_404", "User not found.")
            }));
        }

        var payload = new
        {
            user.Id,
            user.DisplayName,
            user.Email,
            user.PhoneNumber,
            Role = user.Role.ToString(),
            user.ReputationScore
        };

        return Ok(ApiEnvelope<object>.Success(payload));
    }
}
