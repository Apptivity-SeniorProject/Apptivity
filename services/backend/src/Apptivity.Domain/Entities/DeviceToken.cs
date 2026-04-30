using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class DeviceToken : BaseEntity
{
    public Guid AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public required string FcmToken { get; set; }
    public required string DeviceType { get; set; }
}
