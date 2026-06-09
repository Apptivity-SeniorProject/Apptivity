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

    public Task<Account?> GetAccountByIdWithInterestsAsync(Guid accountId, CancellationToken cancellationToken)
    {
        return _db.Accounts
            .Include(x => x.InterestTags)
            .FirstOrDefaultAsync(x => x.Id == accountId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Account>> GetExpiredSuspendedAccountsAsync(DateTime nowUtc, CancellationToken cancellationToken)
    {
        return await _db.Accounts
            .Where(x =>
                x.Status == AccountStatus.Suspended &&
                x.SuspendedUntilUtc.HasValue &&
                x.SuspendedUntilUtc.Value <= nowUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyCollection<Account> Items, int TotalCount)> SearchProfilesAsync(ProfileSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = BuildProfileQuery()
            .AsNoTracking()
            .Where(x => x.Status == AccountStatus.Active && x.IsActive);

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
            .Include(x => x.InterestTags)
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
        return _db.Events
            .Include(x => x.PrimaryTag)
            .Include(x => x.Tags)
            .FirstOrDefaultAsync(x => x.Id == eventId && !x.IsDeleted, cancellationToken);
    }

    public IQueryable<Event> Query()
    {
        return _db.Events;
    }

    public Task<Event?> GetByIdWithOwnerAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Events
            .Include(x => x.Owner)
            .Include(x => x.PrimaryTag)
            .Include(x => x.Tags)
            .FirstOrDefaultAsync(x => x.Id == eventId && !x.IsDeleted, cancellationToken);
    }

    public Task<Event?> GetWithParticipantsAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Events
            .Include(x => x.Owner)
                .ThenInclude(o => o.UserProfile)
                    .ThenInclude(u => u!.Reputation)
            .Include(x => x.Owner)
                .ThenInclude(o => o.ClubProfile)
                    .ThenInclude(c => c!.ClubRating)
            .Include(x => x.PrimaryTag)
            .Include(x => x.Tags)
            .Include(x => x.Participations)
                .ThenInclude(p => p.User)
                    .ThenInclude(u => u.Account)
            .Include(x => x.Participations)
                .ThenInclude(p => p.User)
                    .ThenInclude(u => u.Reputation)
            .FirstOrDefaultAsync(x => x.Id == eventId && !x.IsDeleted, cancellationToken);
    }

    public Task<int> CountByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        return _db.Events.CountAsync(x => x.OwnerId == ownerId && !x.IsDeleted, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByOwnerIdAsync(Guid ownerId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.Events
            .AsNoTracking()
            .Include(x => x.Tags)
            .Include(x => x.Owner)
                .ThenInclude(o => o.UserProfile)
            .Include(x => x.Owner)
                .ThenInclude(o => o.ClubProfile)
            .Where(x => x.OwnerId == ownerId && !x.IsDeleted);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Time)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<bool> HasScheduleConflictAsync(Guid ownerId, DateOnly date, TimeOnly time, Guid? excludeEventId, CancellationToken cancellationToken)
    {
        return _db.Events.AnyAsync(
            x => x.OwnerId == ownerId
                && x.Date == date
                && x.Time == time
                && !x.IsDeleted
                && x.Status != EventStatus.Cancelled
                && (!excludeEventId.HasValue || x.Id != excludeEventId.Value),
            cancellationToken);
    }

    public async Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByApprovedParticipantAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.Events
            .AsNoTracking()
            .Where(x => !x.IsDeleted && _db.Participations.Any(p => p.EventId == x.Id && p.UserId == accountId && p.Status == ParticipationStatus.Approved));

        var totalCount = await query.CountAsync(cancellationToken);
        var eventIds = await query
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Time)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (eventIds.Count == 0)
        {
            return (Array.Empty<Event>(), totalCount);
        }

        var items = await _db.Events
            .AsNoTracking()
            .Include(x => x.Tags)
            .Include(x => x.Owner)
                .ThenInclude(o => o.UserProfile)
            .Include(x => x.Owner)
                .ThenInclude(o => o.ClubProfile)
            .Where(x => eventIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        var orderedItems = eventIds
            .Join(items, id => id, item => item.Id, (_, item) => item)
            .ToArray();

        return (orderedItems, totalCount);
    }

    public async Task<IReadOnlyCollection<Event>> GetPublishedAndOngoingAsync(CancellationToken cancellationToken)
    {
        // NOTE: AsNoTracking is intentionally NOT used here.
        // EventLifecycleService mutates Status on these entities and relies on
        // EF change tracking to persist the updates via SaveChangesAsync.
        return await _db.Events
            .Include(x => x.Owner)
            .Include(x => x.Tags)
            .Where(x =>
                (x.Status == EventStatus.Published || x.Status == EventStatus.Ongoing) &&
                !x.IsDeleted &&
                x.Owner.Status == AccountStatus.Active &&
                x.Owner.IsActive)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Event>> GetCompletedWithExpiredVotingAsync(CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        return await _db.Events
            .Where(x =>
                x.Status == EventStatus.Completed &&
                !x.IsVotingClosed &&
                x.VotingClosesAt.HasValue &&
                x.VotingClosesAt.Value <= nowUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyCollection<Event> Items, int TotalCount)> SearchAsync(EventSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        var todayUtc = DateOnly.FromDateTime(nowUtc);
        var currentTimeUtc = TimeOnly.FromDateTime(nowUtc);

        var query = _db.Events
            .AsNoTracking()
            .Include(x => x.Tags)
            .Include(x => x.Owner)
                .ThenInclude(o => o.UserProfile)
            .Include(x => x.Owner)
                .ThenInclude(o => o.ClubProfile)
            .Where(x =>
                x.Status == EventStatus.Published &&
                !x.IsDeleted &&
                (x.Date > todayUtc || (x.Date == todayUtc && x.Time >= currentTimeUtc)) &&
                x.Owner.Status == AccountStatus.Active &&
                x.Owner.IsActive);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.Trim().ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(term) || x.Description.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter.LocationCity))
        {
            var city = filter.LocationCity.Trim().ToLowerInvariant();
            query = query.Where(x => x.LocationData != null && x.LocationData.ToLower().Contains(city));
        }

        if (filter.PrimaryTagId.HasValue)
        {
            query = query.Where(x => x.PrimaryTagId == filter.PrimaryTagId.Value);
        }

        if (filter.TagIds is { Count: > 0 })
        {
            var normalizedTagIds = filter.TagIds
                .Where(x => x != Guid.Empty)
                .Distinct()
                .ToArray();

            if (normalizedTagIds.Length > 0)
            {
                query = filter.MatchAllTags
                    ? query.Where(x =>
                        x.Tags
                            .Where(tag => normalizedTagIds.Contains(tag.Id))
                            .Select(tag => tag.Id)
                            .Distinct()
                            .Count() == normalizedTagIds.Length)
                    : query.Where(x => x.Tags.Any(tag => normalizedTagIds.Contains(tag.Id)));
            }
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

        if (filter.UserLat.HasValue && filter.UserLng.HasValue && filter.NearbyRadiusKm.HasValue)
        {
            var lat = filter.UserLat.Value;
            var lng = filter.UserLng.Value;
            var radiusKm = (decimal)filter.NearbyRadiusKm.Value;
            
            var latDegrees = radiusKm / 111.32m;
            var lngDegrees = radiusKm / (111.32m * (decimal)Math.Max(0.1, Math.Abs(Math.Cos((double)lat * Math.PI / 180.0))));
            
            var minLat = lat - latDegrees;
            var maxLat = lat + latDegrees;
            var minLng = lng - lngDegrees;
            var maxLng = lng + lngDegrees;

            query = query.Where(x => 
                x.LocationLat != null && 
                x.LocationLng != null &&
                x.LocationLat >= minLat && x.LocationLat <= maxLat &&
                x.LocationLng >= minLng && x.LocationLng <= maxLng);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        if (filter.Sort == "nearby" && filter.UserLat.HasValue && filter.UserLng.HasValue)
        {
            var lat = filter.UserLat.Value;
            var lng = filter.UserLng.Value;
            var cosLat = (decimal)Math.Cos((double)lat * Math.PI / 180.0);
            
            query = query.OrderBy(x => 
                (x.LocationLat - lat) * (x.LocationLat - lat) + 
                ((x.LocationLng - lng) * cosLat) * ((x.LocationLng - lng) * cosLat)
            );
        }
        else
        {
            query = query
                .OrderByDescending(x => x.IsFeatured)
                .ThenBy(x => x.Date)
                .ThenBy(x => x.Time);
        }

        var items = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetRecommendedByTagIdsAsync(IReadOnlyCollection<Guid> tagIds, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        if (tagIds.Count == 0)
        {
            return (Array.Empty<Event>(), 0);
        }

        var normalizedTagIds = tagIds
            .Where(x => x != Guid.Empty)
            .Distinct()
            .ToArray();

        if (normalizedTagIds.Length == 0)
        {
            return (Array.Empty<Event>(), 0);
        }

        var nowUtc = DateTime.UtcNow;
        var todayUtc = DateOnly.FromDateTime(nowUtc);
        var currentTimeUtc = TimeOnly.FromDateTime(nowUtc);

        var query = _db.Events
            .AsNoTracking()
            .Include(x => x.Tags)
            .Include(x => x.Owner)
                .ThenInclude(o => o.UserProfile)
            .Include(x => x.Owner)
                .ThenInclude(o => o.ClubProfile)
            .Where(x =>
                x.Status == EventStatus.Published &&
                !x.IsDeleted &&
                (x.Date > todayUtc || (x.Date == todayUtc && x.Time >= currentTimeUtc)) &&
                x.Owner.Status == AccountStatus.Active &&
                x.Owner.IsActive &&
                x.Tags.Any(tag => normalizedTagIds.Contains(tag.Id)));

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(x => x.Date)
            .ThenBy(x => x.Time)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyCollection<string>> GetApprovedHistoryTagNamesAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var tagsFromEventTags = _db.Participations
            .AsNoTracking()
            .Where(x => x.UserId == accountId && x.Status == ParticipationStatus.Approved)
            .SelectMany(x => x.Event.Tags.Select(tag => tag.Name));

        var tagsFromPrimaryTags = _db.Participations
            .AsNoTracking()
            .Where(x => x.UserId == accountId && x.Status == ParticipationStatus.Approved && x.Event.PrimaryTag != null)
            .Select(x => x.Event.PrimaryTag!.Name);

        var combined = await tagsFromEventTags
            .Concat(tagsFromPrimaryTags)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .Take(20)
            .ToListAsync(cancellationToken);

        return combined;
    }


    public async Task<IReadOnlyCollection<Event>> GetSimilarEventsAsync(Guid eventId, Guid primaryTagId, int count, CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        var todayUtc = DateOnly.FromDateTime(nowUtc);
        var currentTimeUtc = TimeOnly.FromDateTime(nowUtc);

        return await _db.Events
            .AsNoTracking()
            .Include(x => x.Tags)
            .Include(x => x.Owner)
                .ThenInclude(o => o.UserProfile)
            .Include(x => x.Owner)
                .ThenInclude(o => o.ClubProfile)
            .Where(x =>
                x.Id != eventId &&
                x.PrimaryTagId == primaryTagId &&
                x.Status == EventStatus.Published &&
                !x.IsDeleted &&
                (x.Date > todayUtc || (x.Date == todayUtc && x.Time >= currentTimeUtc)))
            .OrderByDescending(x => x.CreatedAt)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Event entity, CancellationToken cancellationToken)
    {
        await _db.Events.AddAsync(entity, cancellationToken);
    }
}

public sealed class DailyRecommendationRepository : IDailyRecommendationRepository
{
    private readonly AppDbContext _db;

    public DailyRecommendationRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<DailyRecommendationPlan?> GetPlanForDayAsync(Guid userId, string dayKey, CancellationToken cancellationToken)
    {
        return _db.DailyRecommendationPlans
            .Include(x => x.Tags)
            .Include(x => x.Cursor)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.DayKey == dayKey, cancellationToken);
    }

    public async Task AcquireUserRecommendationLockAsync(Guid userId, CancellationToken cancellationToken)
    {
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM accounts WHERE \"Id\" = {userId} FOR UPDATE",
            cancellationToken);
    }

    public Task<DailyRecommendationCursor?> GetCursorForUpdateAsync(Guid planId, CancellationToken cancellationToken)
    {
        return _db.DailyRecommendationCursors
            .FromSqlInterpolated($"SELECT * FROM user_daily_recommendation_cursor WHERE plan_id = {planId} FOR UPDATE")
            .AsTracking()
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task ResetPlanStateAsync(Guid planId, CancellationToken cancellationToken)
    {
        await _db.DailyRecommendationServedEvents
            .Where(x => x.PlanId == planId)
            .ExecuteDeleteAsync(cancellationToken);

        await _db.DailyRecommendationPlanTags
            .Where(x => x.PlanId == planId)
            .ExecuteDeleteAsync(cancellationToken);

        var cursor = await _db.DailyRecommendationCursors
            .FirstOrDefaultAsync(x => x.PlanId == planId, cancellationToken);

        if (cursor is null)
        {
            await _db.DailyRecommendationCursors.AddAsync(new DailyRecommendationCursor
            {
                PlanId = planId,
                CurrentTagOrder = 1,
                IsDepleted = false
            }, cancellationToken);
            return;
        }

        cursor.CurrentTagOrder = 1;
        cursor.IsDepleted = false;
    }

    public async Task<IReadOnlyCollection<DailyRecommendationServedEvent>> GetRecentServedEventsAsync(
        Guid userId,
        DateTime sinceUtc,
        CancellationToken cancellationToken)
    {
        return await _db.DailyRecommendationServedEvents
            .AsNoTracking()
            .Where(x => x.Plan.UserId == userId && x.ServedAtUtc >= sinceUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<string?> GetMostFrequentServedClubCityAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await _db.DailyRecommendationServedEvents
            .AsNoTracking()
            .Where(x => x.Plan.UserId == userId
                && x.Event.Owner.ClubProfile != null
                && !string.IsNullOrWhiteSpace(x.Event.Owner.ClubProfile.LocationCity))
            .GroupBy(x => x.Event.Owner.ClubProfile!.LocationCity)
            .OrderByDescending(x => x.Count())
            .Select(x => x.Key)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddPlanAsync(DailyRecommendationPlan plan, CancellationToken cancellationToken)
    {
        await _db.DailyRecommendationPlans.AddAsync(plan, cancellationToken);
    }
}

public sealed class TagRepository : ITagRepository
{
    private readonly AppDbContext _db;

    public TagRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyCollection<Tag>> GetActiveAsync(CancellationToken cancellationToken)
    {
        return await _db.Tags
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Tag>> GetActiveByIdsAsync(IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken)
    {
        if (tagIds.Count == 0)
        {
            return Array.Empty<Tag>();
        }

        return await _db.Tags
            .Where(x => x.IsActive && tagIds.Contains(x.Id))
            .ToListAsync(cancellationToken);
    }

    public Task<Tag?> GetByIdAsync(Guid tagId, CancellationToken cancellationToken)
    {
        return _db.Tags.FirstOrDefaultAsync(x => x.Id == tagId, cancellationToken);
    }

    public Task<Tag?> GetByIdWithRelationsAsync(Guid tagId, CancellationToken cancellationToken)
    {
        return _db.Tags
            .Include(x => x.PrimaryTaggedEvents)
            .Include(x => x.Events)
            .Include(x => x.Accounts)
            .FirstOrDefaultAsync(x => x.Id == tagId, cancellationToken);
    }

    public Task<bool> ExistsByNameAsync(string name, Guid? exceptId, CancellationToken cancellationToken)
    {
        var normalizedName = name.Trim();
        return _db.Tags.AnyAsync(
            x => x.Name.ToLower() == normalizedName.ToLower() && (!exceptId.HasValue || x.Id != exceptId.Value),
            cancellationToken);
    }

    public async Task AddAsync(Tag tag, CancellationToken cancellationToken)
    {
        await _db.Tags.AddAsync(tag, cancellationToken);
    }
}

public sealed class ChatReportRepository : IChatReportRepository
{
    private readonly AppDbContext _db;

    public ChatReportRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(ChatReport chatReport, CancellationToken cancellationToken)
    {
        await _db.ChatReports.AddAsync(chatReport, cancellationToken);
    }

    public Task<ChatReport?> GetByIdWithMessagesAsync(Guid id, CancellationToken cancellationToken)
    {
        return _db.ChatReports
            .Include(x => x.Reporter)
            .Include(x => x.Event)
            .Include(x => x.Messages)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<ChatReport> Items, int TotalCount)> GetListAsync(ChatReportFilter filter, CancellationToken cancellationToken)
    {
        var query = _db.ChatReports
            .AsNoTracking()
            .Include(x => x.Reporter)
            .Include(x => x.Event)
            .Include(x => x.Messages)
            .AsQueryable();

        if (filter.Status.HasValue)
        {
            query = query.Where(x => x.Status == filter.Status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
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
                .ThenInclude(e => e.Owner)
                    .ThenInclude(o => o.UserProfile)
            .Include(x => x.Event)
                .ThenInclude(e => e.Owner)
                    .ThenInclude(o => o.ClubProfile)
            .Include(x => x.Event)
                .ThenInclude(e => e.Tags)
            .Where(x => x.UserId == userId && !x.Event.IsDeleted);

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

    public Task<bool> HasChatAccessParticipationAsync(Guid userId, Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Participations.AnyAsync(
            x => x.UserId == userId &&
                 x.EventId == eventId &&
                 x.Status == ParticipationStatus.Approved,
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<Guid>> GetApprovedParticipantAccountIdsAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return await _db.Participations
            .Where(x => x.EventId == eventId && x.Status == ParticipationStatus.Approved)
            .Select(x => x.UserId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Guid>> GetChatParticipantAccountIdsAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return await _db.Participations
            .Where(x => x.EventId == eventId &&
                        x.Status == ParticipationStatus.Approved)
            .Select(x => x.UserId)
            .Distinct()
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
    private static readonly TimeSpan ChatLifetimeAfterEventStart = TimeSpan.FromHours(2);

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
            .Include(x => x.SenderAccount)
                .ThenInclude(x => x.UserProfile)
            .Include(x => x.SenderAccount)
                .ThenInclude(x => x.ClubProfile)
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

    public async Task<bool> IsEventChatExpiredAsync(Guid eventId, DateTime nowUtc, CancellationToken cancellationToken)
    {
        var eventData = await _db.Events
            .AsNoTracking()
            .Where(x => x.Id == eventId)
            .Select(x => new { x.Date, x.Time })
            .FirstOrDefaultAsync(cancellationToken);

        if (eventData is null)
        {
            return false;
        }

        var expiresAtUtc = ToUtcDateTime(eventData.Date, eventData.Time).Add(ChatLifetimeAfterEventStart);
        return expiresAtUtc <= nowUtc;
    }

    public async Task PurgeEventChatAsync(Guid eventId, CancellationToken cancellationToken)
    {
        var chat = await _db.Chats.FirstOrDefaultAsync(x => x.EventId == eventId, cancellationToken);
        if (chat is null)
        {
            return;
        }

        var messages = await _db.Messages
            .Where(x => x.ChatId == chat.Id)
            .ToListAsync(cancellationToken);

        if (messages.Count > 0)
        {
            _db.Messages.RemoveRange(messages);
        }

        _db.Chats.Remove(chat);
    }

    public async Task<int> PurgeExpiredEventChatsAsync(DateTime nowUtc, CancellationToken cancellationToken)
    {
        var chatCandidates = await _db.Chats
            .AsNoTracking()
            .Include(x => x.Event)
            .Select(x => new
            {
                x.Id,
                x.EventId,
                x.Event.Date,
                x.Event.Time
            })
            .ToListAsync(cancellationToken);

        var expiredChatIds = chatCandidates
            .Where(x => ToUtcDateTime(x.Date, x.Time).Add(ChatLifetimeAfterEventStart) <= nowUtc)
            .Select(x => x.Id)
            .Distinct()
            .ToArray();

        if (expiredChatIds.Length == 0)
        {
            return 0;
        }

        var messages = await _db.Messages
            .Where(x => expiredChatIds.Contains(x.ChatId))
            .ToListAsync(cancellationToken);

        if (messages.Count > 0)
        {
            _db.Messages.RemoveRange(messages);
        }

        var chats = await _db.Chats
            .Where(x => expiredChatIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        if (chats.Count > 0)
        {
            _db.Chats.RemoveRange(chats);
        }

        return chats.Count;
    }

    private static DateTime ToUtcDateTime(DateOnly date, TimeOnly time)
    {
        var localDateTime = date.ToDateTime(time, DateTimeKind.Utc);
        return DateTime.SpecifyKind(localDateTime, DateTimeKind.Utc);
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

    public async Task<double?> GetAverageRatingByReviewedAccountIdAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var ratings = _db.Reviews
            .AsNoTracking()
            .Where(x => x.ReviewedId == accountId)
            .Select(x => (double?)x.Rating);

        return await ratings.AverageAsync(cancellationToken);
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

    public async Task<Dictionary<Guid, Reputation>> GetByAccountIdsAsync(
        IReadOnlyCollection<Guid> accountIds,
        CancellationToken cancellationToken)
    {
        if (accountIds.Count == 0)
        {
            return new Dictionary<Guid, Reputation>();
        }

        return await _db.Reputations
            .Where(x => accountIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);
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

public sealed class AdminRepository : IAdminRepository
{
    private readonly AppDbContext _db;

    public AdminRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<int> CountAccountsAsync(CancellationToken cancellationToken)
    {
        return _db.Accounts.CountAsync(cancellationToken);
    }

    public Task<int> CountActiveEventsAsync(CancellationToken cancellationToken)
    {
        return _db.Events.CountAsync(
            x => x.Status == EventStatus.Published || x.Status == EventStatus.Ongoing,
            cancellationToken);
    }

    public Task<int> CountRecentParticipationsAsync(DateTime fromUtc, CancellationToken cancellationToken)
    {
        return _db.Participations.CountAsync(x => x.CreatedAt >= fromUtc, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<AdminAccountListItem> Items, int TotalCount)> GetAccountsAsync(
        AdminAccountFilter filter,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = _db.Accounts.AsNoTracking();

        if (filter.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == filter.IsActive.Value);
        }

        if (filter.Status.HasValue)
        {
            query = query.Where(x => x.Status == filter.Status.Value);
        }

        if (filter.ExcludeStatus.HasValue)
        {
            query = query.Where(x => x.Status != filter.ExcludeStatus.Value);
        }

        if (filter.Type.HasValue)
        {
            query = query.Where(x => x.Type == filter.Type.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Query))
        {
            var normalizedQuery = filter.Query.Trim().ToLower();
            query = query.Where(x =>
                x.Username.ToLower().Contains(normalizedQuery) ||
                x.Phone.ToLower().Contains(normalizedQuery) ||
                (x.Email != null && x.Email.ToLower().Contains(normalizedQuery)) ||
                (x.ClubProfile != null && x.ClubProfile.Name.ToLower().Contains(normalizedQuery)) ||
                (x.UserProfile != null && (
                    x.UserProfile.Name.ToLower().Contains(normalizedQuery) ||
                    x.UserProfile.Surname.ToLower().Contains(normalizedQuery))));
        }

        var projected = query
            .Select(x => new
            {
                Account = x,
                DisplayName = x.UserProfile != null
                    ? ((x.UserProfile.Name + " " + x.UserProfile.Surname).Trim())
                    : (x.ClubProfile != null ? x.ClubProfile.Name : null),
                OrganizationName = x.ClubProfile != null ? x.ClubProfile.Name : null,
                OrganizationCity = x.ClubProfile != null ? x.ClubProfile.LocationCity : null,
                SuspendedUntilUtc = x.SuspendedUntilUtc,
                ReportCount = _db.Reports.Count(r =>
                    (r.TargetType == ReportTargetType.Account && r.TargetId == x.Id) ||
                    (r.TargetType == ReportTargetType.Event &&
                     _db.Events.Any(e => e.Id == r.TargetId && e.OwnerId == x.Id)))
            });

        if (filter.MinReportCount.HasValue)
        {
            projected = projected.Where(x => x.ReportCount >= filter.MinReportCount.Value);
        }

        var totalCount = await projected.CountAsync(cancellationToken);
        var rows = await projected
            .OrderByDescending(x => x.ReportCount)
            .ThenByDescending(x => x.Account.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (rows.Select(x => new AdminAccountListItem(x.Account, x.ReportCount, x.DisplayName, x.OrganizationName, x.OrganizationCity, x.SuspendedUntilUtc)).ToArray(), totalCount);
    }

    public async Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetEventsAsync(
        EventStatus? status,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = _db.Events.AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Club?> GetClubByIdAsync(Guid clubId, CancellationToken cancellationToken)
    {
        return _db.Clubs
            .Include(x => x.Account)
            .FirstOrDefaultAsync(x => x.Id == clubId, cancellationToken);
    }

    public Task<Event?> GetEventByIdAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Events.FirstOrDefaultAsync(x => x.Id == eventId, cancellationToken);
    }

    public Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken)
    {
        return _db.Accounts.FirstOrDefaultAsync(x => x.Id == accountId, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<AdminReportListItem> Items, int TotalCount)> GetReportsAsync(
        AdminReportFilter filter,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = _db.Reports.AsNoTracking();

        if (filter.Status.HasValue)
        {
            query = query.Where(x => x.Status == filter.Status.Value);
        }

        if (filter.TargetType.HasValue)
        {
            query = query.Where(x => x.TargetType == filter.TargetType.Value);
        }

        query = query.OrderByDescending(x => x.CreatedAt);

        var projected = query.Select(x => new AdminReportListItem(
            x,
            _db.Accounts
                .IgnoreQueryFilters()
                .Where(a => a.Id == x.ReporterId)
                .Select(a => a.Username)
                .FirstOrDefault() ?? string.Empty,
            x.TargetType == ReportTargetType.Event ? x.TargetId : (Guid?)null,
            x.TargetType == ReportTargetType.Event
                ? _db.Events
                    .IgnoreQueryFilters()
                    .Where(e => e.Id == x.TargetId)
                    .Select(e => e.Name)
                    .FirstOrDefault()
                : null,
            x.TargetType == ReportTargetType.Event
                ? _db.Events
                    .IgnoreQueryFilters()
                    .Where(e => e.Id == x.TargetId)
                    .Select(e => (Guid?)e.OwnerId)
                    .FirstOrDefault()
                : x.TargetId,
            x.TargetType == ReportTargetType.Event
                ? _db.Events
                    .IgnoreQueryFilters()
                    .Where(e => e.Id == x.TargetId)
                    .Select(e => (AccountType?)e.Owner.Type)
                    .FirstOrDefault()
                : _db.Accounts
                    .IgnoreQueryFilters()
                    .Where(a => a.Id == x.TargetId)
                    .Select(a => (AccountType?)a.Type)
                    .FirstOrDefault(),
            x.TargetType == ReportTargetType.Event
                ? _db.Events
                    .IgnoreQueryFilters()
                    .Where(e => e.Id == x.TargetId)
                    .Select(e => e.Owner.Username)
                    .FirstOrDefault()
                : _db.Accounts
                    .IgnoreQueryFilters()
                    .Where(a => a.Id == x.TargetId)
                    .Select(a => a.Username)
                    .FirstOrDefault(),
            x.TargetType == ReportTargetType.Event
                ? _db.Events
                    .IgnoreQueryFilters()
                    .Where(e => e.Id == x.TargetId)
                    .Select(e => e.Owner.UserProfile != null ? e.Owner.UserProfile.Name + " " + e.Owner.UserProfile.Surname : null)
                    .FirstOrDefault()
                : _db.Accounts
                    .IgnoreQueryFilters()
                    .Where(a => a.Id == x.TargetId)
                    .Select(a => a.UserProfile != null ? a.UserProfile.Name + " " + a.UserProfile.Surname : null)
                    .FirstOrDefault(),
            x.TargetType == ReportTargetType.Event
                ? _db.Events
                    .IgnoreQueryFilters()
                    .Where(e => e.Id == x.TargetId)
                    .Select(e => e.Owner.ClubProfile != null ? e.Owner.ClubProfile.Name : null)
                    .FirstOrDefault()
                : _db.Accounts
                    .IgnoreQueryFilters()
                    .Where(a => a.Id == x.TargetId)
                    .Select(a => a.ClubProfile != null ? a.ClubProfile.Name : null)
                    .FirstOrDefault()));

        if (!string.IsNullOrWhiteSpace(filter.OrganizationQuery))
        {
            var organizationQuery = filter.OrganizationQuery.Trim().ToLower();
            projected = projected.Where(x =>
                x.RelatedAccountType == AccountType.Organization &&
                (((x.RelatedOrganizationName ?? string.Empty).ToLower().Contains(organizationQuery)) ||
                 ((x.RelatedUsername ?? string.Empty).ToLower().Contains(organizationQuery))));
        }

        if (!string.IsNullOrWhiteSpace(filter.UserQuery))
        {
            var userQuery = filter.UserQuery.Trim().ToLower();
            projected = projected.Where(x =>
                x.RelatedAccountType == AccountType.Individual &&
                (((x.RelatedUserFullName ?? string.Empty).ToLower().Contains(userQuery)) ||
                 ((x.RelatedUsername ?? string.Empty).ToLower().Contains(userQuery))));
        }

        if (!string.IsNullOrWhiteSpace(filter.AccountQuery))
        {
            var accountQuery = filter.AccountQuery.Trim().ToLower();
            projected = projected.Where(x =>
                x.Report.TargetType == ReportTargetType.Account &&
                (
                    ((x.RelatedUserFullName ?? string.Empty).ToLower().Contains(accountQuery)) ||
                    ((x.RelatedOrganizationName ?? string.Empty).ToLower().Contains(accountQuery)) ||
                    ((x.RelatedUsername ?? string.Empty).ToLower().Contains(accountQuery))
                ));
        }

        if (!string.IsNullOrWhiteSpace(filter.EventQuery))
        {
            var eventQuery = filter.EventQuery.Trim().ToLower();
            projected = projected.Where(x =>
                ((x.EventName ?? string.Empty).ToLower().Contains(eventQuery)));
        }

        var totalCount = await projected.CountAsync(cancellationToken);
        var items = await projected
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task AddAuditLogAsync(AuditLog auditLog, CancellationToken cancellationToken)
    {
        await _db.AuditLogs.AddAsync(auditLog, cancellationToken);
    }
}

public sealed class ReportRepository : IReportRepository
{
    private readonly AppDbContext _db;

    public ReportRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(Report report, CancellationToken cancellationToken)
    {
        await _db.Reports.AddAsync(report, cancellationToken);
    }
}

public sealed class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _db;

    public NotificationRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<(IReadOnlyCollection<Notification> Items, int TotalCount)> GetByAccountIdAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.Notifications
            .AsNoTracking()
            .Where(x => x.AccountId == accountId);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Notification?> GetByIdAsync(Guid notificationId, CancellationToken cancellationToken)
    {
        return _db.Notifications.FirstOrDefaultAsync(x => x.Id == notificationId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Notification>> GetUnreadByAccountIdAsync(Guid accountId, CancellationToken cancellationToken)
    {
        return await _db.Notifications
            .Where(x => x.AccountId == accountId && !x.IsRead)
            .ToListAsync(cancellationToken);
    }

    public async Task AddRangeAsync(IReadOnlyCollection<Notification> notifications, CancellationToken cancellationToken)
    {
        await _db.Notifications.AddRangeAsync(notifications, cancellationToken);
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

public sealed class RecommendationTransactionManager : IRecommendationTransactionManager
{
    private readonly AppDbContext _db;

    public RecommendationTransactionManager(AppDbContext db)
    {
        _db = db;
    }

    public async Task<T> ExecuteInTransactionAsync<T>(
        Func<CancellationToken, Task<T>> action,
        CancellationToken cancellationToken)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            var result = await action(cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        });
    }
}

public sealed class EventBookmarkRepository : IEventBookmarkRepository
{
    private readonly AppDbContext _db;

    public EventBookmarkRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<EventBookmark?> GetBookmarkAsync(Guid accountId, Guid eventId, CancellationToken cancellationToken)
    {
        return _db.EventBookmarks
            .FirstOrDefaultAsync(x => x.AccountId == accountId && x.EventId == eventId, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<EventBookmark> Items, int TotalCount)> GetByAccountIdAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.EventBookmarks
            .AsNoTracking()
            .Include(x => x.Event)
                .ThenInclude(e => e.Tags)
            .Include(x => x.Event)
                .ThenInclude(e => e.Owner)
                    .ThenInclude(o => o.UserProfile)
            .Include(x => x.Event)
                .ThenInclude(e => e.Owner)
                    .ThenInclude(o => o.ClubProfile)
            .Where(x => x.AccountId == accountId && !x.Event.IsDeleted);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task AddAsync(EventBookmark bookmark, CancellationToken cancellationToken)
    {
        await _db.EventBookmarks.AddAsync(bookmark, cancellationToken);
    }

    public void Remove(EventBookmark bookmark)
    {
        _db.EventBookmarks.Remove(bookmark);
    }

    public Task<bool> HasBookmarkedAsync(Guid accountId, Guid eventId, CancellationToken cancellationToken)
    {
        return _db.EventBookmarks
            .AnyAsync(x => x.AccountId == accountId && x.EventId == eventId, cancellationToken);
    }
}
