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

export async function getMyNotifications(
  pageNumber = 1,
  pageSize = 20
): Promise<PagedResult<NotificationDto>> {
  const response = await apiClient.get<ApiEnvelope<PagedResult<NotificationDto>>>('/api/notifications', {
    params: { pageNumber, pageSize },
  });

  return unwrapEnvelope(response.data);
}

export async function markNotificationAsRead(notificationId: string): Promise<NotificationDto> {
  const response = await apiClient.patch<ApiEnvelope<NotificationDto>>(
    `/api/notifications/${notificationId}/read`
  );

  return unwrapEnvelope(response.data);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await apiClient.patch<ApiEnvelope<unknown>>('/api/notifications/read-all');

  if (!response.data.isSuccess) {
    throw new Error(response.data.errors?.[0]?.message ?? 'Bildirimler guncellenemedi.');
  }
}
