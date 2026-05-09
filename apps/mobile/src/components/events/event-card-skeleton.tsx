import { View } from 'react-native';

export function EventCardSkeleton() {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className="h-44 bg-slate-200" />
      <View className="gap-3 p-4">
        <View className="h-5 w-2/3 rounded bg-slate-200" />
        <View className="h-4 w-1/2 rounded bg-slate-200" />
        <View className="h-4 w-3/4 rounded bg-slate-200" />
        <View className="h-4 w-1/3 rounded bg-slate-200" />
      </View>
    </View>
  );
}
