using System.Net;
using System.Text;
using Apptivity.Application.Interfaces;
using Apptivity.Infrastructure.External;
using Apptivity.Infrastructure.Options;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Apptivity.Api.Tests;

public sealed class GroqTagPredictorTests
{
    [Fact]
    public async Task PredictAsync_ReturnsResult_WhenResponseIsValid()
    {
        var httpClient = CreateHttpClient(HttpStatusCode.OK, """
            {
              "choices": [
                {
                  "message": {
                    "content": "{\"primary_tag\":\"Technology\",\"fallback_tag\":\"Music\"}"
                  }
                }
              ]
            }
            """);

        var predictor = new GroqTagPredictor(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new GroqOptions
            {
                ApiKey = "dummy-key",
                BaseUrl = "https://api.groq.com/openai/v1",
                Model = "openai/gpt-oss-20b",
                TimeoutMs = 120
            }),
            NullLogger<GroqTagPredictor>.Instance);

        var result = await predictor.PredictAsync(
            new TagPredictionInput(
                AllowedTags: new[] { "Technology", "Music", "Sports" },
                InterestTags: new[] { "Technology" },
                ApprovedHistoryTags: new[] { "Music" }),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("Technology", result!.PrimaryTag);
        Assert.Equal("Music", result.FallbackTag);
    }

    [Fact]
    public async Task PredictAsync_ReturnsNull_WhenResponseHasUnknownTags()
    {
        var httpClient = CreateHttpClient(HttpStatusCode.OK, """
            {
              "choices": [
                {
                  "message": {
                    "content": "{\"primary_tag\":\"UnknownTag\",\"fallback_tag\":\"Music\"}"
                  }
                }
              ]
            }
            """);

        var predictor = new GroqTagPredictor(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new GroqOptions
            {
                ApiKey = "dummy-key",
                BaseUrl = "https://api.groq.com/openai/v1",
                Model = "openai/gpt-oss-20b",
                TimeoutMs = 120
            }),
            NullLogger<GroqTagPredictor>.Instance);

        var result = await predictor.PredictAsync(
            new TagPredictionInput(
                AllowedTags: new[] { "Technology", "Music", "Sports" },
                InterestTags: new[] { "Technology" },
                ApprovedHistoryTags: new[] { "Music" }),
            CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task PredictAsync_ReturnsNull_WhenRequestTimesOut()
    {
        var httpClient = CreateHttpClient(async (_, cancellationToken) =>
        {
            await Task.Delay(500, cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"choices\":[]}", Encoding.UTF8, "application/json")
            };
        });

        var predictor = new GroqTagPredictor(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new GroqOptions
            {
                ApiKey = "dummy-key",
                BaseUrl = "https://api.groq.com/openai/v1",
                Model = "openai/gpt-oss-20b",
                TimeoutMs = 5
            }),
            NullLogger<GroqTagPredictor>.Instance);

        var result = await predictor.PredictAsync(
            new TagPredictionInput(
                AllowedTags: new[] { "Technology", "Music", "Sports" },
                InterestTags: new[] { "Technology" },
                ApprovedHistoryTags: new[] { "Music" }),
            CancellationToken.None);

        Assert.Null(result);
    }

    private static HttpClient CreateHttpClient(HttpStatusCode statusCode, string body)
    {
        var handler = new FakeHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            }));

        return new HttpClient(handler);
    }

    private static HttpClient CreateHttpClient(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
    {
        return new HttpClient(new FakeHttpMessageHandler(handler));
    }

    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _handler;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return _handler(request, cancellationToken);
        }
    }
}
