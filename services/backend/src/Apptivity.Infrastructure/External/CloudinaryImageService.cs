using Apptivity.Application.Interfaces;
using Apptivity.Infrastructure.Options;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;
using ImageUploadResultContract = Apptivity.Application.Interfaces.ImageUploadResult;

namespace Apptivity.Infrastructure.External;

public sealed class CloudinaryImageService : IImageService
{
    private readonly Cloudinary? _cloudinary;
    private readonly CloudinaryOptions _options;
    private readonly bool _isConfigured;

    public CloudinaryImageService(IOptions<CloudinaryOptions> options)
    {
        _options = options.Value;
        _isConfigured =
            !string.IsNullOrWhiteSpace(_options.CloudName) &&
            !string.IsNullOrWhiteSpace(_options.ApiKey) &&
            !string.IsNullOrWhiteSpace(_options.ApiSecret);

        if (_isConfigured)
        {
            var account = new Account(_options.CloudName, _options.ApiKey, _options.ApiSecret);
            _cloudinary = new Cloudinary(account);
        }
    }

    public Task<ImageUploadResultContract> UploadProfilePhotoAsync(Stream fileStream, string fileName, CancellationToken cancellationToken)
    {
        return UploadAsync(
            fileStream,
            fileName,
            _options.UserAvatarFolder,
            new Transformation().Width(400).Height(400).Crop("thumb").Gravity("face"),
            cancellationToken);
    }

    public Task<ImageUploadResultContract> UploadEventBannerAsync(Stream fileStream, string fileName, CancellationToken cancellationToken)
    {
        return UploadAsync(
            fileStream,
            fileName,
            _options.EventBannerFolder,
            new Transformation().Width(1200).Height(600).Crop("fill").Gravity("auto"),
            cancellationToken);
    }

    private async Task<ImageUploadResultContract> UploadAsync(
        Stream fileStream,
        string fileName,
        string folder,
        Transformation transformation,
        CancellationToken cancellationToken)
    {
        if (!_isConfigured || _cloudinary is null)
        {
            throw new InvalidOperationException("Cloudinary configuration is missing. Set Cloudinary:CloudName, Cloudinary:ApiKey and Cloudinary:ApiSecret.");
        }

        cancellationToken.ThrowIfCancellationRequested();

        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(fileName, fileStream),
            Folder = folder,
            Transformation = transformation
        };

        var result = await _cloudinary.UploadAsync(uploadParams);
        cancellationToken.ThrowIfCancellationRequested();

        if (result.Error is not null || string.IsNullOrWhiteSpace(result.SecureUrl?.AbsoluteUri))
        {
            throw new InvalidOperationException($"Cloudinary upload failed: {result.Error?.Message ?? "Unknown error"}");
        }

        return new ImageUploadResultContract(result.SecureUrl.AbsoluteUri, result.PublicId ?? string.Empty);
    }
}
