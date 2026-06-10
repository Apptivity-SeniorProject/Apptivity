using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Apptivity.Api.Hubs;

[Authorize]
public sealed class ChatHub : Hub
{
    private readonly IEventRepository _eventRepository;
    private readonly IUserRepository _userRepository;
    private readonly IParticipationRepository _participationRepository;
    private readonly IChatRepository _chatRepository;
    private readonly INotificationService _notificationService;
    private readonly INotificationRepository _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ChatHub(
        IEventRepository eventRepository,
        IUserRepository userRepository,
        IParticipationRepository participationRepository,
        IChatRepository chatRepository,
        INotificationService notificationService,
        INotificationRepository notificationRepository,
        IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _userRepository = userRepository;
        _participationRepository = participationRepository;
        _chatRepository = chatRepository;
        _notificationService = notificationService;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task JoinEventChat(Guid eventId)
    {
        await EnsureChatIsActiveAsync(eventId);

        var userContext = GetCurrentUserContext();
        var hasAccess = await HasChatAccessAsync(userContext.AccountId, eventId, Context.ConnectionAborted);
        if (!hasAccess)
        {
            throw new HubException("Only event owner or approved participants can join event chat.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, BuildEventGroup(eventId), Context.ConnectionAborted);
    }

    public async Task LeaveEventChat(Guid eventId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, BuildEventGroup(eventId), Context.ConnectionAborted);
    }

    public async Task SendMessage(Guid eventId, string content)
    {
        await EnsureChatIsActiveAsync(eventId);

        if (string.IsNullOrWhiteSpace(content))
        {
            throw new HubException("Message content cannot be empty.");
        }

        var userContext = GetCurrentUserContext();
        var accountId = userContext.AccountId;
        var hasAccess = await HasChatAccessAsync(accountId, eventId, Context.ConnectionAborted);
        if (!hasAccess)
        {
            throw new HubException("Only event owner or approved participants can send messages.");
        }

        var eventEntity = await _eventRepository.GetByIdAsync(eventId, Context.ConnectionAborted);
        if (eventEntity is null)
        {
            throw new HubException("Event not found.");
        }

        var chat = await _chatRepository.GetOrCreateForEventAsync(eventId, accountId, Context.ConnectionAborted);

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChatId = chat.Id,
            SenderAccountId = accountId,
            Content = content.Trim()
        };

        await _chatRepository.AddMessageAsync(message, Context.ConnectionAborted);
        await _unitOfWork.SaveChangesAsync(Context.ConnectionAborted);

        var senderAccount = await _userRepository.GetAccountByIdWithProfilesAsync(accountId, Context.ConnectionAborted);
        var senderName = senderAccount is null
            ? "Kullanici"
            : BuildSenderDisplayName(senderAccount);

        var payload = new
        {
            messageId = message.Id,
            eventId,
            senderAccountId = accountId,
            senderName,
            senderProfilePhoto = senderAccount?.ProfilePhoto,
            content = message.Content,
            sentAtUtc = message.CreatedAt
        };

        await Clients.Group(BuildEventGroup(eventId)).SendAsync("ReceiveMessage", payload, Context.ConnectionAborted);

        var joinedAccounts = await _participationRepository.GetChatParticipantAccountIdsAsync(eventId, Context.ConnectionAborted);
        var targetAccounts = joinedAccounts
            .Append(eventEntity.OwnerId)
            .Where(x => x != accountId)
            .Distinct()
            .ToArray();

        if (targetAccounts.Length > 0)
        {
            var notifications = new List<PushNotificationRequest>();
            foreach (var targetAccountId in targetAccounts)
            {
                var hasUnread = await _notificationRepository.HasUnreadChatNotificationAsync(targetAccountId, eventId, Context.ConnectionAborted);
                if (!hasUnread)
                {
                    notifications.Add(new PushNotificationRequest(
                        targetAccountId,
                        "Yeni Mesaj",
                        $"{senderName}: {message.Content}",
                        new Dictionary<string, string>
                        {
                            ["eventId"] = eventId.ToString(),
                            ["messageId"] = message.Id.ToString(),
                            ["relatedEntityId"] = eventId.ToString()
                        }));
                }
            }

            if (notifications.Count > 0)
            {
                await _notificationService.SendToAccountsAsync(notifications, Context.ConnectionAborted);
            }
        }
    }

    private UserContext GetCurrentUserContext()
    {
        var sub = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? Context.User?.FindFirstValue("sub");
        var role = Context.User?.FindFirstValue(ClaimTypes.Role);

        if (!Guid.TryParse(sub, out var accountId) || string.IsNullOrWhiteSpace(role))
        {
            throw new HubException("Invalid user context.");
        }

        if (!Enum.TryParse<AccountType>(role, true, out var accountType))
        {
            throw new HubException("Invalid user context.");
        }

        return new UserContext(accountId, accountType);
    }

    private static string BuildEventGroup(Guid eventId) => $"event-chat:{eventId}";

    private async Task EnsureChatIsActiveAsync(Guid eventId)
    {
        var eventEntity = await _eventRepository.GetByIdAsync(eventId, Context.ConnectionAborted);
        if (eventEntity is null)
        {
            throw new HubException("Event not found.");
        }

        if (eventEntity.Status == EventStatus.Cancelled || eventEntity.Status == EventStatus.Completed)
        {
            await _chatRepository.PurgeEventChatAsync(eventId, Context.ConnectionAborted);
            await _unitOfWork.SaveChangesAsync(Context.ConnectionAborted);
            throw new HubException("Event chat is no longer available.");
        }

        if (!await _chatRepository.IsEventChatExpiredAsync(eventId, DateTime.UtcNow, Context.ConnectionAborted))
        {
            return;
        }

        await _chatRepository.PurgeEventChatAsync(eventId, Context.ConnectionAborted);
        await _unitOfWork.SaveChangesAsync(Context.ConnectionAborted);
        throw new HubException("Event chat has expired and is no longer available.");
    }

    private async Task<bool> HasChatAccessAsync(Guid accountId, Guid eventId, CancellationToken cancellationToken)
    {
        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return false;
        }

        if (eventEntity.OwnerId == accountId)
        {
            return true;
        }

        return await _participationRepository.HasChatAccessParticipationAsync(accountId, eventId, cancellationToken);
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
