import { Pressable, Text, View } from 'react-native';

import { cn } from '@/src/utils/cn';
import { useToastStore } from '@/src/store/useToastStore';

export function ToastHost() {
  const visible = useToastStore((state) => state.visible);
  const message = useToastStore((state) => state.message);
  const type = useToastStore((state) => state.type);
  const hideToast = useToastStore((state) => state.hideToast);

  if (!visible || !message) {
    return null;
  }

  return (
    <View className="pointer-events-box-none absolute bottom-8 left-4 right-4 z-50">
      <Pressable
        onPress={hideToast}
        className={cn(
          'rounded-3xl px-4 py-3 shadow-sm',
          type === 'success' && 'bg-emerald-600',
          type === 'error' && 'bg-rose-600',
          type === 'info' && 'bg-slate-900'
        )}>
        <Text className="text-center text-sm font-semibold text-white">{message}</Text>
      </Pressable>
    </View>
  );
}
