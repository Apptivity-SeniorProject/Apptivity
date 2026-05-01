using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;

namespace Apptivity.Application.Contracts.Devices;

public sealed record RegisterDeviceTokenRequest(string FcmToken, string DeviceType);
public sealed record DeviceTokenDto(Guid Id, Guid AccountId, string DeviceType, string FcmToken);

public interface IDeviceService
{
    Task<Result<DeviceTokenDto>> RegisterOrUpdateTokenAsync(RegisterDeviceTokenRequest request, UserContext userContext, CancellationToken cancellationToken);
}
