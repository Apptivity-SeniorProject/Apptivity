using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IUserRepository
{
    Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken);
    Task<Account?> GetAccountByEmailAsync(string email, CancellationToken cancellationToken);
    Task<Account?> GetAccountByPhoneAsync(string phone, CancellationToken cancellationToken);
    Task<Account?> GetAccountByUsernameAsync(string username, CancellationToken cancellationToken);

    Task AddAccountAsync(Account account, CancellationToken cancellationToken);
    Task AddUserProfileAsync(User user, CancellationToken cancellationToken);
    Task AddClubProfileAsync(Club club, CancellationToken cancellationToken);
}
