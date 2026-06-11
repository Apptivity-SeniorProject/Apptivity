using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Feedback;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;
using System.Net.Mail;

namespace Apptivity.Application.Services;

public sealed class FeedbackService : IFeedbackService
{
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly IUnitOfWork _unitOfWork;

    public FeedbackService(IFeedbackRepository feedbackRepository, IUnitOfWork unitOfWork)
    {
        _feedbackRepository = feedbackRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> SubmitAsync(SubmitFeedbackRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken)
    {
        var firstName = request.FirstName?.Trim() ?? string.Empty;
        var lastName = request.LastName?.Trim() ?? string.Empty;
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        var message = request.Message?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName) || string.IsNullOrWhiteSpace(message))
        {
            return Result.Failure(ErrorCodes.Validation, "First name, last name, and message are required.");
        }

        if (firstName.Length > 100 || lastName.Length > 100)
        {
            return Result.Failure(ErrorCodes.Validation, "First name and last name can be up to 100 characters.");
        }

        if (message.Length > 2000)
        {
            return Result.Failure(ErrorCodes.Validation, "Message can be up to 2000 characters.");
        }

        if (email is not null)
        {
            if (email.Length > 320)
            {
                return Result.Failure(ErrorCodes.Validation, "Email can be up to 320 characters.");
            }

            if (!IsValidEmail(email))
            {
                return Result.Failure(ErrorCodes.Validation, "Email format is invalid.");
            }
        }

        var submission = new FeedbackSubmission
        {
            Id = Guid.NewGuid(),
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Message = message,
            IpAddress = ipAddress,
            UserAgent = userAgent
        };

        await _feedbackRepository.AddAsync(submission, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result<PagedResult<FeedbackItemDto>>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var paging = new PagedRequest
        {
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        paging.Normalize();

        var (items, totalCount) = await _feedbackRepository.GetPagedAsync(paging.PageNumber, paging.PageSize, cancellationToken);
        var mapped = items
            .Select(x => new FeedbackItemDto(
                x.Id,
                x.FirstName,
                x.LastName,
                x.Email,
                x.Message,
                x.IpAddress,
                x.UserAgent,
                x.CreatedAt))
            .ToArray();

        return Result<PagedResult<FeedbackItemDto>>.Success(
            new PagedResult<FeedbackItemDto>(mapped, totalCount, paging.PageNumber, paging.PageSize));
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            _ = new MailAddress(email);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<Result> DeleteAsync(Guid feedbackId, CancellationToken cancellationToken)
    {
        var submission = await _feedbackRepository.GetByIdAsync(feedbackId, cancellationToken);
        if (submission is null)
        {
            return Result.Failure(ErrorCodes.FeedbackNotFound, "Feedback not found.");
        }

        _feedbackRepository.Remove(submission);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
