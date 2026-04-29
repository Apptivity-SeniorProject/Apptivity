using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Auth;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IFirebaseOtpVerifier _firebaseOtpVerifier;
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        ITokenService tokenService,
        IPasswordHasher passwordHasher,
        IFirebaseOtpVerifier firebaseOtpVerifier,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _firebaseOtpVerifier = firebaseOtpVerifier;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<AuthResponse>> LoginWebAsync(WebLoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant(), cancellationToken);
        if (user is null || user.PasswordHash is null)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.InvalidCredential, "Invalid email or password.");
        }

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Result<AuthResponse>.Failure(ErrorCodes.InvalidCredential, "Invalid email or password.");
        }

        if (user.Role is UserRole.Individual)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.Unauthorized, "Individual users must login via mobile OTP.");
        }

        return await IssueTokenPairAsync(user, request.DeviceId, cancellationToken);
    }

    public async Task<Result<AuthResponse>> LoginMobileWithOtpAsync(MobileOtpLoginRequest request, CancellationToken cancellationToken)
    {
        var otpResult = await _firebaseOtpVerifier.VerifyAsync(request.FirebaseIdToken, cancellationToken);
        if (!otpResult.IsValid || string.IsNullOrWhiteSpace(otpResult.PhoneNumber))
        {
            return Result<AuthResponse>.Failure(ErrorCodes.InvalidOtp, otpResult.ErrorMessage ?? "OTP verification failed.");
        }

        var normalizedPhone = otpResult.PhoneNumber.Trim();
        var user = await _userRepository.GetByPhoneAsync(normalizedPhone, cancellationToken);
        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                PhoneNumber = normalizedPhone,
                DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? "New User" : request.DisplayName.Trim(),
                Role = UserRole.Individual,
                ReputationScore = 0
            };
            await _userRepository.AddAsync(user, cancellationToken);
        }

        return await IssueTokenPairAsync(user, request.DeviceId, cancellationToken);
    }

    public async Task<Result<AuthResponse>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var tokenHash = _tokenService.HashRefreshToken(request.RefreshToken);
        var existing = await _refreshTokenRepository.GetActiveByTokenHashAsync(tokenHash, cancellationToken);
        if (existing is null || !existing.IsActive)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.TokenExpired, "Refresh token is invalid or expired.");
        }

        if (!string.Equals(existing.DeviceId, request.DeviceId, StringComparison.Ordinal))
        {
            return Result<AuthResponse>.Failure(ErrorCodes.Unauthorized, "Token device mismatch.");
        }

        existing.RevokedUtc = DateTime.UtcNow;

        var user = existing.User;
        var pair = _tokenService.GenerateTokens(user.Id, user.Role.ToString(), request.DeviceId);

        var replacement = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = _tokenService.HashRefreshToken(pair.RefreshToken),
            DeviceId = request.DeviceId,
            ExpiresUtc = pair.RefreshTokenExpiresUtc
        };

        existing.ReplacedByTokenHash = replacement.TokenHash;
        await _refreshTokenRepository.AddAsync(replacement, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse>.Success(new AuthResponse(pair.AccessToken, pair.RefreshToken, pair.AccessTokenExpiresUtc, pair.RefreshTokenExpiresUtc));
    }

    public async Task<Result> LogoutAsync(LogoutRequest request, CancellationToken cancellationToken)
    {
        var tokenHash = _tokenService.HashRefreshToken(request.RefreshToken);
        var existing = await _refreshTokenRepository.GetActiveByTokenHashAsync(tokenHash, cancellationToken);
        if (existing is null)
        {
            return Result.Success();
        }

        existing.RevokedUtc = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private async Task<Result<AuthResponse>> IssueTokenPairAsync(User user, string deviceId, CancellationToken cancellationToken)
    {
        var pair = _tokenService.GenerateTokens(user.Id, user.Role.ToString(), deviceId);
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = _tokenService.HashRefreshToken(pair.RefreshToken),
            DeviceId = deviceId,
            ExpiresUtc = pair.RefreshTokenExpiresUtc
        };

        await _refreshTokenRepository.AddAsync(refreshToken, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse>.Success(new AuthResponse(pair.AccessToken, pair.RefreshToken, pair.AccessTokenExpiresUtc, pair.RefreshTokenExpiresUtc));
    }
}
