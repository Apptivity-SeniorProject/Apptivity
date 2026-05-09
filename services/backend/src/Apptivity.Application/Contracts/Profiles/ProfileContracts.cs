using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Application.Contracts.Tags;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Contracts.Profiles;

public sealed record UserProfileDto(string Name, string Surname, string? Bio);
public sealed record ClubProfileDto(string Name, string? Description, string City);

public sealed record ProfileDto(
    Guid AccountId,
    string Username,
    AccountType Type,
    AccountStatus Status,
    string? ProfilePhoto,
    string? SocialLinks,
    IReadOnlyCollection<TagDto> Interests,
    UserProfileDto? UserProfile,
    ClubProfileDto? ClubProfile);

public sealed record AccountStatusDto(Guid AccountId, AccountStatus Status, bool IsActive);
public sealed record UpdateMyAccountStatusRequest(AccountStatus Status);

public sealed record ProfileStatsDto(
    Guid AccountId,
    int TotalEvents,
    int TotalReviews,
    double? ReputationScore,
    double? Rating);

public sealed record UpdateProfileRequest(
    string? Username,
    string? SocialLinks,
    string? Bio,
    string? Name,
    string? Surname,
    string? ClubName,
    string? ClubDescription,
    string? City);

public sealed record SetAccountInterestsRequest(IReadOnlyCollection<Guid> TagIds);

public sealed record ProfileSearchRequest(
    string? Query,
    AccountType? AccountType,
    string? City,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record ProfileEventDto(
    Guid EventId,
    string Name,
    DateOnly Date,
    TimeOnly Time,
    EventStatus Status,
    bool IsPast);

public interface IProfileService
{
    Task<Result<PagedResult<ProfileDto>>> SearchAsync(ProfileSearchRequest request, CancellationToken cancellationToken);
    Task<Result<ProfileDto>> GetByIdAsync(Guid accountId, CancellationToken cancellationToken);
    Task<Result<ProfileDto>> GetMeAsync(UserContext userContext, CancellationToken cancellationToken);
    Task<Result<ProfileStatsDto>> GetStatsAsync(Guid accountId, CancellationToken cancellationToken);
    Task<Result<ProfileDto>> UpdateMeAsync(UserContext userContext, UpdateProfileRequest request, CancellationToken cancellationToken);
    Task<Result<ProfileDto>> UpdateMyPhotoAsync(UserContext userContext, Stream fileStream, string fileName, CancellationToken cancellationToken);
    Task<Result<PagedResult<ProfileEventDto>>> GetEventsAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Result> DeactivateMeAsync(UserContext userContext, CancellationToken cancellationToken);
    Task<Result<AccountStatusDto>> GetMyStatusAsync(UserContext userContext, CancellationToken cancellationToken);
    Task<Result<AccountStatusDto>> UpdateMyStatusAsync(UserContext userContext, UpdateMyAccountStatusRequest request, CancellationToken cancellationToken);
    Task<Result<ProfileDto>> SetAccountInterestsAsync(Guid accountId, IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken);
    Task<Result<ProfileDto>> SetMyInterestsAsync(UserContext userContext, IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken);
}
