using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Profiles;
using Apptivity.Application.Contracts.Tags;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class ProfileService : IProfileService
{
    private readonly IUserRepository _userRepository;
    private readonly IEventRepository _eventRepository;
    private readonly IParticipationRepository _participationRepository;
    private readonly IReviewRepository _reviewRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IImageService _imageService;
    private readonly IUnitOfWork _unitOfWork;

    public ProfileService(
        IUserRepository userRepository,
        IEventRepository eventRepository,
        IParticipationRepository participationRepository,
        IReviewRepository reviewRepository,
        ITagRepository tagRepository,
        IImageService imageService,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _eventRepository = eventRepository;
        _participationRepository = participationRepository;
        _reviewRepository = reviewRepository;
        _tagRepository = tagRepository;
        _imageService = imageService;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<PagedResult<ProfileDto>>> SearchAsync(ProfileSearchRequest request, CancellationToken cancellationToken)
    {
        var paging = new PagedRequest
        {
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
        paging.Normalize();

        var filter = new ProfileSearchFilter(request.Query, request.AccountType, request.City);
        var (items, totalCount) = await _userRepository.SearchProfilesAsync(filter, paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items.Select(MapProfile).ToArray();

        return Result<PagedResult<ProfileDto>>.Success(
            new PagedResult<ProfileDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    public async Task<Result<ProfileDto>> GetByIdAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var account = await _userRepository.GetAccountByIdWithProfilesAsync(accountId, cancellationToken);
        if (account is null)
        {
            return Result<ProfileDto>.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        return Result<ProfileDto>.Success(MapProfile(account));
    }

    public Task<Result<ProfileDto>> GetMeAsync(UserContext userContext, CancellationToken cancellationToken)
    {
        return GetByIdAsync(userContext.AccountId, cancellationToken);
    }

    public async Task<Result<ProfileStatsDto>> GetStatsAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var account = await _userRepository.GetAccountByIdWithProfilesAsync(accountId, cancellationToken);
        if (account is null)
        {
            return Result<ProfileStatsDto>.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        var totalEvents = account.Type == AccountType.Individual
            ? await _participationRepository.CountApprovedByUserAsync(accountId, cancellationToken)
            : await _eventRepository.CountByOwnerIdAsync(accountId, cancellationToken);

        var totalReviews = await _reviewRepository.CountByReviewedAccountIdAsync(accountId, cancellationToken);

        var reputation = account.UserProfile?.Reputation;
        var reputationLevel = reputation?.Level.ToString();
        var organizationRating = account.Type == AccountType.Organization
            ? await _reviewRepository.GetAverageRatingByReviewedAccountIdAsync(accountId, cancellationToken)
            : account.ClubProfile?.ClubRating?.Rating;

        var stats = new ProfileStatsDto(
            account.Id,
            totalEvents,
            totalReviews,
            reputation?.ReputationPoint,
            reputationLevel,
            organizationRating);

        return Result<ProfileStatsDto>.Success(stats);
    }

    public async Task<Result<ProfileDto>> UpdateMeAsync(UserContext userContext, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var account = await _userRepository.GetAccountByIdWithProfilesAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return Result<ProfileDto>.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            var normalized = request.Username.Trim().ToLowerInvariant();
            var existing = await _userRepository.GetAccountByUsernameAsync(normalized, cancellationToken);
            if (existing is not null && existing.Id != account.Id)
            {
                return Result<ProfileDto>.Failure(ErrorCodes.AccountAlreadyExists, "Username already exists.");
            }

            account.Username = normalized;
        }

        if (request.SocialLinks is not null)
        {
            account.SocialLinks = string.IsNullOrWhiteSpace(request.SocialLinks) ? null : request.SocialLinks.Trim();
        }

        if (account.Type == AccountType.Individual && account.UserProfile is not null)
        {
            if (request.Bio is not null)
            {
                account.UserProfile.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                account.UserProfile.Name = request.Name.Trim();
            }

            if (!string.IsNullOrWhiteSpace(request.Surname))
            {
                account.UserProfile.Surname = request.Surname.Trim();
            }
        }
        else if (account.Type == AccountType.Organization && account.ClubProfile is not null)
        {
            if (!string.IsNullOrWhiteSpace(request.ClubName))
            {
                account.ClubProfile.Name = request.ClubName.Trim();
            }

            if (request.ClubDescription is not null)
            {
                account.ClubProfile.Description = string.IsNullOrWhiteSpace(request.ClubDescription) ? null : request.ClubDescription.Trim();
            }

            if (!string.IsNullOrWhiteSpace(request.City))
            {
                account.ClubProfile.LocationCity = request.City.Trim();
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<ProfileDto>.Success(MapProfile(account));
    }

    public async Task<Result<ProfileDto>> UpdateMyPhotoAsync(UserContext userContext, Stream fileStream, string fileName, CancellationToken cancellationToken)
    {
        var account = await _userRepository.GetAccountByIdWithProfilesAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return Result<ProfileDto>.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        var upload = await _imageService.UploadProfilePhotoAsync(fileStream, fileName, account.Id, cancellationToken);
        account.ProfilePhoto = upload.Url;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<ProfileDto>.Success(MapProfile(account));
    }

    public async Task<Result<PagedResult<ProfileEventDto>>> GetEventsAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var account = await _userRepository.GetAccountByIdWithProfilesAsync(accountId, cancellationToken);
        if (account is null)
        {
            return Result<PagedResult<ProfileEventDto>>.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        var paging = new PagedRequest
        {
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        paging.Normalize();

        var (items, totalCount) = account.Type == AccountType.Individual
            ? await _eventRepository.GetByApprovedParticipantAsync(accountId, paging.PageNumber, paging.PageSize, cancellationToken)
            : await _eventRepository.GetByOwnerIdAsync(accountId, paging.PageNumber, paging.PageSize, cancellationToken);

        var nowUtc = DateTime.UtcNow;
        var mapped = items.Select(x =>
        {
            var eventDateTime = DateTime.SpecifyKind(x.Date.ToDateTime(x.Time), DateTimeKind.Utc);
            return new ProfileEventDto(
                x.Id,
                x.Name,
                x.Date,
                x.Time,
                x.Status,
                eventDateTime < nowUtc);
        }).ToArray();

        return Result<PagedResult<ProfileEventDto>>.Success(
            new PagedResult<ProfileEventDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    public async Task<Result> DeactivateMeAsync(UserContext userContext, CancellationToken cancellationToken)
    {
        var account = await _userRepository.GetAccountByIdAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return Result.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        account.Status = AccountStatus.Deactivated;
        account.IsActive = false;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<AccountStatusDto>> GetMyStatusAsync(UserContext userContext, CancellationToken cancellationToken)
    {
        var account = await _userRepository.GetAccountByIdAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return Result<AccountStatusDto>.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        return Result<AccountStatusDto>.Success(new AccountStatusDto(account.Id, account.Status, account.IsActive));
    }

    public async Task<Result<AccountStatusDto>> UpdateMyStatusAsync(UserContext userContext, UpdateMyAccountStatusRequest request, CancellationToken cancellationToken)
    {
        if (request.Status is not (AccountStatus.Active or AccountStatus.Deactivated))
        {
            return Result<AccountStatusDto>.Failure(ErrorCodes.Validation, "You can only set your account status to Active or Deactivated.");
        }

        var account = await _userRepository.GetAccountByIdAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return Result<AccountStatusDto>.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        if (account.Status is AccountStatus.Suspended or AccountStatus.Banned)
        {
            return Result<AccountStatusDto>.Failure(ErrorCodes.Unauthorized, "Suspended or banned accounts cannot change status.");
        }

        account.Status = request.Status;
        account.IsActive = request.Status == AccountStatus.Active;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AccountStatusDto>.Success(new AccountStatusDto(account.Id, account.Status, account.IsActive));
    }

    public Task<Result<ProfileDto>> SetMyInterestsAsync(UserContext userContext, IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken)
    {
        return SetAccountInterestsAsync(userContext.AccountId, tagIds, cancellationToken);
    }

    public async Task<Result<ProfileDto>> SetAccountInterestsAsync(Guid accountId, IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken)
    {
        var account = await _userRepository.GetAccountByIdWithInterestsAsync(accountId, cancellationToken);
        if (account is null)
        {
            return Result<ProfileDto>.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        var normalizedTagIds = tagIds
            .Where(x => x != Guid.Empty)
            .Distinct()
            .ToArray();

        var tags = normalizedTagIds.Length == 0
            ? Array.Empty<Tag>()
            : await _tagRepository.GetActiveByIdsAsync(normalizedTagIds, cancellationToken);

        if (tags.Count != normalizedTagIds.Length)
        {
            return Result<ProfileDto>.Failure(ErrorCodes.Validation, "One or more tags are invalid or inactive.");
        }

        account.InterestTags.Clear();
        foreach (var tag in tags)
        {
            account.InterestTags.Add(tag);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var refreshed = await _userRepository.GetAccountByIdWithProfilesAsync(accountId, cancellationToken);
        if (refreshed is null)
        {
            return Result<ProfileDto>.Failure(ErrorCodes.ProfileNotFound, "Profile not found.");
        }

        return Result<ProfileDto>.Success(MapProfile(refreshed));
    }

    private static ProfileDto MapProfile(Account account)
    {
        var userProfile = account.UserProfile is null
            ? null
            : new UserProfileDto(account.UserProfile.Name, account.UserProfile.Surname, account.UserProfile.Bio);

        var clubProfile = account.ClubProfile is null
            ? null
            : new ClubProfileDto(account.ClubProfile.Name, account.ClubProfile.Description, account.ClubProfile.LocationCity);

        var interests = account.InterestTags
            .Where(x => x.IsActive && !x.IsDeleted)
            .OrderBy(x => x.Name)
            .Select(x => new TagDto(x.Id, x.Name))
            .ToArray();

        return new ProfileDto(
            account.Id,
            account.Username,
            account.Type,
            account.Status,
            account.ProfilePhoto,
            account.SocialLinks,
            interests,
            userProfile,
            clubProfile);
    }
}
