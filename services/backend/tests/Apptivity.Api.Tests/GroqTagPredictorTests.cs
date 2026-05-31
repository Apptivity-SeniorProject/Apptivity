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
        var technologyId = Guid.Parse("40FD6D4C-0F95-49D5-BB6A-7A6419D15231");
        var musicId = Guid.Parse("8BA4EFA4-9F4A-4A56-8646-644A8E3F079D");

        var httpClient = CreateHttpClient(HttpStatusCode.OK, """
            {
              "choices": [
                {
                  "message": {
                    "content": "{\"tag_ids\":[\"40FD6D4C-0F95-49D5-BB6A-7A6419D15231\",\"8BA4EFA4-9F4A-4A56-8646-644A8E3F079D\"]}"
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
                AllowedTags: new[]
                {
                    new TagPredictionAllowedTag(technologyId, "Technology"),
                    new TagPredictionAllowedTag(musicId, "Music"),
                    new TagPredictionAllowedTag(Guid.Parse("96A9F6B2-40D7-4E15-9F8E-CB7596ED59F1"), "Sports")
                },
                InterestTags: new[] { "Technology" },
                ApprovedHistoryTags: new[] { "Music" }),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(2, result!.TagIds.Count);
        Assert.Contains(technologyId, result.TagIds);
        Assert.Contains(musicId, result.TagIds);
    }

    [Fact]
    public async Task PredictAsync_ReturnsNull_WhenResponseHasUnknownTags()
    {
        var httpClient = CreateHttpClient(HttpStatusCode.OK, """
            {
              "choices": [
                {
                  "message": {
                    "content": "{\"tag_ids\":[\"11111111-1111-1111-1111-111111111111\"]}"
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
                AllowedTags: new[]
                {
                    new TagPredictionAllowedTag(Guid.Parse("40FD6D4C-0F95-49D5-BB6A-7A6419D15231"), "Technology"),
                    new TagPredictionAllowedTag(Guid.Parse("8BA4EFA4-9F4A-4A56-8646-644A8E3F079D"), "Music"),
                    new TagPredictionAllowedTag(Guid.Parse("96A9F6B2-40D7-4E15-9F8E-CB7596ED59F1"), "Sports")
                },
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
                AllowedTags: new[]
                {
                    new TagPredictionAllowedTag(Guid.Parse("40FD6D4C-0F95-49D5-BB6A-7A6419D15231"), "Technology"),
                    new TagPredictionAllowedTag(Guid.Parse("8BA4EFA4-9F4A-4A56-8646-644A8E3F079D"), "Music"),
                    new TagPredictionAllowedTag(Guid.Parse("96A9F6B2-40D7-4E15-9F8E-CB7596ED59F1"), "Sports")
                },
                InterestTags: new[] { "Technology" },
                ApprovedHistoryTags: new[] { "Music" }),
            CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task PredictAsync_ReturnsFiveDistinctAllowedTags_WhenResponseContainsMore()
    {
        var id1 = Guid.Parse("40FD6D4C-0F95-49D5-BB6A-7A6419D15231");
        var id2 = Guid.Parse("8BA4EFA4-9F4A-4A56-8646-644A8E3F079D");
        var id3 = Guid.Parse("96A9F6B2-40D7-4E15-9F8E-CB7596ED59F1");
        var id4 = Guid.Parse("2F1769F1-0C31-4915-B9CC-D0CF79D5A5F3");
        var id5 = Guid.Parse("D4E42A0D-6A4D-4D35-84D1-86E4B7E7E122");
        var id6 = Guid.Parse("65558F2C-8D3E-4E47-88B5-C2A87D5A0A7F");
        var unknown = Guid.Parse("11111111-1111-1111-1111-111111111111");

        var httpClient = CreateHttpClient(HttpStatusCode.OK, $$"""
            {
              "choices": [
                {
                  "message": {
                    "content": "{\"tag_ids\":[\"{{id1}}\",\"{{id2}}\",\"{{id3}}\",\"{{id4}}\",\"{{id5}}\",\"{{id6}}\",\"{{id3}}\",\"{{unknown}}\"]}"
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
                TimeoutMs = 5000
            }),
            NullLogger<GroqTagPredictor>.Instance);

        var result = await predictor.PredictAsync(
            new TagPredictionInput(
                AllowedTags: new[]
                {
                    new TagPredictionAllowedTag(id1, "Technology"),
                    new TagPredictionAllowedTag(id2, "Music"),
                    new TagPredictionAllowedTag(id3, "Sports"),
                    new TagPredictionAllowedTag(id4, "Art"),
                    new TagPredictionAllowedTag(id5, "Education"),
                    new TagPredictionAllowedTag(id6, "Gaming")
                },
                InterestTags: Array.Empty<string>(),
                ApprovedHistoryTags: Array.Empty<string>()),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(5, result!.TagIds.Count);
        Assert.DoesNotContain(unknown, result.TagIds);
        Assert.Equal(result.TagIds.Count, result.TagIds.Distinct().Count());
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
