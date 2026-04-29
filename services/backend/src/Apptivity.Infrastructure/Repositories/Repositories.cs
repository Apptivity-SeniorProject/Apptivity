using Apptivity.Application.Common.Models;
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

    public Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        return _db.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
    }

    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken)
    {
        return _db.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
    }

    public Task<User?> GetByPhoneAsync(string phoneNumber, CancellationToken cancellationToken)
    {
        return _db.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phoneNumber, cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken)
    {
        await _db.Users.AddAsync(user, cancellationToken);
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

    public async Task<PagedResult<Event>> GetPagedAsync(Guid? userId, UserRole role, EventStatus? status, PagedRequest request, CancellationToken cancellationToken)
    {
        IQueryable<Event> query = _db.Events.AsNoTracking();

        if (role == UserRole.Organization && userId.HasValue)
        {
            query = query.Where(x => x.OrganizerId == userId.Value);
        }

        if (role == UserRole.Individual)
        {
            query = query.Where(x => x.Status != EventStatus.Draft && x.Status != EventStatus.Cancelled);
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.StartUtc)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Event>(items, totalCount, request.PageNumber, request.PageSize);
    }

    public async Task AddAsync(Event entity, CancellationToken cancellationToken)
    {
        await _db.Events.AddAsync(entity, cancellationToken);
    }
}

public sealed class SubmissionRepository : ISubmissionRepository
{
    private readonly AppDbContext _db;

    public SubmissionRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<Submission?> GetByIdAsync(Guid submissionId, CancellationToken cancellationToken)
    {
        return _db.Submissions
            .Include(x => x.Event)
            .FirstOrDefaultAsync(x => x.Id == submissionId, cancellationToken);
    }

    public Task<Submission?> GetByEventAndAttendeeAsync(Guid eventId, Guid attendeeId, CancellationToken cancellationToken)
    {
        return _db.Submissions
            .FirstOrDefaultAsync(x => x.EventId == eventId && x.AttendeeId == attendeeId, cancellationToken);
    }

    public async Task AddAsync(Submission entity, CancellationToken cancellationToken)
    {
        await _db.Submissions.AddAsync(entity, cancellationToken);
    }

    public Task<bool> HasApprovedSubmissionAsync(Guid eventId, Guid attendeeId, CancellationToken cancellationToken)
    {
        return _db.Submissions.AnyAsync(x => x.EventId == eventId && x.AttendeeId == attendeeId && x.Status == SubmissionStatus.Approved, cancellationToken);
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

    public Task<RefreshToken?> GetActiveByTokenHashAsync(string tokenHash, CancellationToken cancellationToken)
    {
        return _db.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash && x.RevokedUtc == null, cancellationToken);
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
