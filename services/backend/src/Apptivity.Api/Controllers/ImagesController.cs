using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Enums;
using Apptivity.Infrastructure.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/images")]
[Authorize]
public sealed class ImagesController : ApiControllerBase
{
    private readonly IUserContextAccessor _userContextAccessor;
    private readonly IUserRepository _userRepository;
    private readonly IEventRepository _eventRepository;
    private readonly IImageService _imageService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly CloudinaryOptions _cloudinaryOptions;

    public ImagesController(
        IUserContextAccessor userContextAccessor,
        IUserRepository userRepository,
        IEventRepository eventRepository,
        IImageService imageService,
        IUnitOfWork unitOfWork,
        IOptions<CloudinaryOptions> cloudinaryOptions)
    {
        _userContextAccessor = userContextAccessor;
        _userRepository = userRepository;
        _eventRepository = eventRepository;
        _imageService = imageService;
        _unitOfWork = unitOfWork;
        _cloudinaryOptions = cloudinaryOptions.Value;
    }

    [HttpPost("profile-photo")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadProfilePhoto([FromForm] ProfilePhotoUploadRequest request, CancellationToken cancellationToken)
    {
        var file = request.File;
        var userContext = _userContextAccessor.GetCurrentUser();
        if (userContext is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var validationError = ValidateImageFile(file);
        if (validationError is not null)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("VAL_001", validationError)
            }, HttpContext.TraceIdentifier));
        }

        var account = await _userRepository.GetAccountByIdAsync(userContext.AccountId, cancellationToken);
        if (account is null)
        {
            return NotFound(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_404", "Account not found.")
            }, HttpContext.TraceIdentifier));
        }

        ImageUploadResult upload;
        try
        {
            await using var stream = file.OpenReadStream();
            upload = await _imageService.UploadProfilePhotoAsync(stream, file.FileName, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("IMG_CONFIG_MISSING", ex.Message)
            }, HttpContext.TraceIdentifier));
        }

        account.ProfilePhoto = upload.Url;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Ok(ApiEnvelope<object>.Success(new
        {
            accountId = account.Id,
            profilePhotoUrl = upload.Url,
            publicId = upload.PublicId
        }, HttpContext.TraceIdentifier));
    }

    [HttpPost("events/{eventId:guid}/banner")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadEventBanner(Guid eventId, [FromForm] EventBannerUploadRequest request, CancellationToken cancellationToken)
    {
        var file = request.File;
        var userContext = _userContextAccessor.GetCurrentUser();
        if (userContext is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        var validationError = ValidateImageFile(file);
        if (validationError is not null)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("VAL_001", validationError)
            }, HttpContext.TraceIdentifier));
        }

        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return NotFound(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("EVENT_404", "Event not found.")
            }, HttpContext.TraceIdentifier));
        }

        if (userContext.AccountType != AccountType.Admin && eventEntity.OwnerId != userContext.AccountId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("EVENT_401", "Only the event owner can upload a banner.")
            }, HttpContext.TraceIdentifier));
        }

        ImageUploadResult upload;
        try
        {
            await using var stream = file.OpenReadStream();
            upload = await _imageService.UploadEventBannerAsync(stream, file.FileName, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("IMG_CONFIG_MISSING", ex.Message)
            }, HttpContext.TraceIdentifier));
        }

        eventEntity.BannerImage = upload.Url;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Ok(ApiEnvelope<object>.Success(new
        {
            eventId = eventEntity.Id,
            bannerUrl = upload.Url,
            publicId = upload.PublicId
        }, HttpContext.TraceIdentifier));
    }

    private string? ValidateImageFile(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            return "Image file is required.";
        }

        var maxSizeBytes = Math.Max(1, _cloudinaryOptions.MaxFileSizeMb) * 1024L * 1024L;
        if (file.Length > maxSizeBytes)
        {
            return $"File size exceeds {_cloudinaryOptions.MaxFileSizeMb}MB limit.";
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            return "File extension is required.";
        }

        var allowed = _cloudinaryOptions.AllowedExtensions
            .Any(x => string.Equals(x, extension, StringComparison.OrdinalIgnoreCase));
        if (!allowed)
        {
            return "Unsupported image extension.";
        }

        return null;
    }

    public sealed class ProfilePhotoUploadRequest
    {
        public IFormFile File { get; set; } = null!;
    }

    public sealed class EventBannerUploadRequest
    {
        public IFormFile File { get; set; } = null!;
    }
}
