using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class OtpVerification : BaseEntity
{
    public required string PhoneNumber { get; set; }
    public required string Code { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
}
