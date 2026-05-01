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
        return _db.Accounts
            .Include(x => x.UserProfile)
            .Include(x => x.ClubProfile)
            .FirstOrDefaultAsync(x => x.Id == accountId, cancellationToken);
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
        // Shared primary key relation: User.Id must match Account.Id.
        await _db.Users.AddAsync(user, cancellationToken);
    }

    public async Task AddClubProfileAsync(Club club, CancellationToken cancellationToken)
    {
        // Shared primary key relation: Club.Id must match Account.Id.
        await _db.Clubs.AddAsync(club, cancellationToken);
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

    public Task<Event?> GetByIdWithOwnerAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return _db.Events
            .Include(x => x.Owner)
            .FirstOrDefaultAsync(x => x.Id == eventId, cancellationToken);
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

    public async Task AddAsync(Participation entity, CancellationToken cancellationToken)
    {
        await _db.Participations.AddAsync(entity, cancellationToken);
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
