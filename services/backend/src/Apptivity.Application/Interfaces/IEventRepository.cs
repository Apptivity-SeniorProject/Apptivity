using Apptivity.Application.Common.Models;
using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Interfaces;

public interface IEventRepository
{
    Task<Event?> GetByIdAsync(Guid eventId, CancellationToken cancellationToken);
    Task<PagedResult<Event>> GetPagedAsync(Guid? userId, UserRole role, EventStatus? status, PagedRequest request, CancellationToken cancellationToken);
    Task AddAsync(Event entity, CancellationToken cancellationToken);
}
