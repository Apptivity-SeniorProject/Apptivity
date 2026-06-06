namespace Apptivity.Infrastructure.Options;

public sealed class CloudinaryOptions
{
    public const string SectionName = "Cloudinary";

    public string CloudName { get; init; } = string.Empty;
    public string ApiKey { get; init; } = string.Empty;
    public string ApiSecret { get; init; } = string.Empty;
    public string UserAvatarFolder { get; init; } = "apptivity/users/avatars";
    public string EventBannerFolder { get; init; } = "apptivity/events/banners";
    public string ReportEvidenceFolder { get; init; } = "apptivity/reports/evidence";
    public int MaxFileSizeMb { get; init; } = 5;
    public string[] AllowedExtensions { get; init; } = new[] { ".jpg", ".png", ".webp" };
}
