using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface IOtpVerificationRepository
{
    Task AddAsync(OtpVerification otpVerification, CancellationToken cancellationToken);
    Task<OtpVerification?> GetValidAsync(string phoneNumber, string code, CancellationToken cancellationToken);
}
