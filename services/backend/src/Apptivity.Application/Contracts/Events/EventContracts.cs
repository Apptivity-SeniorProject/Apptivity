using Apptivity.Application.Common.Models;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Contracts.Events;

public sealed record CreateEventRequest(string Title, string Description, string Location, DateTime StartUtc, DateTime EndUtc, string? BannerUrl);
public sealed record ChangeEventStatusRequest(EventStatus Status);
public sealed record EventResponse(Guid Id, Guid OrganizerId, string Title, string Description, string Location, DateTime StartUtc, DateTime EndUtc, EventStatus Status, string? BannerUrl);

public interface IEventService
{
    Task<Result<EventResponse>> CreateAsync(CreateEventRequest request, CancellationToken cancellationToken);
    Task<Result<EventResponse>> ChangeStatusAsync(Guid eventId, ChangeEventStatusRequest request, CancellationToken cancellationToken);
    Task<Result<PagedResult<EventResponse>>> GetPagedAsync(EventStatus? status, PagedRequest request, CancellationToken cancellationToken);
}
