namespace Apptivity.Application.Interfaces;

public sealed record ImageUploadResult(string Url, string PublicId);

public interface IImageService
{
    Task<ImageUploadResult> UploadProfilePhotoAsync(Stream fileStream, string fileName, Guid accountId, CancellationToken cancellationToken);
    Task<ImageUploadResult> UploadEventPhotoAsync(Stream fileStream, string fileName, Guid eventId, int photoIndex, CancellationToken cancellationToken);
    Task<ImageUploadResult> UploadReportEvidenceAsync(Stream fileStream, string fileName, Guid reporterId, CancellationToken cancellationToken);
    Task<IReadOnlyList<string>> GetEventPhotoUrlsAsync(Guid eventId);
    Task DeleteEventPhotoAsync(Guid eventId, int photoIndex);
}
