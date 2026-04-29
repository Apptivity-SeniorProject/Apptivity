using Apptivity.Domain.Enums;

namespace Apptivity.Application.Interfaces;

public sealed record UserContext(Guid UserId, UserRole Role);

public interface IUserContextAccessor
{
    UserContext? GetCurrentUser();
}
