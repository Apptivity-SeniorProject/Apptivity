import { apiClient } from '@/src/api/apiClient';
import type { ApiEnvelope } from '@/src/types/api';
import type { PagedResult } from '@/src/types/event';
import type { NotificationDto } from '@/src/types/notification';
import { normalizePossiblyMojibakeText } from '@/src/utils/text';

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'İstek başarısız.');
}

function normalizeTurkishText(value: string): string {
  return normalizePossiblyMojibakeText(value).trim();
}

function translateNotificationTitle(title: string): string {
  const normalized = normalizeTurkishText(title);

  if (normalized === 'Participation Approved') {
    return 'Katılım Onaylandı';
  }

  if (normalized === 'Participation Rejected') {
    return 'Katılım Reddedildi';
  }

  if (normalized === 'Event Cancelled') {
    return 'Etkinlik İptal Edildi';
  }

  return normalized;
}

function translateNotificationContent(content: string): string {
  const normalized = normalizeTurkishText(content);

  const approvedMatch = normalized.match(/^Your participation for '(.+)' has been approved.$/i);
  if (approvedMatch) {
    return `'${approvedMatch[1]}' etkinliğine katılımın onaylandı.`;
  }

  const rejectedMatch = normalized.match(/^Your participation for '(.+)' has been rejected.$/i);
  if (rejectedMatch) {
    return `'${rejectedMatch[1]}' etkinliğine katılımın reddedildi.`;
  }

  const cancelledMatch = normalized.match(/^The event '(.+)' has been cancelled.$/i);
  if (cancelledMatch) {
    return `'${cancelledMatch[1]}' etkinliği iptal edildi.`;
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
  const response = await apiClient.patch<ApiEnvelope<NotificationDto>>('/api/notifications/' + notificationId + '/read');

  return mapNotification(unwrapEnvelope(response.data));
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await apiClient.patch<ApiEnvelope<unknown>>('/api/notifications/read-all');

  if (!response.data.isSuccess) {
    throw new Error(response.data.errors?.[0]?.message ?? 'Bildirimler güncellenemedi.');
  }
}
