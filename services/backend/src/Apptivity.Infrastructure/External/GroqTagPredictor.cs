using Apptivity.Application.Interfaces;
using Apptivity.Infrastructure.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Apptivity.Infrastructure.External;

public sealed class GroqTagPredictor : ITagPredictorService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;
    private readonly ILogger<GroqTagPredictor> _logger;

    public GroqTagPredictor(HttpClient httpClient, IOptions<GroqOptions> options, ILogger<GroqTagPredictor> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<TagPredictionResult?> PredictAsync(TagPredictionInput input, CancellationToken cancellationToken)
    {
        if (input.AllowedTags.Count < 2 || string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return null;
        }

        using var request = BuildRequest(input);
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(TimeSpan.FromMilliseconds(GetTimeoutMs()));

        using var response = await _httpClient.SendAsync(request, timeoutCts.Token);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Groq tag prediction failed with status {StatusCode}. Body: {Body}", response.StatusCode, errorBody);
            return null;
        }

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        var parsed = ParseResponseContent(responseBody);
        if (parsed is null)
        {
            return null;
        }

        var allowedMap = input.AllowedTags
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToDictionary(x => x, x => x, StringComparer.OrdinalIgnoreCase);

        if (!allowedMap.TryGetValue(parsed.PrimaryTag, out var normalizedPrimary))
        {
            return null;
        }

        if (!allowedMap.TryGetValue(parsed.FallbackTag, out var normalizedFallback))
        {
            return null;
        }

        if (string.Equals(normalizedPrimary, normalizedFallback, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return new TagPredictionResult(normalizedPrimary, normalizedFallback);
    }

    private HttpRequestMessage BuildRequest(TagPredictionInput input)
    {
        var endpoint = $"{_options.BaseUrl.TrimEnd('/')}/chat/completions";
        var payload = new
        {
            model = string.IsNullOrWhiteSpace(_options.Model) ? "openai/gpt-oss-20b" : _options.Model,
            temperature = 0,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content = "You are a strict classifier. Return only valid JSON with keys primary_tag and fallback_tag."
                },
                new
                {
                    role = "user",
                    content = BuildUserPrompt(input)
                }
            }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        request.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");
        return request;
    }

    private int GetTimeoutMs()
    {
        return _options.TimeoutMs <= 0 ? 120 : _options.TimeoutMs;
    }

    private static string BuildUserPrompt(TagPredictionInput input)
    {
        var promptPayload = new
        {
            allowed_tags = input.AllowedTags,
            user_signals = new
            {
                interest_tags = input.InterestTags,
                approved_history_tags = input.ApprovedHistoryTags
            },
            rules = new
            {
                must_be_from_allowed_tags = true,
                must_be_distinct = true
            },
            output = "Return only JSON: {\"primary_tag\":\"...\",\"fallback_tag\":\"...\"}"
        };

        return JsonSerializer.Serialize(promptPayload, JsonOptions);
    }

    private TagPredictionResult? ParseResponseContent(string body)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            var choices = document.RootElement.GetProperty("choices");
            if (choices.GetArrayLength() == 0)
            {
                return null;
            }

            var content = choices[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content))
            {
                return null;
            }

            using var contentDoc = JsonDocument.Parse(content);
            var root = contentDoc.RootElement;
            if (!root.TryGetProperty("primary_tag", out var primaryTagElement) ||
                !root.TryGetProperty("fallback_tag", out var fallbackTagElement))
            {
                return null;
            }

            var primaryTag = primaryTagElement.GetString()?.Trim();
            var fallbackTag = fallbackTagElement.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(primaryTag) || string.IsNullOrWhiteSpace(fallbackTag))
            {
                return null;
            }

            return new TagPredictionResult(primaryTag, fallbackTag);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Groq tag prediction response.");
            return null;
        }
    }
}
