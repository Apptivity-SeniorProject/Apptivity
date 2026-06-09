import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/src/components/ui/button';
import { useEventDetail } from '@/src/hooks/useEvents';
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

function NotificationItem({ 
  item, 
  onMarkAsRead 
}: { 
  item: any; 
  onMarkAsRead: (id: string, isRead: boolean) => void 
}) {
  const { data: event } = useEventDetail(item.relatedEntityId ?? '', { enabled: !!item.relatedEntityId });

  return (
    <Pressable
      className={`mb-3 rounded-2xl border p-3.5 flex-row gap-3 shadow-sm ${
        item.isRead ? 'border-slate-200 bg-white' : 'border-[#77e349] bg-[#f0fce8]'
      }`}
      onPress={() => {
        onMarkAsRead(item.id, item.isRead);
        if (item.relatedEntityId) {
          router.push(`/event/${item.relatedEntityId}`);
        }
      }}>
      
      <View className="h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 border border-slate-200/50">
        {event?.bannerImageUrl ? (
          <Image 
            source={{ uri: event.bannerImageUrl }} 
            style={{ width: '100%', height: '100%' }} 
            contentFit="cover" 
          />
        ) : (
          <IconSymbol name="bell.fill" size={22} color={item.isRead ? "#94a3b8" : "#5bcc2a"} />
        )}
      </View>

      <View className="flex-1 justify-center">
        <Text className="text-[15px] font-semibold text-slate-900">{item.title}</Text>
        <Text className="mt-1 text-[13px] leading-5 text-slate-700">{item.content}</Text>
        <Text className="mt-2 text-[11px] font-medium text-slate-500">{formatNotificationDate(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
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
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#77e349" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        className="flex-1"
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-8 pt-3"
        ListHeaderComponent={
          <View className="mb-4 mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="text-3xl font-extrabold text-slate-900">Bildirimler</Text>
              {unreadCount > 0 && (
                <View className="rounded-full bg-[#f0fce8] border border-[#bbf09e] px-2.5 py-1">
                  <Text className="text-xs font-semibold text-[#357c1c]">{unreadCount} yeni</Text>
                </View>
              )}
            </View>
            <Pressable 
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              className={`h-10 w-10 items-center justify-center rounded-xl border ${
                unreadCount === 0 ? 'bg-slate-100 border-slate-200 opacity-50' : 'bg-white border-slate-200'
              }`}
              onPress={handleMarkAllAsRead}>
              <IconSymbol name="checkmark.done" size={20} color={unreadCount === 0 ? "#94a3b8" : "#357c1c"} />
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <NotificationItem item={item} onMarkAsRead={handleMarkAsRead} />
        )}
        ListEmptyComponent={
          <View className="mt-8 items-center justify-center">
            <View className="h-16 w-16 rounded-3xl bg-slate-100 border border-slate-200 items-center justify-center mb-4">
              <IconSymbol name="bell.slash.fill" size={28} color="#94a3b8" />
            </View>
            <Text className="text-base font-semibold text-slate-800 mb-1">Bildirim Yok</Text>
            <Text className="text-sm text-slate-500 text-center">Henüz sana ulaşan yeni bir bildirim bulunmuyor.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isRefetching}
            onRefresh={() => notificationsQuery.refetch()}
            tintColor="#77e349"
          />
        }
      />
    </View>
  );
}
