import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarDays, Clock3, Flag, MapPin, MessageCircle, Users } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { applyToEvent, cancelEvent, withdrawFromEvent } from '@/src/api/eventService';
import { ReportModal } from '@/src/components/report-modal';
import { Button } from '@/src/components/ui/button';
import { useEventDetail, useEventParticipants } from '@/src/hooks/useEvents';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useChatStore } from '@/src/store/useChatStore';
import type { EventDetail, ParticipationStatus } from '@/src/types/event';
import { getApiErrorMessage } from '@/src/utils/error';
import { formatEventDate, formatEventPrice } from '@/src/utils/event-format';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80';

function getParticipationBadge(status?: ParticipationStatus | null): {
  text: string;
  className: string;
} | null {
  if (!status || status === 'Withdrawn') {
    return null;
  }

  if (status === 'Pending') {
    return { text: 'Durum: Onay bekliyor', className: 'bg-amber-100 text-amber-700' };
  }

  if (status === 'Approved') {
    return { text: 'Durum: Katilim onaylandi', className: 'bg-emerald-100 text-emerald-700' };
  }

  if (status === 'Rejected') {
    return { text: 'Durum: Katilim reddedildi', className: 'bg-rose-100 text-rose-700' };
  }

  return null;
}

function applyOptimisticState(current: EventDetail, targetStatus: ParticipationStatus): EventDetail {
  if (targetStatus === 'Pending') {
    return {
      ...current,
      currentUserParticipationStatus: 'Pending',
      remainingParticipationCount: Math.max(0, current.remainingParticipationCount - 1),
      participantCount: Math.min(current.capacity, current.participantCount + 1),
      isFull: current.remainingParticipationCount - 1 <= 0,
    };
  }

  return {
    ...current,
    currentUserParticipationStatus: 'Withdrawn',
    remainingParticipationCount: Math.min(current.capacity, current.remainingParticipationCount + 1),
    participantCount: Math.max(0, current.participantCount - 1),
    isFull: false,
  };
}

function isCancelledStatus(status: string | number | null | undefined): boolean {
  if (typeof status === 'string') {
    return status.toLowerCase() === 'cancelled';
  }

  if (typeof status === 'number') {
    return status === 5;
  }

  return false;
}

