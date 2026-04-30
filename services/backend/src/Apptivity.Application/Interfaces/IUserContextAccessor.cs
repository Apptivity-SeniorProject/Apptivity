using Apptivity.Domain.Enums;

namespace Apptivity.Application.Interfaces;

public sealed record UserContext(Guid AccountId, AccountType AccountType);

public interface IUserContextAccessor
{
    UserContext? GetCurrentUser();
}
