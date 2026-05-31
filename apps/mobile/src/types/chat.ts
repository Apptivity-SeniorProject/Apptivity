export interface MessageDto {
  messageId: string;
  eventId: string;
  senderAccountId: string;
  senderName?: string;
  senderProfilePhoto?: string;
  content: string;
  sentAtUtc: string;
}
