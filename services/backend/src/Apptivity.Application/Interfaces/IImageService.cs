namespace Apptivity.Application.Interfaces;

public sealed record ImageUploadResult(string Url, string PublicId);

public interface IImageService
{
    Task<ImageUploadResult> UploadProfilePhotoAsync(Stream fileStream, string fileName, CancellationToken cancellationToken);
    Task<ImageUploadResult> UploadEventBannerAsync(Stream fileStream, string fileName, CancellationToken cancellationToken);
}
