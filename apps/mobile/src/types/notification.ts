export interface NotificationDto {
  id: string;
  accountId: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityId?: string | null;
}
