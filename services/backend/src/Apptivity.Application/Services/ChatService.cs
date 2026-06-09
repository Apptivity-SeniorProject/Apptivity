using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Chats;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class ChatService : IChatService
{
    private readonly IEventRepository _eventRepository;
    private readonly IChatRepository _chatRepository;
    private readonly IParticipationRepository _participationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ChatService(
        IEventRepository eventRepository,
        IChatRepository chatRepository,
        IParticipationRepository participationRepository,
        IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _chatRepository = chatRepository;
        _participationRepository = participationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<PagedResult<ChatMessageDto>>> GetMessagesAsync(Guid eventId, int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken)
    {
        var paging = new PagedRequest
        {
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        paging.Normalize();

        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result<PagedResult<ChatMessageDto>>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        var isOwner = eventEntity.OwnerId == userContext.AccountId;
        var hasAccess = isOwner ||
                        await _participationRepository.HasChatAccessParticipationAsync(
                            userContext.AccountId,
                            eventId,
                            cancellationToken);
        if (!hasAccess)
        {
            return Result<PagedResult<ChatMessageDto>>.Failure(
                ErrorCodes.EventUnauthorized,
                "Only event owner or approved participants can access event chat.");
        }

        if (eventEntity.Status == EventStatus.Cancelled || eventEntity.Status == EventStatus.Completed)
        {
            await _chatRepository.PurgeEventChatAsync(eventId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result<PagedResult<ChatMessageDto>>.Failure(
                ErrorCodes.EventInvalidState,
                "Event chat is no longer available.");
        }

        if (await _chatRepository.IsEventChatExpiredAsync(eventId, DateTime.UtcNow, cancellationToken))
        {
            await _chatRepository.PurgeEventChatAsync(eventId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result<PagedResult<ChatMessageDto>>.Failure(ErrorCodes.EventInvalidState, "Event chat has expired and is no longer available.");
        }

        var (items, totalCount) = await _chatRepository.GetMessagesAsync(eventId, paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items
            .Select(x => new ChatMessageDto(
                x.Id,
                eventId,
                x.SenderAccountId,
                BuildSenderDisplayName(x.SenderAccount),
                x.SenderAccount.ProfilePhoto,
                x.Content,
                x.CreatedAt))
            .ToArray();

        return Result<PagedResult<ChatMessageDto>>.Success(new PagedResult<ChatMessageDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    private static string BuildSenderDisplayName(Account account)
    {
        if (account.Type == AccountType.Organization && account.ClubProfile is not null)
        {
            return account.ClubProfile.Name;
        }

        if (account.UserProfile is not null)
        {
            return $"{account.UserProfile.Name} {account.UserProfile.Surname}".Trim();
        }

        return account.Username;
    }
}
