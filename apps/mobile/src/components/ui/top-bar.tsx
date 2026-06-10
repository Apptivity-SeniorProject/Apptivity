import { Image } from 'expo-image';

import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNotifications } from '@/src/hooks/useNotifications';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { hitSlop } from '@/src/constants/theme';

interface TopBarProps {
  /** Sol taraftaki özel bileşen (geri butonu, ikon vb.) */
  leftContent?: React.ReactNode;
  /** Sağ taraftaki özel bileşen — varsayılan: bildirim + Apptivity */
  rightContent?: React.ReactNode;
  /** Bildirim ikonunu gizle */
  hideNotification?: boolean;
}

export function TopBar({ leftContent, rightContent, hideNotification }: TopBarProps) {
  const insets = useSafeAreaInsets();
  
  // Sadece TopBar gösteriliyorsa ve gizlenmemişse çağırıyoruz
  const notificationsQuery = useNotifications(50);
  const unreadCount = !hideNotification 
    ? (notificationsQuery.data?.items ?? []).filter((item) => !item.isRead).length 
    : 0;

  return (
    <View
      className="bg-white"
      style={{ paddingTop: insets.top }}>
      <View
        className="flex-row items-center justify-between px-4"
        style={{ height: 44 }}>
        {/* ── Sol — Apptivity ── */}
        <View className="items-start">
          {leftContent ?? (
            <View className="flex-row items-center gap-2">
              <Image 
                source={require('@/assets/apptivity/apptivity_logo.svg')} 
                style={{ width: 26, height: 26 }} 
                contentFit="contain" 
              />
              <Text className="font-sans-bold text-lg text-primary-600">
                Apptivity
              </Text>
            </View>
          )}
        </View>

        {/* ── Sağ — Bildirim ── */}
        <View className="flex-row items-center gap-4">
          {rightContent ?? (
            <>
              {!hideNotification && (
                <Pressable
                  className="relative"
                  hitSlop={hitSlop.md}
                  onPress={() => router.push('/(tabs)/notifications')}>
                  <IconSymbol size={22} name="bell.fill" color="#6B7280" />
                  {unreadCount > 0 && (
                    <View className="absolute -right-2 -top-1.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] px-1 border border-white">
                      <Text className="text-[9px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
