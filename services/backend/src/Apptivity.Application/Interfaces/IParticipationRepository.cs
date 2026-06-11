using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IParticipationRepository
{
    Task<Participation?> GetByIdAsync(Guid participationId, CancellationToken cancellationToken);
    Task<Participation?> GetByUserAndEventAsync(Guid userId, Guid eventId, CancellationToken cancellationToken);
    Task<Participation?> GetByEventAndUserAsync(Guid eventId, Guid userId, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Participation> Items, int TotalCount)> GetByUserAsync(Guid userId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<int> CountApprovedByEventAsync(Guid eventId, CancellationToken cancellationToken);
    Task<int> CountApprovedByUserAsync(Guid userId, CancellationToken cancellationToken);
    Task<bool> HasApprovedParticipationAsync(Guid userId, Guid eventId, CancellationToken cancellationToken);
    Task<bool> HasChatAccessParticipationAsync(Guid userId, Guid eventId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Guid>> GetApprovedParticipantAccountIdsAsync(Guid eventId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Guid>> GetChatParticipantAccountIdsAsync(Guid eventId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Guid>> GetActiveEventIdsByUserAsync(Guid userId, CancellationToken cancellationToken);
    Task AddAsync(Participation entity, CancellationToken cancellationToken);
}
