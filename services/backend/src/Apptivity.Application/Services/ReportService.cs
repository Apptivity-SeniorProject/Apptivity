using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Reports;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class ReportService : IReportService
{
    private readonly IReportRepository _reportRepository;
    private readonly IUserRepository _userRepository;
    private readonly IEventRepository _eventRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ReportService(
        IReportRepository reportRepository,
        IUserRepository userRepository,
        IEventRepository eventRepository,
        IUnitOfWork unitOfWork)
    {
        _reportRepository = reportRepository;
        _userRepository = userRepository;
        _eventRepository = eventRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ReportResponse>> CreateAsync(CreateReportRequest request, UserContext userContext, CancellationToken cancellationToken)
    {
        if (request.TargetId == Guid.Empty || string.IsNullOrWhiteSpace(request.Description))
        {
            return Result<ReportResponse>.Failure(ErrorCodes.Validation, "Target and description are required.");
        }

        if (request.TargetType == ReportTargetType.Account)
        {
            if (request.TargetId == userContext.AccountId)
            {
                return Result<ReportResponse>.Failure(ErrorCodes.ReportSelfTarget, "You cannot report your own account.");
            }

            var targetAccount = await _userRepository.GetAccountByIdAsync(request.TargetId, cancellationToken);
            if (targetAccount is null)
            {
                return Result<ReportResponse>.Failure(ErrorCodes.ReportNotFound, "Report target account not found.");
            }
        }
        else
        {
            var targetEvent = await _eventRepository.GetByIdAsync(request.TargetId, cancellationToken);
            if (targetEvent is null)
            {
                return Result<ReportResponse>.Failure(ErrorCodes.EventNotFound, "Report target event not found.");
            }

            if (targetEvent.OwnerId == userContext.AccountId)
            {
                return Result<ReportResponse>.Failure(ErrorCodes.ReportSelfTarget, "You cannot report your own event.");
            }
        }

        var report = new Report
        {
            Id = Guid.NewGuid(),
            ReporterId = userContext.AccountId,
            TargetId = request.TargetId,
            TargetType = request.TargetType,
            ReasonCategory = request.ReasonCategory,
            Description = request.Description.Trim(),
            Status = ReportStatus.Pending
        };

        await _reportRepository.AddAsync(report, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ReportResponse>.Success(new ReportResponse(
            report.Id,
            report.ReporterId,
            report.TargetId,
            report.TargetType,
            report.ReasonCategory,
            report.Description,
            report.Status,
            report.CreatedAt));
    }
}
