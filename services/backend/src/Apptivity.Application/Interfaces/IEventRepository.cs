using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public sealed record EventSearchFilter(
    string? LocationCity,
    Guid? PrimaryTagId,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool? IsPaid);

public interface IEventRepository
{
    Task<Event?> GetByIdAsync(Guid eventId, CancellationToken cancellationToken);
    Task<Event?> GetByIdWithOwnerAsync(Guid eventId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Event>> GetPublishedAndOngoingAsync(CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Event> Items, int TotalCount)> SearchAsync(EventSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task AddAsync(Event entity, CancellationToken cancellationToken);
}
