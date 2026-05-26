import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '@/src/hooks/useNotifications';
import { getApiErrorMessage } from '@/src/utils/error';
import { useToast } from '@/src/hooks/useToast';

function formatNotificationDate(value: string): string {
  try {
    return format(parseISO(value), 'd MMMM yyyy HH:mm', { locale: tr });
  } catch {
    return value;
  }
}

export function NotificationsScreen() {
  const toast = useToast();
  const notificationsQuery = useNotifications(50);
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const handleMarkAsRead = (notificationId: string, isRead: boolean) => {
    if (isRead || markAsReadMutation.isPending) {
      return;
    }

    markAsReadMutation.mutate(notificationId, {
      onError: (error) => {
        toast.error(getApiErrorMessage(error, 'Bildirim guncellenemedi.'));
      },
    });
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0 || markAllAsReadMutation.isPending) {
      return;
    }

    markAllAsReadMutation.mutate(undefined, {
      onError: (error) => {
        toast.error(getApiErrorMessage(error, 'Bildirimler guncellenemedi.'));
      },
    });
  };

  if (notificationsQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FlatList
        className="flex-1"
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-8 pt-6"
        ListHeaderComponent={
          <View className="mb-4 gap-4">
            <View className="rounded-2xl bg-white p-4 border border-slate-200">
              <Text className="text-2xl font-bold text-slate-900">Bildirimler</Text>
              <Text className="mt-1 text-sm text-slate-500">Okunmamis: {unreadCount}</Text>
              <Button
                className="mt-4"
                variant="secondary"
                label="Tumunu okundu isaretle"
                isLoading={markAllAsReadMutation.isPending}
                onPress={handleMarkAllAsRead}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            className={`mb-3 rounded-2xl border p-4 ${item.isRead ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50'}`}
            onPress={() => handleMarkAsRead(item.id, item.isRead)}>
            <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-700">{item.content}</Text>
            <Text className="mt-3 text-xs text-slate-500">{formatNotificationDate(item.createdAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-sm text-slate-500">Henuz bildirimin yok.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isRefetching}
            onRefresh={() => notificationsQuery.refetch()}
          />
        }
      />
    </SafeAreaView>
  );
}
