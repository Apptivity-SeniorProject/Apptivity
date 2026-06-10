using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class FeedbackSubmission : BaseEntity
{
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public string? Email { get; set; }
    public required string Message { get; set; }
}
