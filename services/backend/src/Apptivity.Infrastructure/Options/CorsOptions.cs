namespace Apptivity.Infrastructure.Options;

public sealed class CorsOptions
{
    public const string SectionName = "Cors";
    public string[] AllowedOrigins { get; init; } = Array.Empty<string>();
}
