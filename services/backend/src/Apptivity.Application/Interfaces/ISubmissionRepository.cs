using Apptivity.Domain.Entities;
using Apptivity.Domain.Enums;

namespace Apptivity.Application.Interfaces;

public interface ISubmissionRepository
{
    Task<Submission?> GetByIdAsync(Guid submissionId, CancellationToken cancellationToken);
    Task<Submission?> GetByEventAndAttendeeAsync(Guid eventId, Guid attendeeId, CancellationToken cancellationToken);
    Task AddAsync(Submission entity, CancellationToken cancellationToken);
    Task<bool> HasApprovedSubmissionAsync(Guid eventId, Guid attendeeId, CancellationToken cancellationToken);
}
