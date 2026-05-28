import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout } from '@/src/constants/theme';

interface TopBarProps {
  /** Sol taraftaki özel bileşen (geri butonu, ikon vb.) */
  leftContent?: React.ReactNode;
  /** Sağ taraftaki özel bileşen (bildirim, ayarlar vb.) */
  rightContent?: React.ReactNode;
}

export function TopBar({ leftContent, rightContent }: TopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-white border-b border-gray-100"
      style={{ paddingTop: insets.top }}>
      <View
        className="flex-row items-center justify-between px-4"
        style={{ height: layout.headerHeight }}>
        {/* ── Sol ── */}
        <View className="min-w-[40px] items-start">
          {leftContent ?? null}
        </View>

        {/* ── Sağ — Apptivity Branding ── */}
        <View className="flex-row items-center gap-2">
          {rightContent ?? (
            <Text className="font-sans-bold text-lg text-primary-600">
              Apptivity
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
