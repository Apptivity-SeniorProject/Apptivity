using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Auth;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
using System.Security.Cryptography;

namespace Apptivity.Application.Services;

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IOtpVerificationRepository _otpVerificationRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IReputationRepository _reputationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(
        IUserRepository userRepository,
        IOtpVerificationRepository otpVerificationRepository,
        IRefreshTokenRepository refreshTokenRepository,
        ITokenService tokenService,
        IPasswordHasher passwordHasher,
        IReputationRepository reputationRepository,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _otpVerificationRepository = otpVerificationRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _reputationRepository = reputationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> SendOtpAsync(string phoneNumber, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return Result.Failure(ErrorCodes.Validation, "Phone number is required.");
        }

        var normalizedPhone = NormalizePhone(phoneNumber);
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

        var otp = new OtpVerification
        {
            Id = Guid.NewGuid(),
            PhoneNumber = normalizedPhone,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            IsUsed = false
        };

        await _otpVerificationRepository.AddAsync(otp, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        Console.WriteLine($"[OTP-SIMULATION] {normalizedPhone} => {code}");

        return Result.Success();
    }

    public async Task<Result<AuthResponse>> VerifyOtpAsync(OtpVerifyRequest request, CancellationToken cancellationToken)
    {
        var normalizedPhone = NormalizePhone(request.PhoneNumber);
        var validOtp = await _otpVerificationRepository.GetValidAsync(normalizedPhone, request.Code, cancellationToken);
        if (validOtp is null || validOtp.ExpiresAt <= DateTime.UtcNow || validOtp.IsUsed)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.InvalidOtp, "OTP is invalid or expired.");
        }

        validOtp.IsUsed = true;

        var account = await _userRepository.GetAccountByPhoneAsync(normalizedPhone, cancellationToken);
        if (account is null)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.AccountNotFound, "Account not found for this phone number.");
        }

        await NormalizeSuspendedAccountIfExpiredAsync(account, cancellationToken);

        if (account.Status != AccountStatus.Active || !account.IsActive)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.Unauthorized, "This account is suspended.");
        }

        var authResponse = await IssueTokenPairAsync(account, request.DeviceId, cancellationToken);
        if (!authResponse.IsSuccess)
        {
            return authResponse;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return authResponse;
    }

    public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Result<AuthResponse>.Failure(ErrorCodes.Validation, "Identifier and password are required.");
        }

        var normalizedIdentifier = request.Identifier.Trim().ToLowerInvariant();
        Account? account = null;

        if (normalizedIdentifier.Contains('@', StringComparison.Ordinal))
        {
            account = await _userRepository.GetAccountByEmailAsync(normalizedIdentifier, cancellationToken);
        }

        account ??= await _userRepository.GetAccountByUsernameAsync(normalizedIdentifier, cancellationToken);
        account ??= await _userRepository.GetAccountByPhoneAsync(NormalizePhone(request.Identifier), cancellationToken);

        if (account is null || string.IsNullOrWhiteSpace(account.Password))
        {
            return Result<AuthResponse>.Failure(ErrorCodes.InvalidCredential, "Invalid identifier or password.");
        }

        await NormalizeSuspendedAccountIfExpiredAsync(account, cancellationToken);

        if (!_passwordHasher.Verify(request.Password, account.Password))
        {
            return Result<AuthResponse>.Failure(ErrorCodes.InvalidCredential, "Invalid identifier or password.");
        }

        if (account.Status != AccountStatus.Active || !account.IsActive)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.Unauthorized, "This account is suspended.");
        }

        return await IssueTokenPairAsync(account, request.DeviceId, cancellationToken);
    }

    public async Task<Result<AuthResponse>> RegisterIndividualAsync(RegisterIndividualRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Result<AuthResponse>.Failure(ErrorCodes.Validation, "Username, phone, and password are required.");
        }

        var normalizedUsername = request.Username.Trim().ToLowerInvariant();
        var normalizedPhone = NormalizePhone(request.Phone);
        var normalizedEmail = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();

        var existingByUsername = await _userRepository.GetAccountByUsernameAsync(normalizedUsername, cancellationToken);
        if (existingByUsername is not null)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.AccountAlreadyExists, "Username already exists.");
        }

        var existingByPhone = await _userRepository.GetAccountByPhoneAsync(normalizedPhone, cancellationToken);
        if (existingByPhone is not null)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.AccountAlreadyExists, "Phone number already exists.");
        }

        if (!string.IsNullOrWhiteSpace(normalizedEmail))
        {
            var existingByEmail = await _userRepository.GetAccountByEmailAsync(normalizedEmail, cancellationToken);
            if (existingByEmail is not null)
            {
                return Result<AuthResponse>.Failure(ErrorCodes.AccountAlreadyExists, "Email already exists.");
            }
        }

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Type = AccountType.Individual,
            Username = normalizedUsername,
            Phone = normalizedPhone,
            Email = normalizedEmail,
            Password = _passwordHasher.Hash(request.Password),
            Status = AccountStatus.Active,
            IsActive = true,
            IsDeleted = false
        };

        var user = new User
        {
            Id = account.Id,
            Account = account,
            Name = request.Name.Trim(),
            Surname = request.Surname.Trim(),
            Birthdate = request.Birthdate,
            Gender = request.Gender,
            Bio = request.Bio,
            IsVerified = false,
            IsDeleted = false
        };

        var reputation = new Reputation
        {
            Id = account.Id,
            ReputationPoint = 0
        };

        await _userRepository.AddAccountAsync(account, cancellationToken);
        await _userRepository.AddUserProfileAsync(user, cancellationToken);
        await _reputationRepository.AddReputationAsync(reputation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await IssueTokenPairAsync(account, request.DeviceId, cancellationToken);
    }

    public async Task<Result<AuthResponse>> RegisterOrganizationAsync(RegisterOrganizationRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.Name))
        {
            return Result<AuthResponse>.Failure(ErrorCodes.Validation, "Username, phone, password, and organization name are required.");
        }

        var normalizedUsername = request.Username.Trim().ToLowerInvariant();
        var normalizedPhone = NormalizePhone(request.Phone);
        var normalizedEmail = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();

        var existingByUsername = await _userRepository.GetAccountByUsernameAsync(normalizedUsername, cancellationToken);
        if (existingByUsername is not null)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.AccountAlreadyExists, "Username already exists.");
        }

        var existingByPhone = await _userRepository.GetAccountByPhoneAsync(normalizedPhone, cancellationToken);
        if (existingByPhone is not null)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.AccountAlreadyExists, "Phone number already exists.");
        }

        if (!string.IsNullOrWhiteSpace(normalizedEmail))
        {
            var existingByEmail = await _userRepository.GetAccountByEmailAsync(normalizedEmail, cancellationToken);
            if (existingByEmail is not null)
            {
                return Result<AuthResponse>.Failure(ErrorCodes.AccountAlreadyExists, "Email already exists.");
            }
        }

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Type = AccountType.Organization,
            Username = normalizedUsername,
            Phone = normalizedPhone,
            Email = normalizedEmail,
            Password = _passwordHasher.Hash(request.Password),
            Status = AccountStatus.Active,
            IsActive = true,
            IsDeleted = false
        };

        var club = new Club
        {
            Id = account.Id,
            Account = account,
            Name = request.Name.Trim(),
            LocationCity = request.LocationCity.Trim(),
            Description = request.Description,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            IsVerified = true,
            IsDeleted = false
        };

        var clubRating = new ClubRating
        {
            Id = account.Id,
            Rating = 0,
            RatedCount = 0
        };

        await _userRepository.AddAccountAsync(account, cancellationToken);
        await _userRepository.AddClubProfileAsync(club, cancellationToken);
        await _reputationRepository.AddClubRatingAsync(clubRating, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await IssueTokenPairAsync(account, request.DeviceId, cancellationToken);
    }

    public async Task<Result<AuthResponse>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var existing = await _refreshTokenRepository.GetActiveByTokenAsync(request.RefreshToken, cancellationToken);
        if (existing is null || existing.ExpiresAt <= DateTime.UtcNow || existing.RevokedAt is not null)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.TokenExpired, "Refresh token is invalid or expired.");
        }

        existing.RevokedAt = DateTime.UtcNow;

        var account = existing.Account;
        await NormalizeSuspendedAccountIfExpiredAsync(account, cancellationToken);

        if (account.Status != AccountStatus.Active || !account.IsActive)
        {
            return Result<AuthResponse>.Failure(ErrorCodes.Unauthorized, "This account is suspended.");
        }

        return await IssueTokenPairAsync(account, request.DeviceId, cancellationToken);
    }

    public async Task<Result> ChangePhoneAsync(ChangePhoneRequest request, UserContext userContext, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.NewPhoneNumber))
        {
            return Result.Failure(ErrorCodes.Validation, "New phone number is required.");
        }

        var account = await _userRepository.GetAccountByIdAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return Result.Failure(ErrorCodes.AccountNotFound, "Account not found.");
        }

        await NormalizeSuspendedAccountIfExpiredAsync(account, cancellationToken);

        if (account.Status != AccountStatus.Active || !account.IsActive)
        {
            return Result.Failure(ErrorCodes.Unauthorized, "This account is suspended.");
        }

        var normalizedPhone = NormalizePhone(request.NewPhoneNumber);
        if (normalizedPhone == account.Phone)
        {
            return Result.Failure(ErrorCodes.Validation, "New phone number must be different from current phone number.");
        }

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            var otp = new OtpVerification
            {
                Id = Guid.NewGuid(),
                PhoneNumber = normalizedPhone,
                Code = code,
                ExpiresAt = DateTime.UtcNow.AddMinutes(5),
                IsUsed = false
            };

            await _otpVerificationRepository.AddAsync(otp, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            Console.WriteLine($"[PHONE-CHANGE-OTP] {normalizedPhone} => {code}");
            return Result.Success();
        }

        var validOtp = await _otpVerificationRepository.GetValidAsync(normalizedPhone, request.Code.Trim(), cancellationToken);
        if (validOtp is null || validOtp.ExpiresAt <= DateTime.UtcNow || validOtp.IsUsed)
        {
            return Result.Failure(ErrorCodes.InvalidOtp, "OTP is invalid or expired.");
        }

        var existingAccount = await _userRepository.GetAccountByPhoneAsync(normalizedPhone, cancellationToken);
        if (existingAccount is not null && existingAccount.Id != account.Id)
        {
            return Result.Failure(ErrorCodes.AccountAlreadyExists, "Phone number already exists.");
        }

        validOtp.IsUsed = true;
        account.Phone = normalizedPhone;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private async Task<Result<AuthResponse>> IssueTokenPairAsync(Account account, string deviceId, CancellationToken cancellationToken)
    {
        var pair = _tokenService.GenerateTokens(account.Id, account.Type.ToString(), deviceId);

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            Account = account,
            Token = pair.RefreshToken,
            ExpiresAt = pair.RefreshTokenExpiresUtc,
            IsDeleted = false
        };

        await _refreshTokenRepository.AddAsync(refreshToken, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse>.Success(new AuthResponse(pair.AccessToken, pair.RefreshToken));
    }

    private async Task NormalizeSuspendedAccountIfExpiredAsync(Account account, CancellationToken cancellationToken)
    {
        if (account.Status != AccountStatus.Suspended ||
            !account.SuspendedUntilUtc.HasValue ||
            account.SuspendedUntilUtc.Value > DateTime.UtcNow)
        {
            return;
        }

        account.Status = AccountStatus.Active;
        account.IsActive = true;
        account.SuspendedUntilUtc = null;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizePhone(string phoneNumber)
    {
        return phoneNumber.Trim().Replace(" ", string.Empty, StringComparison.Ordinal);
    }
}
