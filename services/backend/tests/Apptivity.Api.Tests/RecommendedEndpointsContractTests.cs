using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Encodings.Web;

namespace Apptivity.Api.Tests;

public sealed class RecommendedEndpointsContractTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public RecommendedEndpointsContractTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PostRecommended_ReturnsValidationEnvelope_WhenZonesExceedLimit()
    {
        using var client = CreateTestClient();

        var payload = """
            {
              "ordered_hot_zones": [
                { "priority": 1, "lat": 41.0, "lng": 29.0 },
                { "priority": 2, "lat": 41.1, "lng": 29.1 },
                { "priority": 3, "lat": 41.2, "lng": 29.2 },
                { "priority": 1, "lat": 41.3, "lng": 29.3 }
              ],
              "pageNumber": 1,
              "pageSize": 10
            }
            """;

        using var response = await client.PostAsync(
            "/api/events/recommended",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;

        Assert.False(root.GetProperty("isSuccess").GetBoolean());
        var firstError = root.GetProperty("errors")[0];
        Assert.Equal("VAL_001", firstError.GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetLegacyRecommended_ReturnsDeprecationHeaders()
    {
        using var client = CreateTestClient();

        using var response = await client.GetAsync("/api/events/recommended?pageNumber=1&pageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Deprecation", out var deprecationValues));
        Assert.Contains("true", deprecationValues);
        Assert.True(response.Headers.TryGetValues("Sunset", out var sunsetValues));
        Assert.Contains("Fri, 31 Jul 2026 23:59:59 GMT", sunsetValues);
    }

    [Fact]
    public async Task PostDailyNext_ReturnsSuccessEnvelope()
    {
        using var client = CreateTestClient();

        using var response = await client.PostAsync(
            "/api/events/recommended/daily/next",
            new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;

        Assert.True(root.GetProperty("isSuccess").GetBoolean());
        var data = root.GetProperty("data");
        Assert.Equal("depleted", data.GetProperty("status").GetString());
    }

    private HttpClient CreateTestClient()
    {
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:SigningKey"] = "SuperSecretDummyKeyForTestingPurposesOnlyWhichIsAtLeast32BytesLong!",
                    ["Jwt:Issuer"] = "TestIssuer",
                    ["Jwt:Audience"] = "TestAudience",
                    ["ConnectionStrings:PostgreSql"] = "Host=localhost;Database=dummy;Username=dummy;Password=dummy",
                    ["Database:AutoMigrateOnStartup"] = "false"
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IEventService>();
                services.AddScoped<IEventService, FakeEventService>();

                services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = "Test";
                        options.DefaultChallengeScheme = "Test";
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
            });
        }).CreateClient();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test");
        return client;
    }

    private sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "11111111-1111-1111-1111-111111111111"),
                new Claim(ClaimTypes.Role, "Individual")
            };

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    private sealed class FakeEventService : IEventService
    {
        public Task<Result<ApplyToEventResponse>> ApplyToEventAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<ApplyToEventResponse>.Failure("TEST_001", "Not implemented."));

        public Task<Result<PagedResult<EventSummaryDto>>> GetEventsByOwnerIdAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => Task.FromResult(Result<PagedResult<EventSummaryDto>>.Failure("TEST_001", "Not implemented."));

        public Task<Result<PagedResult<EventSummaryDto>>> GetEventsByParticipantAsync(Guid accountId, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => Task.FromResult(Result<PagedResult<EventSummaryDto>>.Failure("TEST_001", "Not implemented."));

        public Task<Result<EventSummaryDto>> CancelEventAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<EventSummaryDto>.Failure("TEST_001", "Not implemented."));

        public Task<Result<EventSummaryDto>> CreateEventAsync(CreateEventRequest request, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<EventSummaryDto>.Failure("TEST_001", "Not implemented."));

        public Task<Result<PagedResult<MyParticipationDto>>> GetMyParticipationsAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<PagedResult<MyParticipationDto>>.Failure("TEST_001", "Not implemented."));

        public Task<Result<EventParticipantsResponse>> GetEventParticipantsAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<EventParticipantsResponse>.Failure("TEST_001", "Not implemented."));

        public Task<Result<EventDetailsDto>> GetEventDetailsAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<EventDetailsDto>.Failure("TEST_001", "Not implemented."));

        public Task<Result<PagedResult<EventSummaryDto>>> GetMyBookmarksAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<PagedResult<EventSummaryDto>>.Failure("TEST_001", "Not implemented."));

        public Task<Result<PagedResult<EventSummaryDto>>> GetMyCreatedEventsAsync(int pageNumber, int pageSize, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<PagedResult<EventSummaryDto>>.Failure("TEST_001", "Not implemented."));

        public Task<Result<PagedResult<EventSummaryDto>>> GetRecommendedAsync(UserContext userContext, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => Task.FromResult(Result<PagedResult<EventSummaryDto>>.Success(
                new PagedResult<EventSummaryDto>(Array.Empty<EventSummaryDto>(), 0, pageNumber, pageSize)));

        public Task<Result<PagedResult<EventSummaryDto>>> GetRecommendedNearbyAsync(UserContext userContext, decimal lat, decimal lng, int pageNumber, int pageSize, CancellationToken cancellationToken)
            => Task.FromResult(Result<PagedResult<EventSummaryDto>>.Success(
                new PagedResult<EventSummaryDto>(Array.Empty<EventSummaryDto>(), 0, pageNumber, pageSize)));

        public Task<Result<PagedResult<RecommendedEventSummaryDto>>> GetRecommendedV6Async(UserContext userContext, RecommendedEventsRequest request, CancellationToken cancellationToken)
            => Task.FromResult(Result<PagedResult<RecommendedEventSummaryDto>>.Success(
                new PagedResult<RecommendedEventSummaryDto>(Array.Empty<RecommendedEventSummaryDto>(), 0, request.PageNumber, request.PageSize)));

        public Task<Result<DailyRecommendedNextResponse>> GetDailyRecommendedNextAsync(
            UserContext userContext,
            DailyRecommendedNextRequest request,
            CancellationToken cancellationToken)
            => Task.FromResult(Result<DailyRecommendedNextResponse>.Success(
                new DailyRecommendedNextResponse(null, "depleted", null, 0, "No data", null, Array.Empty<Guid>())));

        public Task<Result<IEnumerable<EventSummaryDto>>> GetSimilarEventsAsync(Guid eventId, int count, CancellationToken cancellationToken)
            => Task.FromResult(Result<IEnumerable<EventSummaryDto>>.Failure("TEST_001", "Not implemented."));

        public Task<Result<PagedResult<EventSummaryDto>>> SearchAsync(EventSearchRequest request, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<PagedResult<EventSummaryDto>>.Failure("TEST_001", "Not implemented."));

        public Task<Result> ToggleBookmarkAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result.Failure("TEST_001", "Not implemented."));

        public Task<Result<EventSummaryDto>> UpdateEventAsync(Guid eventId, UpdateEventRequest request, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<EventSummaryDto>.Failure("TEST_001", "Not implemented."));

        public Task<Result<ParticipationStatusDto>> UpdateParticipationStatusAsync(Guid eventId, Guid userId, ManageParticipationStatusRequest request, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<ParticipationStatusDto>.Failure("TEST_001", "Not implemented."));

        public Task<Result<EventSummaryDto>> UpdateEventStatusAsync(Guid eventId, UpdateEventStatusRequest request, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<EventSummaryDto>.Failure("TEST_001", "Not implemented."));

        public Task<Result<ParticipationStatusDto>> WithdrawAsync(Guid eventId, UserContext userContext, CancellationToken cancellationToken)
            => Task.FromResult(Result<ParticipationStatusDto>.Failure("TEST_001", "Not implemented."));
    }
}
