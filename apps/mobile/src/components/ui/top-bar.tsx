import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  return (
    <View
      className="bg-white border-b border-gray-100"
      style={{ paddingTop: insets.top }}>
      <View
        className="flex-row items-center justify-between px-4"
        style={{ height: 44 }}>
        {/* ── Sol — Apptivity ── */}
        <View className="items-start">
          {leftContent ?? (
            <Text className="font-sans-bold text-lg text-primary-600">
              Apptivity
            </Text>
          )}
        </View>

        {/* ── Sağ — Bildirim ── */}
        <View className="flex-row items-center gap-4">
          {rightContent ?? (
            <>
              {!hideNotification && (
                <Pressable
                  hitSlop={hitSlop.md}
                  onPress={() => router.push('/(tabs)/notifications')}>
                  <IconSymbol size={22} name="bell.fill" color="#6B7280" />
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
