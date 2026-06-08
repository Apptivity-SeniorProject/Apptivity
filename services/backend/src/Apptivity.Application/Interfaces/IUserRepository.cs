using Apptivity.Domain.Enums;
using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public sealed record ProfileSearchFilter(
    string? Query,
    AccountType? AccountType,
    string? City);

public interface IUserRepository
{
    Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken);
    Task<Account?> GetAccountByIdWithProfilesAsync(Guid accountId, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Account> Items, int TotalCount)> SearchProfilesAsync(ProfileSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Account?> GetAccountByEmailAsync(string email, CancellationToken cancellationToken);
    Task<Account?> GetAccountByPhoneAsync(string phone, CancellationToken cancellationToken);
    Task<Account?> GetAccountByUsernameAsync(string username, CancellationToken cancellationToken);
    Task<Account?> GetAccountByIdWithInterestsAsync(Guid accountId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Account>> GetExpiredSuspendedAccountsAsync(DateTime nowUtc, CancellationToken cancellationToken);

    Task AddAccountAsync(Account account, CancellationToken cancellationToken);
    Task AddUserProfileAsync(User user, CancellationToken cancellationToken);
    Task AddClubProfileAsync(Club club, CancellationToken cancellationToken);
}
