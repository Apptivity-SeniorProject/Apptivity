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
        if (input.AllowedTags.Count < 1 || string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return null;
        }

        try
        {
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

            var allowedIds = input.AllowedTags
                .Select(x => x.Id)
                .Distinct()
                .ToHashSet();

            var normalizedTagIds = parsed.TagIds
                .Where(allowedIds.Contains)
                .Distinct()
                .Take(5)
                .ToArray();

            if (normalizedTagIds.Length == 0)
            {
                return null;
            }

            return new TagPredictionResult(normalizedTagIds);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Groq tag prediction timed out after {TimeoutMs}ms. Falling back.", GetTimeoutMs());
            return null;
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Groq tag prediction was cancelled by upstream caller.");
            return null;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Groq tag prediction request failed. Falling back.");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Groq tag prediction failed unexpectedly. Falling back.");
            return null;
        }
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
                    content = "You are a strict recommender. Return only valid JSON with key tag_ids as an array of up to 5 distinct UUIDs from allowed_tags."
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
        const int defaultTimeoutMs = 5000;
        const int minTimeoutMs = 1000;
        const int maxTimeoutMs = 30000;

        if (_options.TimeoutMs <= 0)
        {
            return defaultTimeoutMs;
        }

        if (_options.TimeoutMs < minTimeoutMs)
        {
            return minTimeoutMs;
        }

        if (_options.TimeoutMs > maxTimeoutMs)
        {
            return maxTimeoutMs;
        }

        return _options.TimeoutMs;
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
                must_be_distinct = true,
                max_count = 5
            },
            output = "Return only JSON: {\"tag_ids\":[\"uuid-1\",\"uuid-2\",\"uuid-3\",\"uuid-4\",\"uuid-5\"]}"
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
            if (!root.TryGetProperty("tag_ids", out var tagIdsElement) || tagIdsElement.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            var parsedTagIds = new List<Guid>();
            foreach (var element in tagIdsElement.EnumerateArray())
            {
                var value = element.GetString()?.Trim();
                if (!Guid.TryParse(value, out var tagId))
                {
                    continue;
                }

                parsedTagIds.Add(tagId);
            }

            if (parsedTagIds.Count == 0)
            {
                return null;
            }

            return new TagPredictionResult(parsedTagIds);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Groq tag prediction response.");
            return null;
        }
    }
}
