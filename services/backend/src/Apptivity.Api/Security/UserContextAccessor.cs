using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;
using System.Security.Claims;

namespace Apptivity.Api.Security;

public sealed class UserContextAccessor : IUserContextAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserContextAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public UserContext? GetCurrentUser()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (user is null || user.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        var roleClaim = user.FindFirstValue(ClaimTypes.Role);

        if (!Guid.TryParse(sub, out var accountId) || string.IsNullOrWhiteSpace(roleClaim))
        {
            return null;
        }

        if (!Enum.TryParse<AccountType>(roleClaim, true, out var accountType))
        {
            return null;
        }

        return new UserContext(accountId, accountType);
    }
}
