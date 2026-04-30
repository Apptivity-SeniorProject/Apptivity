using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IRefreshTokenRepository
{
    Task AddAsync(RefreshToken token, CancellationToken cancellationToken);
    Task<RefreshToken?> GetActiveByTokenAsync(string refreshToken, CancellationToken cancellationToken);
}
