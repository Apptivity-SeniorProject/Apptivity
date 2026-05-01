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
    private readonly IParticipationRepository _participationRepository;
    private readonly IChatRepository _chatRepository;
    private readonly INotificationService _notificationService;
    private readonly IUnitOfWork _unitOfWork;

    public ChatHub(
        IParticipationRepository participationRepository,
        IChatRepository chatRepository,
        INotificationService notificationService,
        IUnitOfWork unitOfWork)
    {
        _participationRepository = participationRepository;
        _chatRepository = chatRepository;
        _notificationService = notificationService;
        _unitOfWork = unitOfWork;
    }

    public async Task JoinEventChat(Guid eventId)
    {
        var userContext = GetCurrentUserContext();
        var hasAccess = await _participationRepository.HasApprovedParticipationAsync(userContext.AccountId, eventId, Context.ConnectionAborted);
        if (!hasAccess)
        {
            throw new HubException("Only approved participants can join event chat.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, BuildEventGroup(eventId), Context.ConnectionAborted);
    }

    public async Task LeaveEventChat(Guid eventId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, BuildEventGroup(eventId), Context.ConnectionAborted);
    }

    public async Task SendMessage(Guid eventId, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new HubException("Message content cannot be empty.");
        }

        var userContext = GetCurrentUserContext();
        var accountId = userContext.AccountId;
        var hasAccess = await _participationRepository.HasApprovedParticipationAsync(accountId, eventId, Context.ConnectionAborted);
        if (!hasAccess)
        {
            throw new HubException("Only approved participants can send messages.");
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

        var payload = new
        {
            messageId = message.Id,
            eventId,
            senderAccountId = accountId,
            content = message.Content,
            sentAtUtc = message.CreatedAt
        };

        await Clients.Group(BuildEventGroup(eventId)).SendAsync("ReceiveMessage", payload, Context.ConnectionAborted);

        var approvedAccounts = await _participationRepository.GetApprovedParticipantAccountIdsAsync(eventId, Context.ConnectionAborted);
        var targetAccounts = approvedAccounts.Where(x => x != accountId).Distinct().ToArray();

        if (targetAccounts.Length > 0)
        {
            var notifications = targetAccounts
                .Select(targetAccountId => new PushNotificationRequest(
                    targetAccountId,
                    "New Message",
                    "A new message has been posted in your event chat.",
                    new Dictionary<string, string>
                    {
                        ["eventId"] = eventId.ToString(),
                        ["messageId"] = message.Id.ToString()
                    }))
                .ToArray();

            await _notificationService.SendToAccountsAsync(notifications, Context.ConnectionAborted);
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
}
