using Apptivity.Domain.Enums;

namespace Apptivity.Application.Contracts.Reviews;

public sealed record ReviewResponse(
    Guid Id,
    Guid ReviewerId,
    string ReviewerUsername,
    Guid ReviewedId,
    string ReviewedUsername,
    Guid EventId,
    string EventName,
    int Rating,
    string? Comment,
    DateTime CreatedAt);

public sealed record ReviewListResponse(
    IReadOnlyList<ReviewResponse> Items,
    int TotalCount,
    int PageNumber,
    int PageSize);
