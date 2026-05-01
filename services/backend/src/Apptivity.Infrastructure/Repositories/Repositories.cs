using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
using Apptivity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Apptivity.Infrastructure.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken)
    {
        return BuildProfileQuery()
            .FirstOrDefaultAsync(x => x.Id == accountId, cancellationToken);
    }

    public Task<Account?> GetAccountByIdWithProfilesAsync(Guid accountId, CancellationToken cancellationToken)
    {
        return BuildProfileQuery()
            .FirstOrDefaultAsync(x => x.Id == accountId, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<Account> Items, int TotalCount)> SearchProfilesAsync(ProfileSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = BuildProfileQuery().AsNoTracking();

        if (filter.AccountType.HasValue)
        {
            query = query.Where(x => x.Type == filter.AccountType.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.City))
        {
            var city = filter.City.Trim().ToLowerInvariant();
            query = query.Where(x => x.ClubProfile != null && x.ClubProfile.LocationCity.ToLower().Contains(city));
        }

        if (!string.IsNullOrWhiteSpace(filter.Query))
        {
            var keyword = filter.Query.Trim().ToLowerInvariant();
            query = query.Where(x =>
                x.Username.ToLower().Contains(keyword) ||
                (x.UserProfile != null && (x.UserProfile.Name + " " + x.UserProfile.Surname).ToLower().Contains(keyword)) ||
                (x.ClubProfile != null && x.ClubProfile.Name.ToLower().Contains(keyword)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(x => x.Username)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Account?> GetAccountByEmailAsync(string email, CancellationToken cancellationToken)
    {
        return _db.Accounts
            .Include(x => x.UserProfile)
            .Include(x => x.ClubProfile)
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
    }

    public Task<Account?> GetAccountByPhoneAsync(string phone, CancellationToken cancellationToken)
    {
        return _db.Accounts
            .Include(x => x.UserProfile)
            .Include(x => x.ClubProfile)
            .FirstOrDefaultAsync(x => x.Phone == phone, cancellationToken);
    }

    public Task<Account?> GetAccountByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        return _db.Accounts
            .Include(x => x.UserProfile)
            .Include(x => x.ClubProfile)
            .FirstOrDefaultAsync(x => x.Username == username, cancellationToken);
    }

    public async Task AddAccountAsync(Account account, CancellationToken cancellationToken)
    {
        await _db.Accounts.AddAsync(account, cancellationToken);
    }

    public async Task AddUserProfileAsync(User user, CancellationToken cancellationToken)
    {
        await _db.Users.AddAsync(user, cancellationToken);
    }

    public async Task AddClubProfileAsync(Club club, CancellationToken cancellationToken)
    {
        await _db.Clubs.AddAsync(club, cancellationToken);
    }

    private IQueryable<Account> BuildProfileQuery()
    {
        return _db.Accounts
            .Include(x => x.UserProfile)
                .ThenInclude(u => u!.Reputation)
            .Include(x => x.ClubProfile)
                .ThenInclude(c => c!.ClubRating);
    }
}

public sealed class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AppDbContext _db;

    public RefreshTokenRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(RefreshToken token, CancellationToken cancellationToken)
    {
        await _db.RefreshTokens.AddAsync(token, cancellationToken);
    }

    public Task<RefreshToken?> GetActiveByTokenAsync(string refreshToken, CancellationToken cancellationToken)
    {
        return _db.RefreshTokens
            .Include(x => x.Account)
            .FirstOrDefaultAsync(x => x.Token == refreshToken && x.RevokedAt == null && x.ExpiresAt > DateTime.UtcNow, cancellationToken);
    }
}

public sealed class OtpVerificationRepository : IOtpVerificationRepository
{
    private readonly AppDbContext _db;

    public OtpVerificationRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(OtpVerification otpVerification, CancellationToken cancellationToken)
    {
        await _db.OtpVerifications.AddAsync(otpVerification, cancellationToken);
    }

    public Task<OtpVerification?> GetValidAsync(string phoneNumber, string code, CancellationToken cancellationToken)
    {
        return _db.OtpVerifications
            .Where(x => x.PhoneNumber == phoneNumber && x.Code == code && !x.IsUsed && x.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }
}

public sealed class EventRepository : IEventRepository
{
    private readonly AppDbContext _db;

    public EventRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<Event?> GetByIdAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Events.FirstOrDefaultAsync(x => x.Id == eventId, cancellationToken);
    }

    public IQueryable<Event> Query()
    {
        return _db.Events;
    }

    public Task<Event?> GetByIdWithOwnerAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Events
            .Include(x => x.Owner)
            .FirstOrDefaultAsync(x => x.Id == eventId, cancellationToken);
    }

    public Task<int> CountByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        return _db.Events.CountAsync(x => x.OwnerId == ownerId, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByOwnerIdAsync(Guid ownerId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.Events
            .AsNoTracking()
            .Where(x => x.OwnerId == ownerId);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Time)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByApprovedParticipantAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.Participations
            .AsNoTracking()
            .Where(x => x.UserId == accountId && x.Status == ParticipationStatus.Approved)
            .Select(x => x.Event);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Time)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyCollection<Event>> GetPublishedAndOngoingAsync(CancellationToken cancellationToken)
    {
        return await _db.Events
            .Where(x => x.Status == EventStatus.Published || x.Status == EventStatus.Ongoing)
            .ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyCollection<Event> Items, int TotalCount)> SearchAsync(EventSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.Events
            .AsNoTracking()
            .Where(x => x.Status != EventStatus.Draft && x.Status != EventStatus.Cancelled);

        if (!string.IsNullOrWhiteSpace(filter.LocationCity))
        {
            var city = filter.LocationCity.Trim().ToLowerInvariant();
            query = query.Where(x => x.LocationData != null && x.LocationData.ToLower().Contains(city));
        }

        if (filter.PrimaryTagId.HasValue)
        {
            query = query.Where(x => x.PrimaryTagId == filter.PrimaryTagId.Value);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(x => x.Date >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(x => x.Date <= filter.EndDate.Value);
        }

        if (filter.IsPaid.HasValue)
        {
            query = filter.IsPaid.Value
                ? query.Where(x => x.Price > 0)
                : query.Where(x => x.Price <= 0);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(x => x.Date)
            .ThenBy(x => x.Time)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task AddAsync(Event entity, CancellationToken cancellationToken)
    {
        await _db.Events.AddAsync(entity, cancellationToken);
    }
}

public sealed class ParticipationRepository : IParticipationRepository
{
    private readonly AppDbContext _db;

    public ParticipationRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<Participation?> GetByIdAsync(Guid participationId, CancellationToken cancellationToken)
    {
        return _db.Participations.FirstOrDefaultAsync(x => x.Id == participationId, cancellationToken);
    }

    public Task<Participation?> GetByUserAndEventAsync(Guid userId, Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Participations
            .FirstOrDefaultAsync(x => x.UserId == userId && x.EventId == eventId, cancellationToken);
    }

    public Task<Participation?> GetByEventAndUserAsync(Guid eventId, Guid userId, CancellationToken cancellationToken)
    {
        return _db.Participations
            .Include(x => x.Event)
            .FirstOrDefaultAsync(x => x.EventId == eventId && x.UserId == userId, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<Participation> Items, int TotalCount)> GetByUserAsync(Guid userId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.Participations
            .AsNoTracking()
            .Include(x => x.Event)
            .Where(x => x.UserId == userId);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<int> CountApprovedByEventAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Participations
            .CountAsync(x => x.EventId == eventId && x.Status == ParticipationStatus.Approved, cancellationToken);
    }

    public Task<int> CountApprovedByUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        return _db.Participations
            .CountAsync(x => x.UserId == userId && x.Status == ParticipationStatus.Approved, cancellationToken);
    }

    public Task<bool> HasApprovedParticipationAsync(Guid userId, Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Participations
            .AnyAsync(x => x.UserId == userId && x.EventId == eventId && x.Status == ParticipationStatus.Approved, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Guid>> GetApprovedParticipantAccountIdsAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return await _db.Participations
            .Where(x => x.EventId == eventId && x.Status == ParticipationStatus.Approved)
            .Select(x => x.UserId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Participation entity, CancellationToken cancellationToken)
    {
        await _db.Participations.AddAsync(entity, cancellationToken);
    }
}

public sealed class ChatRepository : IChatRepository
{
    private readonly AppDbContext _db;

    public ChatRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<Chat?> GetByEventIdAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Chats.FirstOrDefaultAsync(x => x.EventId == eventId, cancellationToken);
    }

    public async Task<Chat> GetOrCreateForEventAsync(Guid eventId, Guid createdByAccountId, CancellationToken cancellationToken)
    {
        var chat = await _db.Chats.FirstOrDefaultAsync(x => x.EventId == eventId, cancellationToken);
        if (chat is not null)
        {
            return chat;
        }

        chat = new Chat
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            CreatedByAccountId = createdByAccountId
        };

        await _db.Chats.AddAsync(chat, cancellationToken);
        return chat;
    }

    public async Task<(IReadOnlyCollection<Message> Items, int TotalCount)> GetMessagesAsync(Guid eventId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.Messages
            .AsNoTracking()
            .Include(x => x.Chat)
            .Where(x => x.Chat.EventId == eventId);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task AddMessageAsync(Message message, CancellationToken cancellationToken)
    {
        await _db.Messages.AddAsync(message, cancellationToken);
    }
}

public sealed class DeviceTokenRepository : IDeviceTokenRepository
{
    private readonly AppDbContext _db;

    public DeviceTokenRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<DeviceToken?> GetByAccountAndDeviceTypeAsync(Guid accountId, string deviceType, CancellationToken cancellationToken)
    {
        return _db.DeviceTokens
            .FirstOrDefaultAsync(x => x.AccountId == accountId && x.DeviceType == deviceType, cancellationToken);
    }

    public async Task<IReadOnlyCollection<DeviceToken>> GetByAccountIdsAsync(IReadOnlyCollection<Guid> accountIds, CancellationToken cancellationToken)
    {
        if (accountIds.Count == 0)
        {
            return Array.Empty<DeviceToken>();
        }

        return await _db.DeviceTokens
            .Where(x => accountIds.Contains(x.AccountId))
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(DeviceToken deviceToken, CancellationToken cancellationToken)
    {
        await _db.DeviceTokens.AddAsync(deviceToken, cancellationToken);
    }
}

public sealed class ReviewRepository : IReviewRepository
{
    private readonly AppDbContext _db;

    public ReviewRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(Review review, CancellationToken cancellationToken)
    {
        await _db.Reviews.AddAsync(review, cancellationToken);
    }

    public Task<Review?> GetByIdAsync(Guid reviewId, CancellationToken cancellationToken)
    {
        return _db.Reviews
            .Include(x => x.Reviewer)
            .Include(x => x.Reviewed)
            .Include(x => x.Event)
            .FirstOrDefaultAsync(x => x.Id == reviewId, cancellationToken);
    }

    public Task<Review?> GetDuplicateAsync(Guid reviewerId, Guid reviewedId, Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Reviews
            .FirstOrDefaultAsync(
                x => x.ReviewerId == reviewerId && x.ReviewedId == reviewedId && x.EventId == eventId,
                cancellationToken);
    }

    public Task<List<Review>> GetByReviewedAccountIdAsync(Guid accountId, int skip, int take, CancellationToken cancellationToken)
    {
        return _db.Reviews
            .Include(x => x.Reviewer)
            .Include(x => x.Reviewed)
            .Include(x => x.Event)
            .Where(x => x.ReviewedId == accountId)
            .OrderByDescending(x => x.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public Task<int> CountByReviewedAccountIdAsync(Guid accountId, CancellationToken cancellationToken)
    {
        return _db.Reviews.CountAsync(x => x.ReviewedId == accountId, cancellationToken);
    }

    public Task<int> CountReviewsForUserInEventAsync(Guid reviewedUserId, Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Reviews.CountAsync(
            x => x.ReviewedId == reviewedUserId && x.EventId == eventId,
            cancellationToken);
    }

    public Task<List<Review>> GetReviewsByEventIdAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Reviews
            .Include(x => x.Reviewer)
            .Include(x => x.Reviewed)
            .Where(x => x.EventId == eventId)
            .ToListAsync(cancellationToken);
    }
}

public sealed class ReputationRepository : IReputationRepository
{
    private readonly AppDbContext _db;

    public ReputationRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<Reputation?> GetByAccountIdAsync(Guid accountId, CancellationToken cancellationToken)
    {
        return _db.Reputations.FirstOrDefaultAsync(x => x.Id == accountId, cancellationToken);
    }

    public Task<ClubRating?> GetClubRatingByAccountIdAsync(Guid accountId, CancellationToken cancellationToken)
    {
        return _db.ClubRatings.FirstOrDefaultAsync(x => x.Id == accountId, cancellationToken);
    }

    public async Task AddReputationAsync(Reputation reputation, CancellationToken cancellationToken)
    {
        await _db.Reputations.AddAsync(reputation, cancellationToken);
    }

    public async Task AddClubRatingAsync(ClubRating clubRating, CancellationToken cancellationToken)
    {
        await _db.ClubRatings.AddAsync(clubRating, cancellationToken);
    }
}

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _db;

    public UnitOfWork(AppDbContext db)
    {
        _db = db;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