export function EventDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = params.id ?? '';
  const queryClient = useQueryClient();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const toast = useToast();
  const myAccountId = useAuthStore((state) => state.user?.id);
  const unreadCount = useChatStore((state) => state.unreadByEvent[eventId] ?? 0);
  const clearUnread = useChatStore((state) => state.clearUnread);
  const insets = useSafeAreaInsets();

  const { data, isPending } = useEventDetail(eventId);
  const participantsQuery = useEventParticipants(eventId);

  const joinMutation = useMutation({
    mutationFn: () => applyToEvent(eventId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['event-detail', eventId] });
      const previous = queryClient.getQueryData<EventDetail>(['event-detail', eventId]);

      if (previous) {
        queryClient.setQueryData<EventDetail>(
          ['event-detail', eventId],
          applyOptimisticState(previous, 'Pending')
        );
      }

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['event-detail', eventId], context.previous);
      }
      toast.error(getApiErrorMessage(error));
    },
    onSuccess: (status) => {
      queryClient.setQueryData<EventDetail>(['event-detail', eventId], (current) => {
        if (!current) return current;
        return { ...current, currentUserParticipationStatus: status };
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['event-participants', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['my-participations'] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawFromEvent(eventId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['event-detail', eventId] });
      const previous = queryClient.getQueryData<EventDetail>(['event-detail', eventId]);

      if (previous) {
        queryClient.setQueryData<EventDetail>(
          ['event-detail', eventId],
          applyOptimisticState(previous, 'Withdrawn')
        );
      }

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['event-detail', eventId], context.previous);
      }
      toast.error(getApiErrorMessage(error));
    },
    onSuccess: (status) => {
      queryClient.setQueryData<EventDetail>(['event-detail', eventId], (current) => {
        if (!current) return current;
        return { ...current, currentUserParticipationStatus: status };
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['event-participants', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['my-participations'] });
    },
  });

  const cancelEventMutation = useMutation({
    mutationFn: () => cancelEvent(eventId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['my-events'] }),
        queryClient.invalidateQueries({ queryKey: ['my-participations'] }),
        queryClient.invalidateQueries({ queryKey: ['my-bookmarks'] }),
        queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] }),
      ]);
      toast.success('Etkinlik silindi.');
      router.replace('/(tabs)');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Etkinlik silinemedi.'));
    },
  });

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-base text-slate-500">Etkinlik detayi yuklenemedi.</Text>
      </View>
    );
  }

  const locationText =
    data.location.fullAddress ?? data.location.locationLabel ?? data.location.city ?? 'Lokasyon belirtilmedi';

  const participationBadge = getParticipationBadge(data.currentUserParticipationStatus);
  const isOwner = Boolean(myAccountId && data.ownerId && myAccountId === data.ownerId);
  const isCancelledEvent = isCancelledStatus(data.status as string | number | null | undefined);
  const isJoined =
    data.currentUserParticipationStatus === 'Pending' || data.currentUserParticipationStatus === 'Approved';
  const canOpenChat = data.currentUserParticipationStatus === 'Approved';
  const canJoin = !data.isPast && !data.isFull;
  const joinButtonDisabled = !canJoin && !isJoined;
  const actionLoading = joinMutation.isPending || withdrawMutation.isPending;
  const approvedParticipants = participantsQuery.data?.participants.filter(
    (participant) => participant.status === 'Approved'
  ) ?? [];
  const pendingParticipants = participantsQuery.data?.participants.filter(
    (participant) => participant.status === 'Pending'
  ) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerClassName="pb-10">
        <View>
          <Image
            source={{ uri: data.bannerImageUrl ?? PLACEHOLDER_IMAGE }}
            style={{ width: '100%', height: 280 }}
            contentFit="cover"
            transition={180}
          />
          <Pressable
            className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-black/35"
            style={{ top: insets.top + 8 }}
            onPress={() => router.back()}>
            <ArrowLeft size={18} color="#ffffff" />
          </Pressable>
        </View>

        <View className="gap-5 px-5 pt-5">
          <View className="gap-2">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-2xl font-bold text-slate-900">{data.title}</Text>
              {!isOwner ? (
                <Pressable onPress={() => setIsReportModalOpen(true)}>
                  <Flag size={20} color="#ef4444" />
                </Pressable>
              ) : null}
            </View>
            <Text className="text-sm text-slate-500">
              {data.primaryTagName ? `Kategori: ${data.primaryTagName}` : 'Kategori belirtilmedi'}
            </Text>
            {participationBadge ? (
              <Text
                className={
                  participationBadge.className === 'bg-amber-100 text-amber-700'
                    ? 'self-start rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'
                    : participationBadge.className === 'bg-emerald-100 text-emerald-700'
                      ? 'self-start rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
                      : 'self-start rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700'
                }>
                {participationBadge.text}
              </Text>
            ) : null}
          </View>

          <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center gap-2">
              <CalendarDays size={16} color="#64748B" />
              <Text className="text-sm text-slate-700">{formatEventDate(data.date)}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Clock3 size={16} color="#64748B" />
              <Text className="text-sm text-slate-700">
                {data.time.slice(0, 5)} • {data.durationMinutes} dk
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <MapPin size={16} color="#64748B" />
              <Text className="flex-1 text-sm text-slate-700">{locationText}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Users size={16} color="#64748B" />
              <Text className="text-sm text-slate-700">
                Katilimci: {data.participantCount}/{data.capacity}
              </Text>
            </View>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-semibold text-slate-900">Fiyat</Text>
            <Text className="mt-2 text-lg font-bold text-blue-700">
              {formatEventPrice(data.price, data.isPaid)}
            </Text>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-semibold text-slate-900">Aciklama</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-700">{data.description}</Text>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-semibold text-slate-900">Organizator</Text>
            <Text className="mt-2 text-sm text-slate-700">{data.organizerName}</Text>
            {data.organizerType ? (
              <Text className="mt-1 text-xs uppercase text-slate-500">{data.organizerType}</Text>
            ) : null}
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-semibold text-slate-900">Katilim Durumlari</Text>
            <View className="mt-3 flex-row gap-2">
              <View className="rounded-full bg-emerald-100 px-3 py-1">
                <Text className="text-xs font-semibold text-emerald-700">
                  Approved: {approvedParticipants.length}
                </Text>
              </View>
              <View className="rounded-full bg-amber-100 px-3 py-1">
                <Text className="text-xs font-semibold text-amber-700">
                  Pending: {pendingParticipants.length}
                </Text>
              </View>
            </View>
            <View className="mt-3 gap-2">
              {(participantsQuery.data?.participants ?? []).slice(0, 6).map((participant) => (
                <View
                  key={participant.accountId}
                  className="flex-row items-center justify-between rounded-xl bg-slate-100 px-3 py-2">
                  <Text className="text-sm text-slate-800">{participant.displayName}</Text>
                  <Text className="text-xs font-semibold text-slate-600">
                    {participant.status ?? 'N/A'}
                  </Text>
                </View>
              ))}
              {(participantsQuery.data?.participants ?? []).length === 0 ? (
                <Text className="text-xs text-slate-500">Henuz katilimci bulunmuyor.</Text>
              ) : null}
            </View>
          </View>

          <Button
            label={canOpenChat ? (unreadCount > 0 ? `Sohbete Git (${unreadCount} yeni)` : 'Sohbete Git') : 'Sohbet Kilitli'}
            className={canOpenChat ? 'bg-slate-900' : 'bg-slate-300'}
            textClassName={canOpenChat ? 'text-white' : 'text-slate-600'}
            disabled={!canOpenChat}
            onPress={() => {
              clearUnread(eventId);
              router.push(`/event/${eventId}/chat`);
            }}
          />
          {!canOpenChat ? (
            <View className="flex-row items-center gap-2">
              <MessageCircle size={14} color="#64748B" />
              <Text className="text-xs text-slate-500">Sohbet sadece onayli katilimcilara aciktir.</Text>
            </View>
          ) : null}

          {!isOwner ? (
            <Button
              label={isJoined ? 'Ayril' : 'Katil'}
              isLoading={actionLoading}
              disabled={joinButtonDisabled}
              className={isJoined ? 'bg-rose-600' : 'bg-blue-600'}
              onPress={() => {
                if (isJoined) {
                  withdrawMutation.mutate();
                  return;
                }
                joinMutation.mutate();
              }}
            />
          ) : !isCancelledEvent ? (
            <Button
              label="Etkinligi Sil"
              isLoading={cancelEventMutation.isPending}
              className="bg-rose-700"
              onPress={() => cancelEventMutation.mutate()}
            />
          ) : null}

          {isOwner && isCancelledEvent ? (
            <Text className="text-center text-xs text-slate-500">
              Bu etkinlik zaten iptal edilmis.
            </Text>
          ) : null}

          {!isOwner && !canJoin && !isJoined ? (
            <Text className="text-center text-xs text-rose-600">
              Bu etkinlige katilim su an mumkun degil (kontenjan dolu veya etkinlik gecmis).
            </Text>
          ) : null}
        </View>
      </ScrollView>
      {!isOwner ? (
        <ReportModal
          visible={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetId={eventId}
          targetType={1}
        />
      ) : null}
    </SafeAreaView>
  );
}
