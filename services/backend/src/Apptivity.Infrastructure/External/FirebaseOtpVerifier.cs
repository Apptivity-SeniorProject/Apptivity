using Apptivity.Application.Interfaces;

namespace Apptivity.Infrastructure.External;

public sealed class FirebaseOtpVerifier : IFirebaseOtpVerifier
{
    public Task<(bool IsValid, string? PhoneNumber, string? ErrorMessage)> VerifyAsync(string firebaseIdToken, CancellationToken cancellationToken)
    {
        _ = cancellationToken;

        if (string.IsNullOrWhiteSpace(firebaseIdToken))
        {
            return Task.FromResult<(bool, string?, string?)>((false, null, "Firebase ID token is required."));
        }

        // TODO: Validate token using Firebase Admin SDK and extract verified phone number.
        // Current placeholder keeps contract stable while integration credentials are pending.
        return Task.FromResult<(bool, string?, string?)>((false, null, "Firebase verification is not configured yet."));
    }
}
