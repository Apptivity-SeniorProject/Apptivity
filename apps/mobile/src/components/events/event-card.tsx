import { Image } from 'expo-image';
import { CalendarDays, MapPin, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { EventListItem } from '@/src/types/event';
import { formatEventDate, formatEventPrice } from '@/src/utils/event-format';

interface EventCardProps {
  event: EventListItem;
  onPress: (eventId: string) => void;
}

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80';

export function EventCard({ event, onPress }: EventCardProps) {
  const locationText =
    event.location.locationLabel ?? event.location.city ?? event.location.fullAddress ?? 'Lokasyon belirtilmedi';

  const participationStatusLabel =
    event.currentUserParticipationStatus === 'Pending'
      ? 'Onay bekliyor'
      : event.currentUserParticipationStatus === 'Approved'
        ? 'Katilim onayli'
        : event.currentUserParticipationStatus === 'Rejected'
          ? 'Katilim reddedildi'
          : undefined;

  return (
    <Pressable className="overflow-hidden rounded-2xl border border-slate-200 bg-white" onPress={() => onPress(event.id)}>
      <Image
        source={{ uri: event.bannerImageUrl ?? PLACEHOLDER_IMAGE }}
        style={{ width: '100%', height: 180 }}
        contentFit="cover"
        transition={150}
      />

      <View className="gap-3 p-4">
        <Text className="text-lg font-semibold text-slate-900">{event.title}</Text>

        <View className="flex-row items-center gap-2">
          <CalendarDays size={16} color="#64748B" />
          <Text className="text-sm text-slate-600">{formatEventDate(event.date)}</Text>
          <Text className="text-sm text-slate-400">•</Text>
          <Text className="text-sm text-slate-600">{event.time.slice(0, 5)}</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <MapPin size={16} color="#64748B" />
          <Text className="flex-1 text-sm text-slate-600" numberOfLines={1}>
            {locationText}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-blue-700">
            {formatEventPrice(event.price, event.isPaid)}
          </Text>
          {event.capacity > 0 ? (
            <View className="flex-row items-center gap-1">
              <Users size={15} color="#64748B" />
              <Text className="text-xs text-slate-600">
                {event.remainingParticipationCount}/{event.capacity}
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="text-xs text-slate-500">Organizatör: {event.organizerName}</Text>
        {participationStatusLabel ? (
          <Text className="text-xs font-semibold text-amber-700">{participationStatusLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
