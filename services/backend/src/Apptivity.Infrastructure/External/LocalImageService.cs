using Apptivity.Application.Interfaces;
using Apptivity.Application.Options;
using Microsoft.Extensions.Options;

namespace Apptivity.Infrastructure.External;

public sealed class LocalImageService : IImageService
{
    private const string UploadRoot = "uploaded_images";
    private const string ProfilePhotosFolder = "profile_photos";
    private const string EventPhotosFolder = "event_photos";
    private const string ReportEvidenceFolder = "report_evidence";

    private readonly string _basePath;

    public LocalImageService(IOptions<ImageUploadOptions> options)
    {
        _basePath = options.Value.StoragePath ?? throw new InvalidOperationException("ImageUpload:StoragePath is not configured.");
        EnsureDirectoriesExist();
    }

    public async Task<ImageUploadResult> UploadProfilePhotoAsync(
        Stream fileStream, string fileName, Guid accountId, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var directory = Path.Combine(_basePath, UploadRoot, ProfilePhotosFolder);

        // Remove any existing photo for this account (could be different extension)
        RemoveExistingFiles(directory, accountId.ToString());

        var savedFileName = $"{accountId}{extension}";
        var filePath = Path.Combine(directory, savedFileName);

        await SaveFileAsync(fileStream, filePath, cancellationToken);

        var url = BuildRelativeUrl("api/uploads", ProfilePhotosFolder, savedFileName);
        return new ImageUploadResult(url, accountId.ToString());
    }

    public async Task<ImageUploadResult> UploadEventPhotoAsync(
        Stream fileStream, string fileName, Guid eventId, int photoIndex, CancellationToken cancellationToken)
    {
        if (photoIndex < 1 || photoIndex > 3)
        {
            throw new ArgumentOutOfRangeException(nameof(photoIndex), "Photo index must be between 1 and 3.");
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var directory = Path.Combine(_basePath, UploadRoot, EventPhotosFolder, eventId.ToString());
        Directory.CreateDirectory(directory);

        // Remove any existing photo at this index (could be different extension)
        RemoveExistingFiles(directory, photoIndex.ToString());

        var savedFileName = $"{photoIndex}{extension}";
        var filePath = Path.Combine(directory, savedFileName);

        await SaveFileAsync(fileStream, filePath, cancellationToken);

        var url = BuildRelativeUrl("api/uploads", EventPhotosFolder, eventId.ToString(), savedFileName);
        return new ImageUploadResult(url, $"{eventId}/{photoIndex}");
    }

    public async Task<ImageUploadResult> UploadReportEvidenceAsync(
        Stream fileStream, string fileName, Guid reporterId, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var directory = Path.Combine(_basePath, UploadRoot, ReportEvidenceFolder);

        var uniqueId = $"{reporterId}_{DateTime.UtcNow:yyyyMMddHHmmss}";
        var savedFileName = $"{uniqueId}{extension}";
        var filePath = Path.Combine(directory, savedFileName);

        await SaveFileAsync(fileStream, filePath, cancellationToken);

        var url = BuildRelativeUrl("api/uploads", ReportEvidenceFolder, savedFileName);
        return new ImageUploadResult(url, uniqueId);
    }

    public Task<IReadOnlyList<string>> GetEventPhotoUrlsAsync(Guid eventId)
    {
        var directory = Path.Combine(_basePath, UploadRoot, EventPhotosFolder, eventId.ToString());

        if (!Directory.Exists(directory))
        {
            return Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());
        }

        var files = Directory.GetFiles(directory)
            .Select(f => new
            {
                FileName = Path.GetFileName(f),
                Index = int.TryParse(Path.GetFileNameWithoutExtension(f), out var idx) ? idx : 0
            })
            .Where(f => f.Index >= 1 && f.Index <= 3)
            .OrderBy(f => f.Index)
            .Select(f => BuildRelativeUrl("api/uploads", EventPhotosFolder, eventId.ToString(), f.FileName))
            .ToList();

        return Task.FromResult<IReadOnlyList<string>>(files);
    }

    public Task DeleteEventPhotoAsync(Guid eventId, int photoIndex)
    {
        var directory = Path.Combine(_basePath, UploadRoot, EventPhotosFolder, eventId.ToString());

        if (Directory.Exists(directory))
        {
            RemoveExistingFiles(directory, photoIndex.ToString());
        }

        return Task.CompletedTask;
    }

    private void EnsureDirectoriesExist()
    {
        Directory.CreateDirectory(Path.Combine(_basePath, UploadRoot, ProfilePhotosFolder));
        Directory.CreateDirectory(Path.Combine(_basePath, UploadRoot, EventPhotosFolder));
        Directory.CreateDirectory(Path.Combine(_basePath, UploadRoot, ReportEvidenceFolder));
    }

    private static async Task SaveFileAsync(Stream source, string destinationPath, CancellationToken cancellationToken)
    {
        await using var fileStream = new FileStream(destinationPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await source.CopyToAsync(fileStream, cancellationToken);
    }

    private static void RemoveExistingFiles(string directory, string fileNameWithoutExtension)
    {
        if (!Directory.Exists(directory)) return;

        var existingFiles = Directory.GetFiles(directory, $"{fileNameWithoutExtension}.*");
        foreach (var file in existingFiles)
        {
            // Verify the file name without extension matches exactly to avoid partial matches
            if (string.Equals(Path.GetFileNameWithoutExtension(file), fileNameWithoutExtension, StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(file);
            }
        }
    }

    private static string BuildRelativeUrl(params string[] segments)
    {
        return "/" + string.Join("/", segments);
    }
}
