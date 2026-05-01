using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class EventLifecycleService : IEventLifecycleService
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipationRepository _participationRepository;
    private readonly INotificationService _notificationService;
    private readonly IUnitOfWork _unitOfWork;

    public EventLifecycleService(
        IEventRepository eventRepository,
        IParticipationRepository participationRepository,
        INotificationService notificationService,
        IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _participationRepository = participationRepository;
        _notificationService = notificationService;
        _unitOfWork = unitOfWork;
    }

    public async Task ProcessTransitionsAndNotifyAsync(CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
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
                hasChanges = true;
            }
        }

        if (!hasChanges)
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

    private static DateTime ToUtcDateTime(DateOnly date, TimeOnly time)
    {
        var localDateTime = date.ToDateTime(time, DateTimeKind.Utc);
        return DateTime.SpecifyKind(localDateTime, DateTimeKind.Utc);
    }
}
