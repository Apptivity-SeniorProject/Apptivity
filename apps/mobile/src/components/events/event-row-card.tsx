import { Image } from 'expo-image';
import { MapPin, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { EventListItem } from '@/src/types/event';
import { formatEventPrice } from '@/src/utils/event-format';

interface EventRowCardProps {
  event: EventListItem;
  onPress: (eventId: string) => void;
}

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80';

function resolveLocation(event: EventListItem): string {
  const city = event.location.city?.trim();
  const label = event.location.locationLabel?.trim();
  const fullAddress = event.location.fullAddress?.trim();

  if (city && label) {
    return `${city} / ${label}`;
  }

  return city ?? label ?? fullAddress ?? 'Konum belirtilmedi';
}

export function EventRowCard({ event, onPress }: EventRowCardProps) {
  const location = resolveLocation(event);
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
        <Text className="text-base font-semibold text-slate-900" numberOfLines={2}>
          {event.title}
        </Text>

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
