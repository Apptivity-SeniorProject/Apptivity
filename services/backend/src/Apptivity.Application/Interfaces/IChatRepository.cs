using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IChatRepository
{
    Task<Chat?> GetByEventIdAsync(Guid eventId, CancellationToken cancellationToken);
    Task<Chat> GetOrCreateForEventAsync(Guid eventId, Guid createdByAccountId, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Message> Items, int TotalCount)> GetMessagesAsync(Guid eventId, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task AddMessageAsync(Message message, CancellationToken cancellationToken);
    Task<bool> IsEventChatExpiredAsync(Guid eventId, DateTime nowUtc, CancellationToken cancellationToken);
    Task PurgeEventChatAsync(Guid eventId, CancellationToken cancellationToken);
    Task<int> PurgeExpiredEventChatsAsync(DateTime nowUtc, CancellationToken cancellationToken);
}
