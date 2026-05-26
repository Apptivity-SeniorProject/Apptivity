namespace Apptivity.Infrastructure.Options;

public sealed class GroqOptions
{
    public const string SectionName = "Groq";

    public string ApiKey { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = "https://api.groq.com/openai/v1";
    public string Model { get; init; } = "openai/gpt-oss-20b";
    public int TimeoutMs { get; init; } = 120;
}
