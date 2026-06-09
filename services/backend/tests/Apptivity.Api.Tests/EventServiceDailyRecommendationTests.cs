using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Interfaces;
using Apptivity.Application.Services;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Api.Tests;

public sealed class EventServiceDailyRecommendationTests
{
    [Fact]
    public async Task GetDailyRecommendedNextAsync_FillsMissingSlotsFromHistoryBeforeDeterministicTags()
    {
        var accountId = Guid.Parse("10000000-0000-0000-0000-000000000001");
        var profileTagId = Guid.Parse("20000000-0000-0000-0000-000000000010");
        var historyTagId = Guid.Parse("F0000000-0000-0000-0000-000000000010");
        var otherTag1Id = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var otherTag2Id = Guid.Parse("00000000-0000-0000-0000-000000000002");
        var otherTag3Id = Guid.Parse("00000000-0000-0000-0000-000000000003");
        var otherTag4Id = Guid.Parse("00000000-0000-0000-0000-000000000004");

        var profileTag = CreateTag(profileTagId, "Profile");
        var historyTag = CreateTag(historyTagId, "History");
        var otherTag1 = CreateTag(otherTag1Id, "Art");
        var otherTag2 = CreateTag(otherTag2Id, "Gaming");
        var otherTag3 = CreateTag(otherTag3Id, "Travel");
        var otherTag4 = CreateTag(otherTag4Id, "Music");

        var account = new Account
        {
            Id = accountId,
            Type = AccountType.Individual,
            Username = "daily-user",
            Phone = "+905551112233",
            InterestTags = new List<Tag> { profileTag }
        };

        var eventRepository = new FakeEventRepository
        {
            ApprovedHistoryTagNames = new[] { "History" },
            PublishedEvents = new[]
            {
                CreateEvent(accountId, profileTag, 1),
                CreateEvent(accountId, historyTag, 2),
                CreateEvent(accountId, otherTag1, 3),
                CreateEvent(accountId, otherTag2, 4),
                CreateEvent(accountId, otherTag3, 5),
                CreateEvent(accountId, otherTag4, 6),
            }
        };

        var dailyRecommendationRepository = new FakeDailyRecommendationRepository();
        var service = CreateService(
            eventRepository,
            new FakeUserRepository(account),
            new FakeTagRepository(profileTag, historyTag, otherTag1, otherTag2, otherTag3, otherTag4),
            new FakeTagPredictorService(null),
            dailyRecommendationRepository);

        var result = await service.GetDailyRecommendedNextAsync(
            new UserContext(accountId, AccountType.Individual),
            new DailyRecommendedNextRequest(null, null, null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("served", result.Data!.Status);

        var plan = Assert.Single(dailyRecommendationRepository.AddedPlans);
        var orderedTags = plan.Tags.OrderBy(x => x.TagOrder).ToArray();

        Assert.Equal(5, orderedTags.Length);
        Assert.Equal(profileTagId, orderedTags[0].TagId);
        Assert.Equal(DailyRecommendationTagSource.Profile, orderedTags[0].Source);
        Assert.Equal(historyTagId, orderedTags[1].TagId);
        Assert.Equal(DailyRecommendationTagSource.History, orderedTags[1].Source);
        Assert.All(orderedTags.Skip(2), tag => Assert.Equal(DailyRecommendationTagSource.Deterministic, tag.Source));
    }

    [Fact]
    public async Task GetDailyRecommendedNextAsync_AdvancesToNextTagOrder_OnSequentialCalls()
    {
        var accountId = Guid.Parse("10000000-0000-0000-0000-000000000002");
        var profileTagId = Guid.Parse("30000000-0000-0000-0000-000000000010");
        var historyTagId = Guid.Parse("40000000-0000-0000-0000-000000000010");

        var profileTag = CreateTag(profileTagId, "Profile");
        var historyTag = CreateTag(historyTagId, "History");

        var account = new Account
        {
            Id = accountId,
            Type = AccountType.Individual,
            Username = "sequential-user",
            Phone = "+905551112244",
            InterestTags = new List<Tag> { profileTag }
        };

        var eventRepository = new FakeEventRepository
        {
            ApprovedHistoryTagNames = new[] { "History" },
            PublishedEvents = new[]
            {
                CreateEvent(accountId, profileTag, 1, "Profile Event 1"),
                CreateEvent(accountId, profileTag, 2, "Profile Event 2"),
                CreateEvent(accountId, historyTag, 3, "History Event 1"),
            }
        };

        var dailyRecommendationRepository = new FakeDailyRecommendationRepository();
        var service = CreateService(
            eventRepository,
            new FakeUserRepository(account),
            new FakeTagRepository(profileTag, historyTag),
            new FakeTagPredictorService(null),
            dailyRecommendationRepository);

        var firstResult = await service.GetDailyRecommendedNextAsync(
            new UserContext(accountId, AccountType.Individual),
            new DailyRecommendedNextRequest(null, null, null),
            CancellationToken.None);

        var secondResult = await service.GetDailyRecommendedNextAsync(
            new UserContext(accountId, AccountType.Individual),
            new DailyRecommendedNextRequest(null, null, null),
            CancellationToken.None);

        Assert.True(firstResult.IsSuccess);
        Assert.True(secondResult.IsSuccess);
        Assert.Equal("Profile Event 1", firstResult.Data!.Event!.Name);
        Assert.Equal(1, firstResult.Data.CurrentTagOrder);
        Assert.Equal(1, firstResult.Data.RemainingTagCount);
        Assert.Equal("History Event 1", secondResult.Data!.Event!.Name);
        Assert.Equal(2, secondResult.Data.CurrentTagOrder);
        Assert.Equal(2, secondResult.Data.RemainingTagCount);
    }

    [Fact]
    public async Task GetDailyRecommendedNextAsync_CanServeMoreThanFiveRecommendations_ByCyclingAcrossPlanTags()
    {
        var accountId = Guid.Parse("10000000-0000-0000-0000-000000000003");
        var profileTagId = Guid.Parse("50000000-0000-0000-0000-000000000010");
        var historyTagId = Guid.Parse("60000000-0000-0000-0000-000000000010");

        var profileTag = CreateTag(profileTagId, "Profile");
        var historyTag = CreateTag(historyTagId, "History");

        var account = new Account
        {
            Id = accountId,
            Type = AccountType.Individual,
            Username = "long-sequence-user",
            Phone = "+905551112255",
            InterestTags = new List<Tag> { profileTag }
        };

        var eventRepository = new FakeEventRepository
        {
            ApprovedHistoryTagNames = new[] { "History" },
            PublishedEvents = new[]
            {
                CreateEvent(accountId, profileTag, 1, "Profile Event 1"),
                CreateEvent(accountId, historyTag, 2, "History Event 1"),
                CreateEvent(accountId, profileTag, 3, "Profile Event 2"),
                CreateEvent(accountId, historyTag, 4, "History Event 2"),
                CreateEvent(accountId, profileTag, 5, "Profile Event 3"),
                CreateEvent(accountId, historyTag, 6, "History Event 3"),
            }
        };

        var dailyRecommendationRepository = new FakeDailyRecommendationRepository();
        var service = CreateService(
            eventRepository,
            new FakeUserRepository(account),
            new FakeTagRepository(profileTag, historyTag),
            new FakeTagPredictorService(null),
            dailyRecommendationRepository);

        var servedNames = new List<string>();
        for (var i = 0; i < 6; i++)
        {
            var result = await service.GetDailyRecommendedNextAsync(
                new UserContext(accountId, AccountType.Individual),
                new DailyRecommendedNextRequest(null, null, null),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal("served", result.Data!.Status);
            servedNames.Add(result.Data.Event!.Name);
        }

        Assert.Equal(
            new[]
            {
                "Profile Event 1",
                "History Event 1",
                "Profile Event 2",
                "History Event 2",
                "Profile Event 3",
                "History Event 3"
            },
            servedNames);
    }

    private static Tag CreateTag(Guid id, string name)
    {
        return new Tag
        {
            Id = id,
            Name = name,
            IsActive = true
        };
    }

    private static Event CreateEvent(Guid ownerId, Tag tag, int dayOffset, string? name = null)
    {
        return new Event
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            Owner = new Account
            {
                Id = ownerId,
                Type = AccountType.Organization,
                Username = $"club-{dayOffset}",
                Phone = $"+9000000000{dayOffset}"
            },
            Name = name ?? $"{tag.Name} Event",
            Description = $"{tag.Name} description",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(dayOffset)),
            Time = new TimeOnly(18, 0),
            DurationMinutes = 90,
            Capacity = 20,
            RemainingParticipationCount = 20,
            Price = 0,
            Status = EventStatus.Published,
            Tags = new List<Tag> { tag },
            PrimaryTag = tag,
            PrimaryTagId = tag.Id,
            LocationData = "{\"city\":\"Istanbul\"}"
        };
    }

    private static EventService CreateService(
        FakeEventRepository eventRepository,
        FakeUserRepository userRepository,
        FakeTagRepository tagRepository,
        FakeTagPredictorService tagPredictorService,
        FakeDailyRecommendationRepository dailyRecommendationRepository)
    {
        return new EventService(
            eventRepository,
            new FakeEventBookmarkRepository(),
            new FakeParticipationRepository(),
            userRepository,
            new FakeReviewRepository(),
            tagRepository,
            tagPredictorService,
            new FakeTagPredictionCacheService(),
            dailyRecommendationRepository,
            new FakeRecommendationTransactionManager(),
            new FakeRecommendationFeatureFlags(),
            new FakeEventLifecycleService(),
            new FakeNotificationService(),
            new FakeUnitOfWork());
    }

    private sealed class FakeEventRepository : IEventRepository
    {
        public IReadOnlyCollection<string> ApprovedHistoryTagNames { get; init; } = Array.Empty<string>();
        public IReadOnlyCollection<Event> PublishedEvents { get; init; } = Array.Empty<Event>();

        public Task<Event?> GetByIdAsync(Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Event?> GetByIdWithOwnerAsync(Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<int> CountByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByOwnerIdAsync(Guid ownerId, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<bool> HasScheduleConflictAsync(Guid ownerId, DateOnly date, TimeOnly time, Guid? excludeEventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetByApprovedParticipantAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Event?> GetWithParticipantsAsync(Guid eventId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<Event>> GetPublishedAndOngoingAsync(CancellationToken cancellationToken)
            => Task.FromResult(PublishedEvents);

        public Task<(IReadOnlyCollection<Event> Items, int TotalCount)> SearchAsync(EventSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetRecommendedByTagIdsAsync(IReadOnlyCollection<Guid> tagIds, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<IReadOnlyCollection<string>> GetApprovedHistoryTagNamesAsync(Guid accountId, CancellationToken cancellationToken)
            => Task.FromResult(ApprovedHistoryTagNames);

        public Task<IReadOnlyCollection<Event>> GetSimilarEventsAsync(Guid eventId, Guid primaryTagId, int count, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public IQueryable<Event> Query()
            => PublishedEvents.AsQueryable();

        public Task AddAsync(Event entity, CancellationToken cancellationToken)
            => throw new NotSupportedException();

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
        private readonly Account _account;

        public FakeUserRepository(Account account)
        {
            _account = account;
        }

        public Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByIdWithProfilesAsync(Guid accountId, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<(IReadOnlyCollection<Account> Items, int TotalCount)> SearchProfilesAsync(ProfileSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByEmailAsync(string email, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByPhoneAsync(string phone, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByUsernameAsync(string username, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Account?> GetAccountByIdWithInterestsAsync(Guid accountId, CancellationToken cancellationToken)
            => Task.FromResult<Account?>(_account);

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
    }

    private sealed class FakeTagRepository : ITagRepository
    {
        private readonly IReadOnlyCollection<Tag> _tags;

        public FakeTagRepository(params Tag[] tags)
        {
            _tags = tags;
        }

        public Task<IReadOnlyCollection<Tag>> GetActiveAsync(CancellationToken cancellationToken)
            => Task.FromResult(_tags);

        public Task<IReadOnlyCollection<Tag>> GetActiveByIdsAsync(IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyCollection<Tag>>(_tags.Where(x => tagIds.Contains(x.Id)).ToArray());

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
        private readonly TagPredictionResult? _result;

        public FakeTagPredictorService(TagPredictionResult? result)
        {
            _result = result;
        }

        public Task<TagPredictionResult?> PredictAsync(TagPredictionInput input, CancellationToken cancellationToken)
            => Task.FromResult(_result);
    }

    private sealed class FakeTagPredictionCacheService : ITagPredictionCacheService
    {
        public Task<TagPredictionResult?> GetAsync(Guid accountId, CancellationToken cancellationToken)
            => Task.FromResult<TagPredictionResult?>(null);

        public Task SetAsync(Guid accountId, TagPredictionResult prediction, CancellationToken cancellationToken)
            => Task.CompletedTask;
    }

    private sealed class FakeDailyRecommendationRepository : IDailyRecommendationRepository
    {
        public List<DailyRecommendationPlan> AddedPlans { get; } = new();
        private DailyRecommendationPlan? _storedPlan;

        public Task AcquireUserRecommendationLockAsync(Guid userId, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<DailyRecommendationPlan?> GetPlanForDayAsync(Guid userId, string dayKey, CancellationToken cancellationToken)
            => Task.FromResult(_storedPlan is not null && _storedPlan.UserId == userId && _storedPlan.DayKey == dayKey ? _storedPlan : null);

        public Task<DailyRecommendationCursor?> GetCursorForUpdateAsync(Guid planId, CancellationToken cancellationToken)
            => Task.FromResult(_storedPlan?.Id == planId ? _storedPlan.Cursor : null);

        public Task ResetPlanStateAsync(Guid planId, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task UpdateCursorStateAsync(Guid planId, int currentTagOrder, bool isDepleted, CancellationToken cancellationToken)
        {
            if (_storedPlan?.Id == planId && _storedPlan.Cursor is not null)
            {
                _storedPlan.Cursor.CurrentTagOrder = currentTagOrder;
                _storedPlan.Cursor.IsDepleted = isDepleted;
            }

            return Task.CompletedTask;
        }

        public Task AddServedEventAsync(Guid planId, Guid eventId, int tagOrder, DateTime servedAtUtc, CancellationToken cancellationToken)
        {
            if (_storedPlan?.Id == planId)
            {
                _storedPlan.ServedEvents.Add(new DailyRecommendationServedEvent
                {
                    PlanId = planId,
                    EventId = eventId,
                    TagOrder = tagOrder,
                    ServedAtUtc = servedAtUtc
                });
            }

            return Task.CompletedTask;
        }

        public Task<IReadOnlyCollection<DailyRecommendationServedEvent>> GetRecentServedEventsAsync(Guid userId, DateTime sinceUtc, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyCollection<DailyRecommendationServedEvent>>(Array.Empty<DailyRecommendationServedEvent>());

        public Task<string?> GetMostFrequentServedClubCityAsync(Guid userId, CancellationToken cancellationToken)
            => Task.FromResult<string?>(null);

        public Task AddPlanAsync(DailyRecommendationPlan plan, CancellationToken cancellationToken)
        {
            AddedPlans.Add(plan);
            _storedPlan = plan;
            return Task.CompletedTask;
        }
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
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
            => Task.FromResult(1);
    }
}
