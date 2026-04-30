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
}
