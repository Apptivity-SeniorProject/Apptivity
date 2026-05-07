using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Admin;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Services;

public sealed class AdminService : IAdminService
{
    private readonly IAdminRepository _adminRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AdminService(IAdminRepository adminRepository, IUnitOfWork unitOfWork)
    {
        _adminRepository = adminRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<AdminDashboardStatsDto>> GetDashboardStatsAsync(CancellationToken cancellationToken)
    {
        var totalUsers = await _adminRepository.CountAccountsAsync(cancellationToken);
        var activeEvents = await _adminRepository.CountActiveEventsAsync(cancellationToken);
        var fromUtc = DateTime.UtcNow.AddDays(-7);
        var recentParticipations = await _adminRepository.CountRecentParticipationsAsync(fromUtc, cancellationToken);

        return Result<AdminDashboardStatsDto>.Success(
            new AdminDashboardStatsDto(totalUsers, activeEvents, recentParticipations));
    }

    public async Task<Result<PagedResult<AdminAccountDto>>> GetAccountsAsync(AdminAccountsFilterRequest request, CancellationToken cancellationToken)
    {
        var paging = new PagedRequest
        {
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
        paging.Normalize();

        var filter = new AdminAccountFilter(request.IsActive, request.Status, request.Type, request.MinReportCount);
        var (items, totalCount) = await _adminRepository.GetAccountsAsync(filter, paging.PageNumber, paging.PageSize, cancellationToken);

        var mapped = items.Select(x => new AdminAccountDto(
            x.Account.Id,
            x.Account.Username,
            x.Account.Phone,
            x.Account.Email,
            x.Account.Type,
            x.Account.Status,
            x.Account.IsActive,
            x.ReportCount,
            x.Account.CreatedAt)).ToArray();

        return Result<PagedResult<AdminAccountDto>>.Success(new PagedResult<AdminAccountDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    public async Task<Result<PagedResult<AdminEventModerationDto>>> GetEventsAsync(AdminEventsFilterRequest request, CancellationToken cancellationToken)
    {
        var paging = new PagedRequest
        {
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
        paging.Normalize();

        var (items, totalCount) = await _adminRepository.GetEventsAsync(request.Status, paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items
            .Select(x => new AdminEventModerationDto(
                x.Id,
                x.Name,
                x.Status,
                x.IsFeatured,
                x.IsDeleted))
            .ToArray();

        return Result<PagedResult<AdminEventModerationDto>>.Success(new PagedResult<AdminEventModerationDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    public async Task<Result<AdminAccountDto>> UpdateAccountStatusAsync(Guid accountId, UpdateAccountStatusRequest request, UserContext adminContext, CancellationToken cancellationToken)
    {
        if (!IsAdmin(adminContext))
        {
            return Result<AdminAccountDto>.Failure(ErrorCodes.AdminUnauthorized, "Only admins can manage account status.");
        }

        var account = await _adminRepository.GetAccountByIdAsync(accountId, cancellationToken);
        if (account is null)
        {
            return Result<AdminAccountDto>.Failure(ErrorCodes.AdminAccountNotFound, "Account not found.");
        }

        account.Status = request.Status;
        account.IsActive = request.Status == AccountStatus.Active;
        await AddAuditLogAsync(adminContext.AccountId, "AccountStatusUpdated", "Account", account.Id, $"status={request.Status}", cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AdminAccountDto>.Success(new AdminAccountDto(
            account.Id,
            account.Username,
            account.Phone,
            account.Email,
            account.Type,
            account.Status,
            account.IsActive,
            0,
            account.CreatedAt));
    }

    public async Task<Result<AdminClubDto>> VerifyClubAsync(Guid clubId, VerifyClubRequest request, UserContext adminContext, CancellationToken cancellationToken)
    {
        if (!IsAdmin(adminContext))
        {
            return Result<AdminClubDto>.Failure(ErrorCodes.AdminUnauthorized, "Only admins can verify organizations.");
        }

        var club = await _adminRepository.GetClubByIdAsync(clubId, cancellationToken);
        if (club is null)
        {
            return Result<AdminClubDto>.Failure(ErrorCodes.AdminClubNotFound, "Club not found.");
        }

        if (club.Account.Type != AccountType.Organization)
        {
            return Result<AdminClubDto>.Failure(ErrorCodes.AdminInvalidClubType, "Verification is only available for organization profiles.");
        }

        club.IsVerified = request.IsVerified;
        await AddAuditLogAsync(adminContext.AccountId, "ClubVerificationUpdated", "Club", club.Id, $"isVerified={request.IsVerified}", cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AdminClubDto>.Success(new AdminClubDto(club.Id, club.Id, club.Name, club.IsVerified));
    }

    public async Task<Result<PagedResult<AdminReportDto>>> GetReportsAsync(ReportsFilterRequest request, CancellationToken cancellationToken)
    {
        var paging = new PagedRequest
        {
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
        paging.Normalize();

        var (items, totalCount) = await _adminRepository.GetReportsAsync(request.Status, paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items
            .Select(x => new AdminReportDto(
                x.Id,
                x.ReporterId,
                x.TargetId,
                x.TargetType,
                x.ReasonCategory,
                x.Description,
                x.Status,
                x.CreatedAt))
            .ToArray();

        return Result<PagedResult<AdminReportDto>>.Success(new PagedResult<AdminReportDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    public async Task<Result<AdminEventModerationDto>> DeleteEventAsync(Guid eventId, UserContext adminContext, CancellationToken cancellationToken)
    {
        if (!IsAdmin(adminContext))
        {
            return Result<AdminEventModerationDto>.Failure(ErrorCodes.AdminUnauthorized, "Only admins can delete events.");
        }

        var eventEntity = await _adminRepository.GetEventByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result<AdminEventModerationDto>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        eventEntity.Status = EventStatus.Cancelled;
        eventEntity.IsDeleted = true;
        eventEntity.DeletedAt = DateTime.UtcNow;

        await AddAuditLogAsync(adminContext.AccountId, "EventForceDeleted", "Event", eventEntity.Id, $"eventName={eventEntity.Name}", cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AdminEventModerationDto>.Success(new AdminEventModerationDto(
            eventEntity.Id,
            eventEntity.Name,
            eventEntity.Status,
            eventEntity.IsFeatured,
            eventEntity.IsDeleted));
    }

    public async Task<Result<AdminEventModerationDto>> ToggleFeaturedAsync(Guid eventId, ToggleEventFeaturedRequest request, UserContext adminContext, CancellationToken cancellationToken)
    {
        if (!IsAdmin(adminContext))
        {
            return Result<AdminEventModerationDto>.Failure(ErrorCodes.AdminUnauthorized, "Only admins can feature events.");
        }

        var eventEntity = await _adminRepository.GetEventByIdAsync(eventId, cancellationToken);
        if (eventEntity is null)
        {
            return Result<AdminEventModerationDto>.Failure(ErrorCodes.EventNotFound, "Event not found.");
        }

        eventEntity.IsFeatured = request.IsFeatured;
        await AddAuditLogAsync(adminContext.AccountId, "EventFeaturedUpdated", "Event", eventEntity.Id, $"isFeatured={request.IsFeatured}", cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AdminEventModerationDto>.Success(new AdminEventModerationDto(
            eventEntity.Id,
            eventEntity.Name,
            eventEntity.Status,
            eventEntity.IsFeatured,
            eventEntity.IsDeleted));
    }

    private async Task AddAuditLogAsync(Guid adminAccountId, string action, string entityType, Guid? entityId, string? details, CancellationToken cancellationToken)
    {
        await _adminRepository.AddAuditLogAsync(new AuditLog
        {
            Id = Guid.NewGuid(),
            AdminAccountId = adminAccountId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details
        }, cancellationToken);
    }

    private static bool IsAdmin(UserContext context) => context.AccountType == AccountType.Admin;
}
