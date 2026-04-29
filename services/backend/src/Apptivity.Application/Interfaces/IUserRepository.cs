using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken);
    Task<User?> GetByPhoneAsync(string phoneNumber, CancellationToken cancellationToken);
    Task AddAsync(User user, CancellationToken cancellationToken);
}
