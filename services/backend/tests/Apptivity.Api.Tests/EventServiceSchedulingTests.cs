using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Interfaces;
using Apptivity.Application.Services;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Api.Tests;

public sealed class EventServiceSchedulingTests
{
    [Fact]
    public async Task CreateEventAsync_ReturnsFailure_WhenOwnerAlreadyHasEventAtSameDateAndTime()
    {
        var ownerId = Guid.NewGuid();
        var eventRepository = new FakeEventRepository
        {
            HasScheduleConflictResult = true
        };
        var unitOfWork = new FakeUnitOfWork();
        var service = CreateService(eventRepository, unitOfWork);

        var request = CreateRequest();

        var result = await service.CreateEventAsync(
            request,
            new UserContext(ownerId, AccountType.Organization),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.EventInvalidState, Assert.Single(result.Errors).Code);
        Assert.Equal("You already have another event at the same date and time.", result.Errors[0].Message);
        Assert.False(eventRepository.AddCalled);
        Assert.Equal(0, unitOfWork.SaveChangesCallCount);
    }

    [Fact]
    public async Task UpdateEventAsync_ReturnsFailure_WhenOwnerAlreadyHasAnotherEventAtSameDateAndTime()
    {
        var ownerId = Guid.NewGuid();
        var currentEventId = Guid.NewGuid();
        var existingEvent = new Event
        {
            Id = currentEventId,
            OwnerId = ownerId,
            Name = "Current Event",
            Description = "Current Event Description",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
            Time = new TimeOnly(10, 0),
            DurationMinutes = 120,
            Capacity = 20,
            RemainingParticipationCount = 20,
            Price = 0,
            LocationData = "{\"city\":\"Istanbul\",\"fullAddress\":\"Kadikoy\",\"lat\":41.01,\"lng\":29.00}",
            Status = EventStatus.PendingApproval
        };

        var eventRepository = new FakeEventRepository
        {
            EventById = existingEvent,
            HasScheduleConflictResult = true
        };
        var unitOfWork = new FakeUnitOfWork();
        var service = CreateService(eventRepository, unitOfWork);
        var request = new UpdateEventRequest(
            "Updated Event",
            "Updated Description",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
            new TimeOnly(12, 0),
            90,
            25,
            "{\"city\":\"Istanbul\",\"fullAddress\":\"Besiktas\",\"lat\":41.04,\"lng\":29.01}");

        var result = await service.UpdateEventAsync(
            currentEventId,
            request,
            new UserContext(ownerId, AccountType.Organization),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.EventInvalidState, Assert.Single(result.Errors).Code);
        Assert.Equal("You already have another event at the same date and time.", result.Errors[0].Message);
        Assert.Equal("Current Event", existingEvent.Name);
        Assert.Equal(0, unitOfWork.SaveChangesCallCount);
        Assert.Equal(currentEventId, eventRepository.LastConflictExcludeEventId);
    }

    private static EventService CreateService(FakeEventRepository eventRepository, FakeUnitOfWork unitOfWork)
    {
        return new EventService(
            eventRepository,
            new FakeEventBookmarkRepository(),
            new FakeParticipationRepository(),
            new FakeUserRepository(),
            new FakeReviewRepository(),
            new FakeTagRepository(),
            new FakeTagPredictorService(),
            new FakeTagPredictionCacheService(),
            null!,
            new FakeDailyRecommendationRepository(),
            new FakeRecommendationTransactionManager(),
            new FakeRecommendationFeatureFlags(),
            new FakeEventLifecycleService(),
            new FakeNotificationService(),
            unitOfWork);
    }

    private static CreateEventRequest CreateRequest()
    {
        return new CreateEventRequest(
            "Weekend Run",
            "Morning social run event.",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
            new TimeOnly(12, 0),
            90,
            20,
            0,
            "{\"city\":\"Istanbul\",\"fullAddress\":\"Kadikoy\",\"lat\":41.01,\"lng\":29.00}",
            null,
            null);
    }

    private sealed class FakeEventRepository : IEventRepository
    {
        public bool HasScheduleConflictResult { get; set; }
        public bool AddCalled { get; private set; }
        public Guid? LastConflictExcludeEventId { get; private set; }
        public Event? EventById { get; set; }

        public Task<Event?> GetByIdAsync(Guid eventId, CancellationToken cancellationToken)
            => Task.FromResult(EventById);

