using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IEventBookmarkRepository
{
    Task<EventBookmark?> GetBookmarkAsync(Guid accountId, Guid eventId, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<EventBookmark> Items, int TotalCount)> GetByAccountIdAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task AddAsync(EventBookmark bookmark, CancellationToken cancellationToken);
    void Remove(EventBookmark bookmark);
    Task<bool> HasBookmarkedAsync(Guid accountId, Guid eventId, CancellationToken cancellationToken);
}
