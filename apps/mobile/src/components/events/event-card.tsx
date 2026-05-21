import { Image } from 'expo-image';
import { CalendarDays, MapPin, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { EventListItem } from '@/src/types/event';
import { formatEventDate, formatEventPrice } from '@/src/utils/event-format';

interface EventCardProps {
  event: EventListItem;
  onPress: (eventId: string) => void;
  compact?: boolean;
}

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80';

export function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const locationText =
    event.location.locationLabel ?? event.location.city ?? event.location.fullAddress ?? 'Lokasyon belirtilmedi';
  const primaryTag = event.tags[0]?.name ?? 'Etkinlik';
  const organizerLabel = event.organizerName?.trim() || 'Organizator';
  const organizerInitial = organizerLabel.charAt(0).toUpperCase();

  const participationStatusLabel =
    event.currentUserParticipationStatus === 'Pending'
      ? 'Onay bekliyor'
      : event.currentUserParticipationStatus === 'Approved'
        ? 'Katilim onayli'
        : event.currentUserParticipationStatus === 'Rejected'
          ? 'Katilim reddedildi'
          : undefined;

  return (
    <Pressable
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      onPress={() => onPress(event.id)}>
      <Image
        source={{ uri: event.bannerImageUrl ?? PLACEHOLDER_IMAGE }}
        style={{ width: '100%', height: compact ? 140 : 180 }}
        contentFit="cover"
        transition={150}
      />

      <View className="gap-3 p-4">
        <View className="self-start rounded-full bg-orange-100 px-3 py-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-orange-700">{primaryTag}</Text>
        </View>

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
          <Text className="text-sm font-semibold text-blue-700">{formatEventPrice(event.price, event.isPaid)}</Text>
          {event.capacity > 0 || event.participantCount > 0 ? (
            <View className="flex-row items-center gap-1">
              <Users size={15} color="#64748B" />
              <Text className="text-xs text-slate-600">{event.participantCount} katilimci</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center gap-2">
          {event.organizerProfilePhoto ? (
            <Image
              source={{ uri: event.organizerProfilePhoto }}
              style={{ width: 28, height: 28, borderRadius: 999 }}
            />
          ) : (
            <View className="h-7 w-7 items-center justify-center rounded-full bg-slate-200">
              <Text className="text-xs font-semibold text-slate-700">{organizerInitial}</Text>
            </View>
          )}
          <Text className="text-xs text-slate-500">Duzenleyen: {organizerLabel}</Text>
        </View>

        {participationStatusLabel ? (
          <Text className="text-xs font-semibold text-amber-700">{participationStatusLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
