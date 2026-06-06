using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class EventLifecycleService : IEventLifecycleService
{
    private readonly IEventRepository _eventRepository;
    private readonly IChatRepository _chatRepository;
    private readonly IParticipationRepository _participationRepository;
    private readonly INotificationService _notificationService;
    private readonly IEventReputationService _reputationService;
    private readonly IUnitOfWork _unitOfWork;

    public EventLifecycleService(
        IEventRepository eventRepository,
        IChatRepository chatRepository,
        IParticipationRepository participationRepository,
        INotificationService notificationService,
        IEventReputationService reputationService,
        IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _chatRepository = chatRepository;
        _participationRepository = participationRepository;
        _notificationService = notificationService;
        _reputationService = reputationService;
        _unitOfWork = unitOfWork;
    }

    public async Task ProcessTransitionsAndNotifyAsync(CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;

        // NOTE: AsNoTracking is intentionally NOT used here.
        // EF change tracking is required so that status mutations are picked up by SaveChangesAsync.
        var candidates = await _eventRepository.GetPublishedAndOngoingAsync(cancellationToken);

        var changedToOngoing = new List<(Guid EventId, string Name)>();
        var hasChanges = false;

        foreach (var eventEntity in candidates)
        {
            var startUtc = ToUtcDateTime(eventEntity.Date, eventEntity.Time);
            var endUtc = startUtc.AddMinutes(Math.Max(1, eventEntity.DurationMinutes));

            if (eventEntity.Status == EventStatus.Published && startUtc <= nowUtc)
            {
                eventEntity.Status = EventStatus.Ongoing;
                hasChanges = true;
                changedToOngoing.Add((eventEntity.Id, eventEntity.Name));
            }
            else if (eventEntity.Status == EventStatus.Ongoing && endUtc <= nowUtc)
            {
                eventEntity.Status = EventStatus.Completed;
                // Set the automatic voting-close deadline: 24 hours after the event ended.
                eventEntity.VotingClosesAt = endUtc.AddHours(24);
                hasChanges = true;
            }
        }

        var purgedChatCount = await _chatRepository.PurgeExpiredEventChatsAsync(nowUtc, cancellationToken);
        var hasChatChanges = purgedChatCount > 0;

        if (!hasChanges && !hasChatChanges)
        {
            return;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        foreach (var changed in changedToOngoing)
        {
            var approvedAccounts = await _participationRepository.GetApprovedParticipantAccountIdsAsync(changed.EventId, cancellationToken);
            if (approvedAccounts.Count == 0)
            {
                continue;
            }

            var notifications = approvedAccounts
                .Select(accountId => new PushNotificationRequest(
                    accountId,
                    "Event Started",
                    $"'{changed.Name}' is now ongoing.",
                    new Dictionary<string, string>
                    {
                        ["eventId"] = changed.EventId.ToString(),
                        ["status"] = EventStatus.Ongoing.ToString()
                    }))
                .ToArray();

            await _notificationService.SendToAccountsAsync(notifications, cancellationToken);
        }
    }

    public async Task CloseExpiredVotingsAsync(CancellationToken cancellationToken)
    {
        var events = await _eventRepository.GetCompletedWithExpiredVotingAsync(cancellationToken);
        if (events.Count == 0)
        {
            return;
        }

        foreach (var @event in events)
        {
            // Calculate reputation deltas for all reviews submitted for this event.
            await _reputationService.CalculateEventReputationsAsync(@event.Id, cancellationToken);

            // Mark voting as closed and persist everything in a single transaction.
            @event.IsVotingClosed = true;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    private static DateTime ToUtcDateTime(DateOnly date, TimeOnly time)
    {
        var localDateTime = date.ToDateTime(time, DateTimeKind.Unspecified);
        
        TimeZoneInfo turkeyTimeZone;
        try
        {
            turkeyTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");
        }
        catch (TimeZoneNotFoundException)
        {
            turkeyTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
        }

        return TimeZoneInfo.ConvertTimeToUtc(localDateTime, turkeyTimeZone);
    }
}
