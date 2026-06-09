namespace Apptivity.Domain.Entities;

public sealed class ChatReportMessage
{
    public Guid Id { get; set; }

    public Guid ChatReportId { get; set; }
    public ChatReport ChatReport { get; set; } = null!;

    public Guid SenderAccountId { get; set; }
    public string SenderDisplayName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime OriginalSentAtUtc { get; set; }
}
