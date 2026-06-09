import { Image } from 'expo-image';
import { Heart, MapPin, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { EventListItem } from '@/src/types/event';
import { formatEventPrice, formatLocationShort } from '@/src/utils/event-format';

interface EventRowCardProps {
  event: EventListItem;
  onPress: (eventId: string) => void;
  isBookmarked?: boolean;
  isBookmarkPending?: boolean;
  onBookmarkPress?: (eventId: string) => void;
}

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80';

export function EventRowCard({
  event,
  onPress,
  isBookmarked = false,
  isBookmarkPending = false,
  onBookmarkPress,
}: EventRowCardProps) {
  const location = formatLocationShort(event.location);
  const remainingCount = Math.max(0, event.remainingParticipationCount ?? 0);
  const priceText = event.isPaid ? formatEventPrice(event.price, true) : 'Ucretsiz';

  return (
    <Pressable
      className="flex-row items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"
      onPress={() => onPress(event.id)}>
      <Image
        source={{ uri: event.bannerImageUrl ?? PLACEHOLDER_IMAGE }}
        style={{ width: 88, height: 88, borderRadius: 16 }}
        contentFit="cover"
        transition={120}
      />

      <View className="flex-1 gap-1">
        <View className="flex-row items-start gap-2">
          <Text className="flex-1 text-base font-semibold text-slate-900" numberOfLines={2}>
            {event.title}
          </Text>
          {onBookmarkPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? 'Begeniyi kaldir' : 'Etkinligi begen'}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              disabled={isBookmarkPending}
              onPress={(pressEvent) => {
                pressEvent.stopPropagation?.();
                onBookmarkPress(event.id);
              }}>
              <Heart
                size={18}
                color={isBookmarked ? '#DC2626' : '#64748B'}
                fill={isBookmarked ? '#DC2626' : 'transparent'}
              />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row items-center gap-1">
          <MapPin size={14} color="#64748B" />
          <Text className="flex-1 text-xs text-slate-600" numberOfLines={1}>
            {location}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Users size={14} color="#64748B" />
          <Text className="text-xs text-slate-600">Kalan kontenjan: {remainingCount}</Text>
        </View>

        <Text className="text-xs font-semibold text-blue-700">{priceText}</Text>
      </View>
    </Pressable>
  );
}
