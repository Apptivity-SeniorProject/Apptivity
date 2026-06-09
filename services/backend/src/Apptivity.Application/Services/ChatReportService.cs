using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.ChatReports;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;

namespace Apptivity.Application.Services;

public sealed class ChatReportService : IChatReportService
{
    private readonly IChatReportRepository _chatReportRepository;
    private readonly IEventRepository _eventRepository;
    private readonly IParticipationRepository _participationRepository;
    private readonly IChatRepository _chatRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ChatReportService(
        IChatReportRepository chatReportRepository,
        IEventRepository eventRepository,
        IParticipationRepository participationRepository,
        IChatRepository chatRepository,
        IUnitOfWork unitOfWork)
    {
        _chatReportRepository = chatReportRepository;
        _eventRepository = eventRepository;
        _participationRepository = participationRepository;
        _chatRepository = chatRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> CreateChatReportAsync(CreateChatReportRequest request, UserContext userContext, CancellationToken cancellationToken)
    {
        var @event = await _eventRepository.GetByIdAsync(request.EventId, cancellationToken);
        if (@event is null)
        {
            return Result<Guid>.Failure(ErrorCodes.EventNotFound, "Etkinlik bulunamadı.");
        }

        var isOwner = @event.OwnerId == userContext.AccountId;
        if (!isOwner)
        {
            var isParticipant = await _participationRepository.HasChatAccessParticipationAsync(userContext.AccountId, request.EventId, cancellationToken);
            if (!isParticipant)
            {
                return Result<Guid>.Failure(ErrorCodes.EventUnauthorized, "Bu etkinliğin sohbetine erişim yetkiniz yok.");
            }
        }

        var (messages, _) = await _chatRepository.GetMessagesAsync(request.EventId, 1, 500, cancellationToken);

        var chatReport = new ChatReport
        {
            ReporterId = userContext.AccountId,
            EventId = request.EventId,
            ReasonCategory = request.ReasonCategory,
            Description = request.Description,
            Messages = messages.Select(m => new ChatReportMessage
            {
                SenderAccountId = m.SenderAccountId,
                SenderDisplayName = m.SenderAccount.UserProfile != null 
                    ? $"{m.SenderAccount.UserProfile.Name} {m.SenderAccount.UserProfile.Surname}".Trim() 
                    : m.SenderAccount.ClubProfile?.Name ?? m.SenderAccount.Username,
                Content = m.Content,
                OriginalSentAtUtc = m.CreatedAt
            }).ToList()
        };

        await _chatReportRepository.AddAsync(chatReport, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(chatReport.Id);
    }
}
