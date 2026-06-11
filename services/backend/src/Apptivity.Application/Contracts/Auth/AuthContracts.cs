using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;

namespace Apptivity.Application.Contracts.Auth;

public sealed record LoginRequest(string Identifier, string Password, string DeviceId);
public sealed record SendOtpRequest(string PhoneNumber);
public sealed record OtpVerifyRequest(string PhoneNumber, string Code, string DeviceId);
public sealed record RegisterIndividualRequest(
    string Username,
    string Phone,
    string? Email,
    string Password,
    string Name,
    string Surname,
    DateOnly? Birthdate,
    string? Gender,
    string? Bio,
    string DeviceId);

public sealed record RegisterOrganizationRequest(
    string Username,
    string Phone,
    string? Email,
    string Password,
    string Name,
    string LocationCity,
    string? Description,
    decimal? Latitude,
    decimal? Longitude,
    string DeviceId);

public sealed record AuthResponse(string AccessToken, string RefreshToken);
public sealed record RefreshTokenRequest(string RefreshToken, string DeviceId);
public sealed record ChangePhoneRequest(string NewPhoneNumber, string? Code);

public interface IAuthService
{
    Task<Result> SendOtpAsync(string phoneNumber, CancellationToken cancellationToken);
    Task<Result<AuthResponse>> VerifyOtpAsync(OtpVerifyRequest request, CancellationToken cancellationToken);
    Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<Result<AuthResponse>> RegisterIndividualAsync(RegisterIndividualRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken);
    Task<Result<AuthResponse>> RegisterOrganizationAsync(RegisterOrganizationRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken);
    Task<Result<AuthResponse>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken);
    Task<Result> ChangePhoneAsync(ChangePhoneRequest request, UserContext userContext, CancellationToken cancellationToken);
}
