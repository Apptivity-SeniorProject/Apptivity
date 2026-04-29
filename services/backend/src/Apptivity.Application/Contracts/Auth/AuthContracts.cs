using Apptivity.Application.Common.Models;

namespace Apptivity.Application.Contracts.Auth;

public sealed record WebLoginRequest(string Email, string Password, string DeviceId);
public sealed record MobileOtpLoginRequest(string FirebaseIdToken, string DeviceId, string? DisplayName);
public sealed record RefreshTokenRequest(string RefreshToken, string DeviceId);
public sealed record LogoutRequest(string RefreshToken);
public sealed record AuthResponse(string AccessToken, string RefreshToken, DateTime AccessTokenExpiresUtc, DateTime RefreshTokenExpiresUtc);

public interface IAuthService
{
    Task<Result<AuthResponse>> LoginWebAsync(WebLoginRequest request, CancellationToken cancellationToken);
    Task<Result<AuthResponse>> LoginMobileWithOtpAsync(MobileOtpLoginRequest request, CancellationToken cancellationToken);
    Task<Result<AuthResponse>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken);
    Task<Result> LogoutAsync(LogoutRequest request, CancellationToken cancellationToken);
}
