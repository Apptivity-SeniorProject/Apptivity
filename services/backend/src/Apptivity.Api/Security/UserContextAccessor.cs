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

        if (!Guid.TryParse(sub, out var userId) || string.IsNullOrWhiteSpace(roleClaim))
        {
            return null;
        }

        if (!Enum.TryParse<UserRole>(roleClaim, true, out var role))
        {
            return null;
        }

        return new UserContext(userId, role);
    }
}