        public Task<Event?> GetByIdWithOwnerAsync(Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<int> CountByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByOwnerIdAsync(Guid ownerId, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<bool> HasScheduleConflictAsync(Guid ownerId, DateOnly date, TimeOnly time, Guid? excludeEventId, CancellationToken cancellationToken)
        {
            LastConflictExcludeEventId = excludeEventId;
            return Task.FromResult(HasScheduleConflictResult);
        }

        public Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByApprovedParticipantAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Event?> GetWithParticipantsAsync(Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<Event>> GetPublishedAndOngoingAsync(CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<(IReadOnlyCollection<Event> Items, int TotalCount)> SearchAsync(EventSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetRecommendedByTagIdsAsync(IReadOnlyCollection<Guid> tagIds, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<string>> GetApprovedHistoryTagNamesAsync(Guid accountId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<Event>> GetSimilarEventsAsync(Guid eventId, Guid primaryTagId, int count, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public IQueryable<Event> Query()
            => Array.Empty<Event>().AsQueryable();

        public Task AddAsync(Event entity, CancellationToken cancellationToken)
        {
            AddCalled = true;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyCollection<Event>> GetCompletedWithExpiredVotingAsync(CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    private sealed class FakeEventBookmarkRepository : IEventBookmarkRepository
    {
        public Task<EventBookmark?> GetBookmarkAsync(Guid accountId, Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<(IReadOnlyCollection<EventBookmark> Items, int TotalCount)> GetByAccountIdAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task AddAsync(EventBookmark bookmark, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public void Remove(EventBookmark bookmark)
            => throw new NotSupportedException();

        public Task<bool> HasBookmarkedAsync(Guid accountId, Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    private sealed class FakeParticipationRepository : IParticipationRepository
    {
        public Task<Participation?> GetByIdAsync(Guid participationId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Participation?> GetByUserAndEventAsync(Guid userId, Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Participation?> GetByEventAndUserAsync(Guid eventId, Guid userId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<(IReadOnlyCollection<Participation> Items, int TotalCount)> GetByUserAsync(Guid userId, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<int> CountApprovedByEventAsync(Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<int> CountApprovedByUserAsync(Guid userId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<bool> HasApprovedParticipationAsync(Guid userId, Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<bool> HasChatAccessParticipationAsync(Guid userId, Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<Guid>> GetApprovedParticipantAccountIdsAsync(Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<Guid>> GetChatParticipantAccountIdsAsync(Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task AddAsync(Participation entity, CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    private sealed class FakeUserRepository : IUserRepository
    {
        public Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByIdWithProfilesAsync(Guid accountId, CancellationToken cancellationToken)
            => Task.FromResult<Account?>(null);

        public Task<(IReadOnlyCollection<Account> Items, int TotalCount)> SearchProfilesAsync(ProfileSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByEmailAsync(string email, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByPhoneAsync(string phone, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByUsernameAsync(string username, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByIdWithInterestsAsync(Guid accountId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<Account>> GetExpiredSuspendedAccountsAsync(DateTime nowUtc, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyCollection<Account>>(Array.Empty<Account>());

        public Task AddAccountAsync(Account account, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task AddUserProfileAsync(User user, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task AddClubProfileAsync(Club club, CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    private sealed class FakeReviewRepository : IReviewRepository
    {
        public Task AddAsync(Review review, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Review?> GetByIdAsync(Guid reviewId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Review?> GetDuplicateAsync(Guid reviewerId, Guid reviewedId, Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<List<Review>> GetByReviewedAccountIdAsync(Guid accountId, int skip, int take, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<int> CountByReviewedAccountIdAsync(Guid accountId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<int> CountReviewsForUserInEventAsync(Guid reviewedUserId, Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<List<Review>> GetReviewsByEventIdAsync(Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<double?> GetAverageRatingByReviewedAccountIdAsync(Guid accountId, CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    private sealed class FakeTagRepository : ITagRepository
    {
        public Task<IReadOnlyCollection<Tag>> GetActiveAsync(CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<Tag>> GetActiveByIdsAsync(IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyCollection<Tag>>(Array.Empty<Tag>());

        public Task<Tag?> GetByIdAsync(Guid tagId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Tag?> GetByIdWithRelationsAsync(Guid tagId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<bool> ExistsByNameAsync(string name, Guid? exceptId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task AddAsync(Tag tag, CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    private sealed class FakeTagPredictorService : ITagPredictorService
    {
        public Task<TagPredictionResult?> PredictAsync(TagPredictionInput input, CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    private sealed class FakeTagPredictionCacheService : ITagPredictionCacheService
    {
        public Task<TagPredictionResult?> GetAsync(Guid accountId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task SetAsync(Guid accountId, TagPredictionResult prediction, CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    private sealed class FakeDailyRecommendationRepository : IDailyRecommendationRepository
    {
        public Task AcquireUserRecommendationLockAsync(Guid userId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<DailyRecommendationPlan?> GetPlanForDayAsync(Guid userId, string dayKey, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<DailyRecommendationCursor?> GetCursorForUpdateAsync(Guid planId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task ResetPlanStateAsync(Guid planId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task UpdateCursorStateAsync(Guid planId, int currentTagOrder, bool isDepleted, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task AddServedEventAsync(Guid planId, Guid eventId, int tagOrder, DateTime servedAtUtc, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<DailyRecommendationServedEvent>> GetRecentServedEventsAsync(Guid userId, DateTime sinceUtc, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<string?> GetMostFrequentServedClubCityAsync(Guid userId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task AddPlanAsync(DailyRecommendationPlan plan, CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    private sealed class FakeRecommendationTransactionManager : IRecommendationTransactionManager
    {
        public Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken cancellationToken)
            => action(cancellationToken);
    }

    private sealed class FakeRecommendationFeatureFlags : IRecommendationFeatureFlags
    {
        public bool DisableDailyLlmPlanReuseForTesting => false;
    }

    private sealed class FakeEventLifecycleService : IEventLifecycleService
    {
        public Task ProcessTransitionsAndNotifyAsync(CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task CloseExpiredVotingsAsync(CancellationToken cancellationToken)
            => Task.CompletedTask;
    }

    private sealed class FakeNotificationService : INotificationService
    {
        public Task SendToAccountAsync(PushNotificationRequest request, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task SendToAccountsAsync(IReadOnlyCollection<PushNotificationRequest> requests, CancellationToken cancellationToken)
            => Task.CompletedTask;
    }

    private sealed class FakeUnitOfWork : IUnitOfWork
    {
        public int SaveChangesCallCount { get; private set; }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            SaveChangesCallCount++;
            return Task.FromResult(1);
        }
    }
}
