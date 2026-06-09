import { Image } from 'expo-image';
import { CalendarDays, MapPin } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { EventListItem } from '@/src/types/event';
import { formatEventDate, formatLocationShort } from '@/src/utils/event-format';

interface EventCardProps {
  event: EventListItem;
  onPress: (eventId: string) => void;
  compact?: boolean;
}

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80';

export function EventCard({ event, onPress }: EventCardProps) {
  const locationText = formatLocationShort(event.location);
  const primaryTag = event.tags[0]?.name ?? 'ETKİNLİK';

  return (
    <Pressable
      className="overflow-hidden rounded-[14px] border border-gray-200 bg-white"
      onPress={() => onPress(event.id)}>
      
      <View className="relative h-[130px] bg-[#0f1b2d] items-center justify-center">
        <Image
          source={{ uri: event.bannerImageUrl ?? PLACEHOLDER_IMAGE }}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          contentFit="cover"
          transition={150}
        />
        
        <View className="absolute top-2.5 left-2.5 bg-black/30 px-2 py-[3px] rounded-md">
          <Text className="text-[10px] font-bold text-white tracking-wide uppercase">
            {primaryTag}
          </Text>
        </View>
      </View>

      <View className="px-3.5 py-3">
        <Text className="text-[15px] font-semibold text-gray-900 mb-1.5" numberOfLines={1}>
          {event.title}
        </Text>

        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <CalendarDays size={13} color="#6B7280" />
            <Text className="text-xs text-gray-500">
              {formatEventDate(event.date)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1 flex-1">
            <MapPin size={13} color="#6B7280" />
            <Text className="text-xs text-gray-500" numberOfLines={1}>
              {locationText}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
