using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/profile")]
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
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }));
        }

        var account = await _userRepository.GetAccountByIdAsync(context.AccountId, cancellationToken);
        if (account is null)
        {
            return NotFound(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_404", "Account not found.")
            }));
        }

        var payload = new
        {
            account.Id,
            account.Type,
            account.Username,
            account.Phone,
            account.Email,
            account.ProfilePhoto,
            account.SocialLinks,
            user = account.UserProfile is null ? null : new
            {
                account.UserProfile.Name,
                account.UserProfile.Surname,
                account.UserProfile.Birthdate,
                account.UserProfile.Gender,
                account.UserProfile.Bio,
                account.UserProfile.IsVerified,
                reputationScore = account.UserProfile.Reputation?.ReputationPoint ?? 0.0,
                votePoint = account.UserProfile.Reputation?.VotePoint ?? 0.5
            },
            club = account.ClubProfile is null ? null : new
            {
                account.ClubProfile.Name,
                account.ClubProfile.LocationCity,
                account.ClubProfile.Description,
                account.ClubProfile.Latitude,
                account.ClubProfile.Longitude,
                rating = account.ClubProfile.ClubRating?.Rating ?? 0.0,
                ratedCount = account.ClubProfile.ClubRating?.RatedCount ?? 0
            }
        };

        return Ok(ApiEnvelope<object>.Success(payload));
    }
}
