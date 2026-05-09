export interface MessageDto {
  messageId: string;
  eventId: string;
  senderAccountId: string;
  senderName?: string;
  content: string;
  sentAtUtc: string;
}
