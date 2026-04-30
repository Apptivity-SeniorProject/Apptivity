namespace Apptivity.Application.Interfaces;

public sealed record TokenPair(string AccessToken, string RefreshToken, DateTime AccessTokenExpiresUtc, DateTime RefreshTokenExpiresUtc);

public interface ITokenService
{
    TokenPair GenerateTokens(Guid accountId, string role, string deviceId);
    string HashRefreshToken(string refreshToken);
}
