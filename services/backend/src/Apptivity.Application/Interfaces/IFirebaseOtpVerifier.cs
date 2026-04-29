namespace Apptivity.Application.Interfaces;

public interface IFirebaseOtpVerifier
{
    Task<(bool IsValid, string? PhoneNumber, string? ErrorMessage)> VerifyAsync(string firebaseIdToken, CancellationToken cancellationToken);
}
