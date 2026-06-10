using Apptivity.Application.Interfaces;
using Apptivity.Application.Services;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Api.Tests;

public sealed class AdminServiceTests
{
    [Fact]
    public async Task DeleteEventAsync_ResolvesNonResolvedEventReports()
    {
        var eventId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var affectedPendingReport = new Report
        {
            Id = Guid.NewGuid(),
            TargetId = eventId,
            TargetType = ReportTargetType.Event,
            ReasonCategory = ReportReasonCategory.Spam,
            Description = "Pending report",
            Status = ReportStatus.Pending
        };
        var alreadyResolvedReport = new Report
        {
            Id = Guid.NewGuid(),
            TargetId = eventId,
            TargetType = ReportTargetType.Event,
            ReasonCategory = ReportReasonCategory.Spam,
            Description = "Resolved report",
            Status = ReportStatus.Resolved
        };
        var ignoredReport = new Report
        {
            Id = Guid.NewGuid(),
            TargetId = eventId,
            TargetType = ReportTargetType.Event,
            ReasonCategory = ReportReasonCategory.Spam,
            Description = "Ignored report",
            Status = ReportStatus.Ignored
        };
        var unrelatedPendingReport = new Report
        {
            Id = Guid.NewGuid(),
            TargetId = Guid.NewGuid(),
            TargetType = ReportTargetType.Event,
            ReasonCategory = ReportReasonCategory.Spam,
            Description = "Other pending report",
            Status = ReportStatus.Pending
        };
        var eventEntity = new Event
        {
            Id = eventId,
            OwnerId = Guid.NewGuid(),
            Owner = new Account
            {
                Id = Guid.NewGuid(),
                Username = "owner",
                Phone = "5551112233",
                Password = "hash",
                Type = AccountType.Organization
            },
            Name = "Reported event",
            Description = "desc",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Time = TimeOnly.FromDateTime(DateTime.UtcNow),
            Capacity = 10,
            RemainingParticipationCount = 10,
            Status = EventStatus.Published
        };

        var adminRepository = new FakeAdminRepository(eventEntity);
        var reportRepository = new FakeReportRepository(affectedPendingReport, alreadyResolvedReport, ignoredReport, unrelatedPendingReport);
        var unitOfWork = new FakeUnitOfWork();
        var service = CreateService(adminRepository, reportRepository, unitOfWork);

        var result = await service.DeleteEventAsync(
            eventId,
            new UserContext(adminId, AccountType.Admin),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(EventStatus.Cancelled, eventEntity.Status);
        Assert.True(eventEntity.IsDeleted);
        Assert.NotNull(eventEntity.DeletedAt);
        Assert.Equal(ReportStatus.Resolved, affectedPendingReport.Status);
        Assert.Equal(ReportStatus.Resolved, alreadyResolvedReport.Status);
        Assert.Equal(ReportStatus.Resolved, ignoredReport.Status);
        Assert.Equal(ReportStatus.Pending, unrelatedPendingReport.Status);
        Assert.Equal(1, unitOfWork.SaveChangesCallCount);
        Assert.Contains(adminRepository.AuditLogs, x => x.Action == "EventForceDeleted" && x.EntityId == eventId);
    }

    [Fact]
    public async Task IgnoreReportAsync_UpdatesPendingReportToIgnored()
    {
        var report = new Report
        {
            Id = Guid.NewGuid(),
            TargetId = Guid.NewGuid(),
            TargetType = ReportTargetType.Event,
            ReasonCategory = ReportReasonCategory.Spam,
            Description = "Pending report",
            Status = ReportStatus.Pending
        };

        var adminRepository = new FakeAdminRepository(eventEntity: null);
        var reportRepository = new FakeReportRepository(report);
        var unitOfWork = new FakeUnitOfWork();
        var service = CreateService(adminRepository, reportRepository, unitOfWork);

        var result = await service.IgnoreReportAsync(
            report.Id,
            new UserContext(Guid.NewGuid(), AccountType.Admin),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal(ReportStatus.Ignored, result.Data!.Status);
        Assert.Equal(ReportStatus.Ignored, report.Status);
        Assert.Equal(1, unitOfWork.SaveChangesCallCount);
        Assert.Contains(adminRepository.AuditLogs, x => x.Action == "ReportIgnored" && x.EntityId == report.Id);
    }

    [Fact]
    public async Task DeleteEventAsync_DoesNotTouchReports_WhenCallerIsNotAdmin()
    {
        var eventId = Guid.NewGuid();
        var pendingReport = new Report
        {
            Id = Guid.NewGuid(),
            TargetId = eventId,
            TargetType = ReportTargetType.Event,
            ReasonCategory = ReportReasonCategory.Spam,
            Description = "Pending report",
            Status = ReportStatus.Pending
        };
        var eventEntity = new Event
        {
            Id = eventId,
            OwnerId = Guid.NewGuid(),
            Owner = new Account
            {
                Id = Guid.NewGuid(),
                Username = "owner",
                Phone = "5551112233",
                Password = "hash",
                Type = AccountType.Organization
            },
            Name = "Reported event",
            Description = "desc",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Time = TimeOnly.FromDateTime(DateTime.UtcNow),
            Capacity = 10,
            RemainingParticipationCount = 10,
            Status = EventStatus.Published
        };

        var adminRepository = new FakeAdminRepository(eventEntity);
        var reportRepository = new FakeReportRepository(pendingReport);
        var unitOfWork = new FakeUnitOfWork();
        var service = CreateService(adminRepository, reportRepository, unitOfWork);

        var result = await service.DeleteEventAsync(
            eventId,
            new UserContext(Guid.NewGuid(), AccountType.Individual),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(EventStatus.Published, eventEntity.Status);
        Assert.False(eventEntity.IsDeleted);
        Assert.Equal(ReportStatus.Pending, pendingReport.Status);
        Assert.Equal(0, unitOfWork.SaveChangesCallCount);
        Assert.Empty(adminRepository.AuditLogs);
    }

    private static AdminService CreateService(
        FakeAdminRepository adminRepository,
        FakeReportRepository reportRepository,
        FakeUnitOfWork unitOfWork)
    {
        return new AdminService(
            adminRepository,
            new FakeUserRepository(),
            new FakeReputationRepository(),
            new FakePasswordHasher(),
            reportRepository,
            new FakeChatReportRepository(),
            unitOfWork);
    }

    private sealed class FakeAdminRepository : IAdminRepository
    {
        private readonly Event? _event;

        public FakeAdminRepository(Event? eventEntity)
        {
            _event = eventEntity;
        }

        public List<AuditLog> AuditLogs { get; } = new();

        public Task AddAuditLogAsync(AuditLog auditLog, CancellationToken cancellationToken)
        {
            AuditLogs.Add(auditLog);
            return Task.CompletedTask;
        }

        public Task<int> CountAccountsAsync(CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<int> CountActiveEventsAsync(CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<int> CountRecentParticipationsAsync(DateTime fromUtc, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<(IReadOnlyCollection<AdminAccountListItem> Items, int TotalCount)> GetAccountsAsync(AdminAccountFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Club?> GetClubByIdAsync(Guid clubId, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<(IReadOnlyCollection<Event> Items, int TotalCount)> GetEventsAsync(EventStatus? status, int pageNumber, int pageSize, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<(IReadOnlyCollection<AdminReportListItem> Items, int TotalCount)> GetReportsAsync(AdminReportFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken) => throw new NotImplementedException();

        public Task<Event?> GetEventByIdAsync(Guid eventId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_event?.Id == eventId ? _event : null);
        }
    }

    private sealed class FakeReportRepository : IReportRepository
    {
        private readonly List<Report> _reports;

        public FakeReportRepository(params Report[] reports)
        {
            _reports = reports.ToList();
        }

        public Task AddAsync(Report report, CancellationToken cancellationToken)
        {
            _reports.Add(report);
            return Task.CompletedTask;
        }

        public Task<Report?> GetByIdAsync(Guid reportId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_reports.FirstOrDefault(x => x.Id == reportId));
        }

        public Task<IReadOnlyCollection<Report>> GetNonResolvedByTargetAsync(ReportTargetType targetType, Guid targetId, CancellationToken cancellationToken)
        {
            IReadOnlyCollection<Report> reports = _reports
                .Where(x => x.TargetType == targetType && x.TargetId == targetId && x.Status != ReportStatus.Resolved)
                .ToArray();

            return Task.FromResult(reports);
        }
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

    private sealed class FakeUserRepository : IUserRepository
    {
        public Task AddAccountAsync(Account account, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task AddClubProfileAsync(Club club, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task AddUserProfileAsync(User user, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Account?> GetAccountByEmailAsync(string email, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Account?> GetAccountByIdAsync(Guid accountId, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Account?> GetAccountByIdWithInterestsAsync(Guid accountId, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Account?> GetAccountByIdWithProfilesAsync(Guid accountId, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Account?> GetAccountByPhoneAsync(string phone, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Account?> GetAccountByUsernameAsync(string username, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<IReadOnlyCollection<Account>> GetExpiredSuspendedAccountsAsync(DateTime nowUtc, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyCollection<Account>>(Array.Empty<Account>());
        public Task<(IReadOnlyCollection<Account> Items, int TotalCount)> SearchProfilesAsync(ProfileSearchFilter filter, int pageNumber, int pageSize, CancellationToken cancellationToken) => throw new NotImplementedException();
    }

    private sealed class FakeReputationRepository : IReputationRepository
    {
        public Task AddClubRatingAsync(ClubRating clubRating, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task AddReputationAsync(Reputation reputation, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<ClubRating?> GetClubRatingByAccountIdAsync(Guid accountId, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Dictionary<Guid, Reputation>> GetByAccountIdsAsync(IReadOnlyCollection<Guid> accountIds, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<Reputation?> GetByAccountIdAsync(Guid accountId, CancellationToken cancellationToken) => throw new NotImplementedException();
    }

    private sealed class FakePasswordHasher : IPasswordHasher
    {
        public string Hash(string password) => password;
        public bool Verify(string password, string hash) => password == hash;
    }

    private sealed class FakeChatReportRepository : IChatReportRepository
    {
        public Task AddAsync(ChatReport chatReport, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<ChatReport?> GetByIdWithMessagesAsync(Guid id, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<(IReadOnlyCollection<ChatReport> Items, int TotalCount)> GetListAsync(ChatReportFilter filter, CancellationToken cancellationToken) => throw new NotImplementedException();
    }
}
