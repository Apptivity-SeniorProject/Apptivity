using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class Message : BaseEntity
{
    public Guid ChatId { get; set; }
    public Chat Chat { get; set; } = null!;

    public Guid SenderAccountId { get; set; }
    public Account SenderAccount { get; set; } = null!;

    public required string Content { get; set; }
}
