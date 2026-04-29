using Apptivity.Application.Common.Models;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Contracts.Submissions;

public sealed record CreateSubmissionRequest(Guid EventId, string? Note);
public sealed record ChangeSubmissionStatusRequest(SubmissionStatus Status);
public sealed record SubmissionResponse(Guid Id, Guid EventId, Guid AttendeeId, SubmissionStatus Status, string? Note);

public interface ISubmissionService
{
    Task<Result<SubmissionResponse>> CreateAsync(CreateSubmissionRequest request, CancellationToken cancellationToken);
    Task<Result<SubmissionResponse>> ChangeStatusAsync(Guid submissionId, ChangeSubmissionStatusRequest request, CancellationToken cancellationToken);
    Task<Result> WithdrawAsync(Guid submissionId, CancellationToken cancellationToken);
}
