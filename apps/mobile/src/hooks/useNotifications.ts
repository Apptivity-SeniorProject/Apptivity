import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/src/api/notificationService';
import type { PagedResult } from '@/src/types/event';
import type { NotificationDto } from '@/src/types/notification';

const NOTIFICATIONS_QUERY_KEY = ['notifications'];

function updateNotificationPages(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (notification: NotificationDto) => NotificationDto
) {
  queryClient.setQueriesData<PagedResult<NotificationDto>>(
    { queryKey: NOTIFICATIONS_QUERY_KEY },
    (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        items: current.items.map(updater),
      };
    }
  );
}

export function useNotifications(pageSize = 30) {
  return useQuery<PagedResult<NotificationDto>>({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, pageSize],
    queryFn: () => getMyNotifications(1, pageSize),
    staleTime: 30000,
    gcTime: 900000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: (updatedNotification) => {
      updateNotificationPages(queryClient, (notification) =>
        notification.id === updatedNotification.id ? updatedNotification : notification
      );
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      updateNotificationPages(queryClient, (notification) => ({
        ...notification,
        isRead: true,
      }));
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
