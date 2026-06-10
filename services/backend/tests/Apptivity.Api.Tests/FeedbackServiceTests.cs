using Apptivity.Application.Interfaces;
using Apptivity.Application.Services;
using Apptivity.Domain.Entities;

namespace Apptivity.Api.Tests;

public sealed class FeedbackServiceTests
{
    [Fact]
    public async Task SubmitAsync_PersistsFeedback_WhenPayloadIsValid()
    {
        var repository = new FakeFeedbackRepository();
        var unitOfWork = new FakeUnitOfWork();
        var service = new FeedbackService(repository, unitOfWork);

        var result = await service.SubmitAsync(
            new Application.Contracts.Feedback.SubmitFeedbackRequest(
                "  Ali  ",
                "  Veli  ",
                "  ali@example.com  ",
                "  Uygulama gayet iyi ilerliyor.  "),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(repository.Items);
        Assert.Equal("Ali", repository.Items[0].FirstName);
        Assert.Equal("Veli", repository.Items[0].LastName);
        Assert.Equal("ali@example.com", repository.Items[0].Email);
        Assert.Equal("Uygulama gayet iyi ilerliyor.", repository.Items[0].Message);
        Assert.Equal(1, unitOfWork.SaveChangesCallCount);
    }

    [Fact]
    public async Task SubmitAsync_ReturnsValidationError_WhenRequiredFieldsAreMissing()
    {
        var repository = new FakeFeedbackRepository();
        var unitOfWork = new FakeUnitOfWork();
        var service = new FeedbackService(repository, unitOfWork);

        var result = await service.SubmitAsync(
            new Application.Contracts.Feedback.SubmitFeedbackRequest(
                "",
                "Yilmaz",
                null,
                ""),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(repository.Items);
        Assert.Equal(0, unitOfWork.SaveChangesCallCount);
    }

    private sealed class FakeFeedbackRepository : IFeedbackRepository
    {
        public List<FeedbackSubmission> Items { get; } = new();

        public Task AddAsync(FeedbackSubmission submission, CancellationToken cancellationToken)
        {
            Items.Add(submission);
            return Task.CompletedTask;
        }

        public Task<(IReadOnlyCollection<FeedbackSubmission> Items, int TotalCount)> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken)
        {
            return Task.FromResult(((IReadOnlyCollection<FeedbackSubmission>)Items, Items.Count));
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
}
