namespace Apptivity.Application.Common.Constants;

public static class ErrorCodes
{
    public const string Unauthorized = "AUTH_401";
    public const string InvalidCredential = "AUTH_003";
    public const string InvalidOtp = "AUTH_001";
    public const string TokenExpired = "AUTH_002";
    public const string Validation = "VAL_001";
    public const string EventNotFound = "EVENT_404";
    public const string EventForbidden = "EVENT_401";
    public const string SubmissionNotFound = "SUBMISSION_404";
    public const string SubmissionForbidden = "SUBMISSION_401";
}
