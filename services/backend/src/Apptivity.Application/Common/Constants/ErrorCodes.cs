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
<<<<<<< Updated upstream
    public const string EventNotFound = "EVENT_404";
    public const string EventUnauthorized = "EVENT_401";
    public const string EventInvalidState = "EVENT_409";
    public const string EventCapacityFull = "EVENT_410";
    public const string ParticipationNotFound = "PART_404";
    public const string ParticipationInvalidState = "PART_409";
=======

    // Review
    public const string ReviewNotFound = "REV_404";
    public const string ReviewDuplicate = "REV_409";
    public const string ReviewSelfReview = "REV_400_SELF";
    public const string ReviewEventNotCompleted = "REV_400_STATUS";
    public const string ReviewVotingClosed = "REV_400_CLOSED";
    public const string ReviewNotParticipant = "REV_403_PART";
    public const string ReviewClubCannotReview = "REV_403_CLUB";
    public const string ReviewInvalidRating = "REV_400_RATING";
    public const string ReviewInvalidTarget = "REV_400_TARGET";

    // Event
    public const string EventVotingClosed = "EVENT_400_CLOSED";
>>>>>>> Stashed changes
}
