using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IParticipationRepository
{
    Task<Participation?> GetByUserAndEventAsync(Guid userId, Guid eventId, CancellationToken cancellationToken);
    Task<Participation?> GetByEventAndUserAsync(Guid eventId, Guid userId, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Participation> Items, int TotalCount)> GetByUserAsync(Guid userId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<int> CountApprovedByEventAsync(Guid eventId, CancellationToken cancellationToken);
    Task AddAsync(Participation entity, CancellationToken cancellationToken);
}
