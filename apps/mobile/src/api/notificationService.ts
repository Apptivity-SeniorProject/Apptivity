import { apiClient } from '@/src/api/apiClient';
import type { ApiEnvelope } from '@/src/types/api';
import type { PagedResult } from '@/src/types/event';
import type { NotificationDto } from '@/src/types/notification';

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'Istek basarisiz.');
}

function normalizeTurkishText(value: string): string {
  return value
    .replaceAll('Ã‡', 'Ç')
    .replaceAll('Ã§', 'ç')
    .replaceAll('Ä°', 'İ')
    .replaceAll('Ä±', 'ı')
    .replaceAll('Ã–', 'Ö')
    .replaceAll('Ã¶', 'ö')
    .replaceAll('Ãœ', 'Ü')
    .replaceAll('Ã¼', 'ü')
    .replaceAll('Åž', 'Ş')
    .replaceAll('ÅŸ', 'ş')
    .replaceAll('ÄŸ', 'ğ')
    .replaceAll('Äž', 'Ğ');
}

function translateNotificationTitle(title: string): string {
  const normalized = normalizeTurkishText(title).trim();

  if (normalized === 'Participation Approved') {
    return 'Katilim Onaylandi';
  }

  if (normalized === 'Participation Rejected') {
    return 'Katilim Reddedildi';
  }

  if (normalized === 'Event Cancelled') {
    return 'Etkinlik Iptal Edildi';
  }

  return normalized;
}

function translateNotificationContent(content: string): string {
  const normalized = normalizeTurkishText(content).trim();

  const approvedMatch = normalized.match(/^Your participation for '(.+)' has been approved\.$/i);
  if (approvedMatch) {
    return `'${approvedMatch[1]}' etkinligine katilimin onaylandi.`;
  }

  const rejectedMatch = normalized.match(/^Your participation for '(.+)' has been rejected\.$/i);
  if (rejectedMatch) {
    return `'${rejectedMatch[1]}' etkinligine katilimin reddedildi.`;
  }

  const cancelledMatch = normalized.match(/^The event '(.+)' has been cancelled\.$/i);
  if (cancelledMatch) {
    return `'${cancelledMatch[1]}' etkinligi iptal edildi.`;
  }

  return normalized;
}

function mapNotification(notification: NotificationDto): NotificationDto {
  return {
    ...notification,
    title: translateNotificationTitle(notification.title),
    content: translateNotificationContent(notification.content),
  };
}

function mapNotificationPage(page: PagedResult<NotificationDto>): PagedResult<NotificationDto> {
  return {
    ...page,
    items: page.items.map(mapNotification),
  };
}

export async function getMyNotifications(
  pageNumber = 1,
  pageSize = 20
): Promise<PagedResult<NotificationDto>> {
  const response = await apiClient.get<ApiEnvelope<PagedResult<NotificationDto>>>('/api/notifications', {
    params: { pageNumber, pageSize },
  });

  return mapNotificationPage(unwrapEnvelope(response.data));
}

export async function markNotificationAsRead(notificationId: string): Promise<NotificationDto> {
  const response = await apiClient.patch<ApiEnvelope<NotificationDto>>(
    `/api/notifications/${notificationId}/read`
  );

  return mapNotification(unwrapEnvelope(response.data));
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await apiClient.patch<ApiEnvelope<unknown>>('/api/notifications/read-all');

  if (!response.data.isSuccess) {
    throw new Error(response.data.errors?.[0]?.message ?? 'Bildirimler guncellenemedi.');
  }
}
