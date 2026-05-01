namespace Apptivity.Infrastructure.Options;

public sealed class FcmOptions
{
    public const string SectionName = "Fcm";

    public bool Enabled { get; init; }
    public string ProjectId { get; init; } = string.Empty;
    public string ServiceAccountJsonPath { get; init; } = string.Empty;
    public string ServerKey { get; init; } = string.Empty;
    public string Endpoint { get; init; } = "https://fcm.googleapis.com/fcm/send";
}
