using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;

namespace Apptivity.Application.Contracts.Chats;

public sealed record ChatMessageDto(
    Guid MessageId,
    Guid EventId,
    Guid SenderAccountId,
    string SenderName,
    string? SenderProfilePhoto,
    string Content,
    DateTime SentAtUtc);

public interface IChatService
{
    Task<Result<PagedResult<ChatMessageDto>>> GetMessagesAsync(Guid eventId, int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken);
}
