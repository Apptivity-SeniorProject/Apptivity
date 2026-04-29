using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Submissions;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class SubmissionService : ISubmissionService
{
    private readonly ISubmissionRepository _submissionRepository;
    private readonly IEventRepository _eventRepository;
    private readonly IUserContextAccessor _userContextAccessor;
    private readonly IUnitOfWork _unitOfWork;

    public SubmissionService(
        ISubmissionRepository submissionRepository,
        IEventRepository eventRepository,
        IUserContextAccessor userContextAccessor,
        IUnitOfWork unitOfWork)
    {
        _submissionRepository = submissionRepository;
        _eventRepository = eventRepository;
        _userContextAccessor = userContextAccessor;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<SubmissionResponse>> CreateAsync(CreateSubmissionRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.Unauthorized, "Unauthorized.");
        }

        if (context.Role != UserRole.Individual)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.SubmissionForbidden, "Only individual users can apply to events.");
        }

        var eventEntity = await _eventRepository.GetByIdAsync(request.EventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        if (eventEntity.Status != EventStatus.Published)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.Validation, "Submissions are only allowed for published events.");
        }

        if (eventEntity.StartUtc <= DateTime.UtcNow)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.Validation, "Submissions are locked after event start.");
        }

        var existing = await _submissionRepository.GetByEventAndAttendeeAsync(request.EventId, context.UserId, cancellationToken);
        if (existing is not null && existing.Status != SubmissionStatus.Withdrawn)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.Validation, "A submission already exists for this event.");
        }

        var submission = new Submission
        {
            Id = Guid.NewGuid(),
            EventId = request.EventId,
            AttendeeId = context.UserId,
            Status = SubmissionStatus.Pending,
            Note = request.Note
        };

        await _submissionRepository.AddAsync(submission, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<SubmissionResponse>.Success(ToResponse(submission));
    }

    public async Task<Result<SubmissionResponse>> ChangeStatusAsync(Guid submissionId, ChangeSubmissionStatusRequest request, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.Unauthorized, "Unauthorized.");
        }

        if (context.Role == UserRole.Individual)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.SubmissionForbidden, "Individuals cannot update submission status.");
        }

        var submission = await _submissionRepository.GetByIdAsync(submissionId, cancellationToken);
        if (submission is null)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.SubmissionNotFound, "Submission not found.");
        }

        if (context.Role == UserRole.Organization && submission.Event.OrganizerId != context.UserId)
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.SubmissionForbidden, "You cannot manage this submission.");
        }

        if (request.Status is not (SubmissionStatus.Approved or SubmissionStatus.Rejected))
        {
            return Result<SubmissionResponse>.Failure(ErrorCodes.Validation, "Organizations can only approve or reject submissions.");
        }

        submission.Status = request.Status;
        submission.UpdatedUtc = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<SubmissionResponse>.Success(ToResponse(submission));
    }

    public async Task<Result> WithdrawAsync(Guid submissionId, CancellationToken cancellationToken)
    {
        var context = _userContextAccessor.GetCurrentUser();
        if (context is null)
        {
            return Result.Failure(ErrorCodes.Unauthorized, "Unauthorized.");
        }

        if (context.Role != UserRole.Individual)
        {
            return Result.Failure(ErrorCodes.SubmissionForbidden, "Only individual users can withdraw submissions.");
        }

        var submission = await _submissionRepository.GetByIdAsync(submissionId, cancellationToken);
        if (submission is null)
        {
            return Result.Failure(ErrorCodes.SubmissionNotFound, "Submission not found.");
        }

        if (submission.AttendeeId != context.UserId)
        {
            return Result.Failure(ErrorCodes.SubmissionForbidden, "You cannot withdraw this submission.");
        }

        submission.Status = SubmissionStatus.Withdrawn;
        submission.UpdatedUtc = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static SubmissionResponse ToResponse(Submission submission)
    {
        return new SubmissionResponse(submission.Id, submission.EventId, submission.AttendeeId, submission.Status, submission.Note);
    }
}
