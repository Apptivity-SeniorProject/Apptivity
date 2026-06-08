namespace Apptivity.Application.Options;

public sealed class ImageUploadOptions
{
    public const string SectionName = "ImageUpload";

    public string StoragePath { get; init; } = "wwwroot";

    public int MaxFileSizeMb { get; init; } = 5;
    public string[] AllowedExtensions { get; init; } = [".jpg", ".png", ".webp"];
    public int MaxEventPhotos { get; init; } = 3;
}
