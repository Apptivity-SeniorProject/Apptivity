using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Chats;
using Apptivity.Application.Interfaces;

namespace Apptivity.Application.Services;

public sealed class ChatService : IChatService
{
    private readonly IChatRepository _chatRepository;
    private readonly IParticipationRepository _participationRepository;

    public ChatService(IChatRepository chatRepository, IParticipationRepository participationRepository)
    {
        _chatRepository = chatRepository;
        _participationRepository = participationRepository;
    }

    public async Task<Result<PagedResult<ChatMessageDto>>> GetMessagesAsync(Guid eventId, int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken)
    {
        var paging = new PagedRequest
        {
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        paging.Normalize();

        var hasAccess = await _participationRepository.HasApprovedParticipationAsync(userContext.AccountId, eventId, cancellationToken);
        if (!hasAccess)
        {
            return Result<PagedResult<ChatMessageDto>>.Failure(ErrorCodes.EventUnauthorized, "Only approved participants can access event chat.");
        }

        var (items, totalCount) = await _chatRepository.GetMessagesAsync(eventId, paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items
            .Select(x => new ChatMessageDto(x.Id, eventId, x.SenderAccountId, x.Content, x.CreatedAt))
            .ToArray();

        return Result<PagedResult<ChatMessageDto>>.Success(new PagedResult<ChatMessageDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }
}
