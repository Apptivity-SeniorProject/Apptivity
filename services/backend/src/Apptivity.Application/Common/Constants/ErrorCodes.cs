namespace Apptivity.Application.Common.Constants;

public static class ErrorCodes
{
    public const string Unauthorized = "AUTH_401";
    public const string InvalidCredential = "AUTH_003";
    public const string InvalidOtp = "AUTH_001";
    public const string TokenExpired = "AUTH_002";
    public const string AccountNotFound = "AUTH_404";
    public const string AccountAlreadyExists = "AUTH_409";
    public const string Validation = "VAL_001";
    public const string EventNotFound = "EVENT_404";
    public const string EventUnauthorized = "EVENT_401";
    public const string EventInvalidState = "EVENT_409";
    public const string EventCapacityFull = "EVENT_410";
    public const string ParticipationNotFound = "PART_404";
    public const string ParticipationInvalidState = "PART_409";
}
