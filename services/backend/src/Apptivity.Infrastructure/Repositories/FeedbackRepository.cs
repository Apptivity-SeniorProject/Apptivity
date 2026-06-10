using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Apptivity.Infrastructure.Repositories;

public sealed class FeedbackRepository : IFeedbackRepository
{
    private readonly AppDbContext _db;

    public FeedbackRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(FeedbackSubmission submission, CancellationToken cancellationToken)
    {
        await _db.FeedbackSubmissions.AddAsync(submission, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<FeedbackSubmission> Items, int TotalCount)> GetPagedAsync(
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = _db.FeedbackSubmissions
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }
}
