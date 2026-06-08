using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Application.Options;
using Apptivity.Domain.Enums;
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
    private readonly ImageUploadOptions _uploadOptions;

    public ImagesController(
        IUserContextAccessor userContextAccessor,
        IUserRepository userRepository,
        IEventRepository eventRepository,
        IImageService imageService,
        IUnitOfWork unitOfWork,
        IOptions<ImageUploadOptions> uploadOptions)
    {
        _userContextAccessor = userContextAccessor;
        _userRepository = userRepository;
        _eventRepository = eventRepository;
        _imageService = imageService;
        _unitOfWork = unitOfWork;
        _uploadOptions = uploadOptions.Value;
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
            upload = await _imageService.UploadProfilePhotoAsync(stream, file.FileName, account.Id, cancellationToken);
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

    [HttpPost("events/{eventId:guid}/photos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadEventPhoto(Guid eventId, [FromForm] EventPhotoUploadRequest request, CancellationToken cancellationToken)
    {
        var file = request.File;
        var photoIndex = request.PhotoIndex;

        var userContext = _userContextAccessor.GetCurrentUser();
        if (userContext is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
            }, HttpContext.TraceIdentifier));
        }

        if (photoIndex < 1 || photoIndex > _uploadOptions.MaxEventPhotos)
        {
            return BadRequest(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("VAL_002", $"Photo index must be between 1 and {_uploadOptions.MaxEventPhotos}.")
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
                new ErrorDetail("EVENT_401", "Only the event owner can upload photos.")
            }, HttpContext.TraceIdentifier));
        }

        ImageUploadResult upload;
        try
        {
            await using var stream = file.OpenReadStream();
            upload = await _imageService.UploadEventPhotoAsync(stream, file.FileName, eventId, photoIndex, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("IMG_CONFIG_MISSING", ex.Message)
            }, HttpContext.TraceIdentifier));
        }

        // BannerImage always stores the first photo's URL
        if (photoIndex == 1)
        {
            eventEntity.BannerImage = upload.Url;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Ok(ApiEnvelope<object>.Success(new
        {
            eventId = eventEntity.Id,
            photoIndex,
            photoUrl = upload.Url,
            publicId = upload.PublicId
        }, HttpContext.TraceIdentifier));
    }

    [HttpGet("events/{eventId:guid}/photos")]
    public async Task<IActionResult> GetEventPhotos(Guid eventId, CancellationToken cancellationToken)
    {
        var eventEntity = await _eventRepository.GetByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return NotFound(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("EVENT_404", "Event not found.")
            }, HttpContext.TraceIdentifier));
        }

        var photoUrls = await _imageService.GetEventPhotoUrlsAsync(eventId);

        return Ok(ApiEnvelope<object>.Success(new
        {
            eventId,
            photos = photoUrls
        }, HttpContext.TraceIdentifier));
    }

    [HttpDelete("events/{eventId:guid}/photos/{photoIndex:int}")]
    public async Task<IActionResult> DeleteEventPhoto(Guid eventId, int photoIndex, CancellationToken cancellationToken)
    {
        var userContext = _userContextAccessor.GetCurrentUser();
        if (userContext is null)
        {
            return Unauthorized(ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("AUTH_401", "Unauthorized.")
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
                new ErrorDetail("EVENT_401", "Only the event owner can delete photos.")
            }, HttpContext.TraceIdentifier));
        }

        await _imageService.DeleteEventPhotoAsync(eventId, photoIndex);

        // If first photo is deleted, clear BannerImage
        if (photoIndex == 1)
        {
            eventEntity.BannerImage = null;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Ok(ApiEnvelope<object>.Success(new
        {
            eventId,
            deletedPhotoIndex = photoIndex
        }, HttpContext.TraceIdentifier));
    }

    [HttpPost("reports/evidence")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadReportEvidence([FromForm] ReportEvidenceUploadRequest request, CancellationToken cancellationToken)
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

        ImageUploadResult upload;
        try
        {
            await using var stream = file.OpenReadStream();
            upload = await _imageService.UploadReportEvidenceAsync(stream, file.FileName, userContext.AccountId, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("IMG_CONFIG_MISSING", ex.Message)
            }, HttpContext.TraceIdentifier));
        }

        return Ok(ApiEnvelope<object>.Success(new
        {
            imageUrl = upload.Url,
            publicId = upload.PublicId
        }, HttpContext.TraceIdentifier));
    }

    private string? ValidateImageFile(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            return "Image file is required.";
        }

        var maxSizeBytes = Math.Max(1, _uploadOptions.MaxFileSizeMb) * 1024L * 1024L;
        if (file.Length > maxSizeBytes)
        {
            return $"File size exceeds {_uploadOptions.MaxFileSizeMb}MB limit.";
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            return "File extension is required.";
        }

        var allowed = _uploadOptions.AllowedExtensions
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

    public sealed class EventPhotoUploadRequest
    {
        public IFormFile File { get; set; } = null!;
        public int PhotoIndex { get; set; } = 1;
    }

    public sealed class ReportEvidenceUploadRequest
    {
        public IFormFile File { get; set; } = null!;
    }
}
