using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Devices;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;

namespace Apptivity.Application.Services;

public sealed class DeviceService : IDeviceService
{
    private readonly IDeviceTokenRepository _deviceTokenRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeviceService(IDeviceTokenRepository deviceTokenRepository, IUnitOfWork unitOfWork)
    {
        _deviceTokenRepository = deviceTokenRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<DeviceTokenDto>> RegisterOrUpdateTokenAsync(RegisterDeviceTokenRequest request, UserContext userContext, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FcmToken) || string.IsNullOrWhiteSpace(request.DeviceType))
        {
            return Result<DeviceTokenDto>.Failure(ErrorCodes.Validation, "FcmToken and DeviceType are required.");
        }

        var normalizedDeviceType = request.DeviceType.Trim().ToLowerInvariant();
        var existing = await _deviceTokenRepository.GetByAccountAndDeviceTypeAsync(userContext.AccountId, normalizedDeviceType, cancellationToken);

        if (existing is null)
        {
            existing = new DeviceToken
            {
                Id = Guid.NewGuid(),
                AccountId = userContext.AccountId,
                FcmToken = request.FcmToken.Trim(),
                DeviceType = normalizedDeviceType
            };

            await _deviceTokenRepository.AddAsync(existing, cancellationToken);
        }
        else
        {
            existing.FcmToken = request.FcmToken.Trim();
            existing.DeviceType = normalizedDeviceType;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<DeviceTokenDto>.Success(new DeviceTokenDto(existing.Id, existing.AccountId, existing.DeviceType, existing.FcmToken));
    }
}
