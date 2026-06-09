import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Flag, Heart, MapPin, MessageCircle, Users } from 'lucide-react-native';
import { ActivityIndicator, BackHandler, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { applyToEvent, cancelEvent, toggleEventBookmark } from '@/src/api/eventService';
import { ReportModal } from '@/src/components/report-modal';
import { Button } from '@/src/components/ui/button';
import { useDailyRecommendedNext, useEventDetail } from '@/src/hooks/useEvents';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useChatStore } from '@/src/store/useChatStore';
import { useRecommendationFlowStore } from '@/src/store/useRecommendationFlowStore';
import type { ApiEnvelope } from '@/src/types/api';
import type { EventDetail, ParticipationStatus } from '@/src/types/event';
import { getApiErrorMessage } from '@/src/utils/error';
import { formatEventDate, formatEventPrice } from '@/src/utils/event-format';

const { width: windowWidth } = Dimensions.get('window');

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

function getApiErrorCode(error: unknown): string | null {
  if (!isAxiosError<ApiEnvelope<unknown>>(error)) {
    return null;
  }

  return error.response?.data?.errors?.[0]?.code ?? null;
}

export function EventDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; returnToHome?: string; recommendationFlow?: string }>();
  const eventId = params.id ?? '';
  const shouldReturnToHome = params.returnToHome === '1';
  const isRecommendationFlow = params.recommendationFlow === '1';
  const queryClient = useQueryClient();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const toast = useToast();
  const myAccountId = useAuthStore((state) => state.user?.id);
  const unreadCount = useChatStore((state) => state.unreadByEvent[eventId] ?? 0);
  const clearUnread = useChatStore((state) => state.clearUnread);
  const recommendationEventIds = useRecommendationFlowStore((state) => state.eventIds);
  const recommendationCurrentIndex = useRecommendationFlowStore((state) => state.currentIndex);
  const startRecommendationSession = useRecommendationFlowStore((state) => state.startSession);
  const appendRecommendationEvent = useRecommendationFlowStore((state) => state.appendEvent);
  const setRecommendationCurrentIndex = useRecommendationFlowStore((state) => state.setCurrentIndex);
  const resetRecommendationFlow = useRecommendationFlowStore((state) => state.reset);
  const insets = useSafeAreaInsets();
  const dailyRecommendationMutation = useDailyRecommendedNext();
  const screenOptions = useMemo(() => ({ headerShown: false }), []);

  const { data, isPending } = useEventDetail(eventId, {
    refetchIntervalMs: 8000,
  });

  const handleBackNavigation = () => {
    if (shouldReturnToHome || isRecommendationFlow) {
      resetRecommendationFlow();
      router.replace('/(tabs)');
      return;
    }

    router.back();
  };

  useEffect(() => {
    if (!shouldReturnToHome) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      resetRecommendationFlow();
      router.replace('/(tabs)');
      return true;
    });

    return () => subscription.remove();
  }, [resetRecommendationFlow, shouldReturnToHome]);

  useEffect(() => {
    if (!isRecommendationFlow || !eventId) {
      return;
    }

    const existingIndex = recommendationEventIds.indexOf(eventId);

    if (recommendationEventIds.length === 0) {
      startRecommendationSession(eventId);
      return;
    }

    if (existingIndex >= 0) {
      if (existingIndex !== recommendationCurrentIndex) {
        setRecommendationCurrentIndex(existingIndex);
      }
      return;
    }

    startRecommendationSession(eventId);
  }, [
    eventId,
    isRecommendationFlow,
    recommendationCurrentIndex,
    recommendationEventIds,
    setRecommendationCurrentIndex,
    startRecommendationSession,
  ]);


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

      if (getApiErrorCode(error) === 'PART_409') {
        queryClient.setQueryData<EventDetail>(['event-detail', eventId], (current) => current);
        toast.info('Bu etkinlige zaten katildin.');
        return;
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

  const bookmarkMutation = useMutation({
    mutationFn: () => toggleEventBookmark(eventId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['event-detail', eventId] });
      const previous = queryClient.getQueryData<EventDetail>(['event-detail', eventId]);

      if (previous) {
        queryClient.setQueryData<EventDetail>(['event-detail', eventId], {
          ...previous,
          isBookmarkedByCurrentUser: !previous.isBookmarkedByCurrentUser,
        });
      }

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['event-detail', eventId], context.previous);
      }

      toast.error(getApiErrorMessage(error, 'Begeni durumu guncellenemedi.'));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-bookmarks'] });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
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
  const locationLabel = data.location.locationLabel?.trim();
  const fullAddress = data.location.fullAddress?.trim();
  const city = data.location.city?.trim();
  const normalizedLocationLabel = locationLabel?.toLocaleLowerCase('tr-TR');
  const hasCustomLocationDetail = Boolean(
    locationLabel &&
    normalizedLocationLabel !== fullAddress?.toLocaleLowerCase('tr-TR') &&
    normalizedLocationLabel !== city?.toLocaleLowerCase('tr-TR')
  );

  const participationBadge = getParticipationBadge(data.currentUserParticipationStatus);
  const isOwner = Boolean(myAccountId && data.ownerId && myAccountId === data.ownerId);
  const isCancelledEvent = isCancelledStatus(data.status as string | number | null | undefined);
  const canJoin = !data.isPast && !data.isFull;
  const joinButtonDisabled = !canJoin;
  const isJoined =
    data.currentUserParticipationStatus === 'Pending' ||
    data.currentUserParticipationStatus === 'Approved';
  const isApprovedParticipant = data.currentUserParticipationStatus === 'Approved';
  const canOpenChat = isOwner || isApprovedParticipant;
  const isBookmarked = Boolean(data.isBookmarkedByCurrentUser);
  const previousRecommendationEventId = isRecommendationFlow
    ? recommendationEventIds[recommendationCurrentIndex - 1]
    : undefined;
  const nextRecommendationEventId = isRecommendationFlow
    ? recommendationEventIds[recommendationCurrentIndex + 1]
    : undefined;
  const recommendationJoinDisabled = isOwner || isJoined || joinButtonDisabled;


  const photos = data.imageUrls && data.imageUrls.length > 0
    ? data.imageUrls
    : [data.bannerImageUrl ?? PLACEHOLDER_IMAGE];

  const navigateWithinRecommendationFlow = (targetEventId: string) => {
    router.replace({
      pathname: '/event/[id]',
      params: {
        id: targetEventId,
        recommendationFlow: '1',
        returnToHome: '1',
      },
    });
  };

  const navigateToRecommendationDone = (message?: string | null) => {
    router.replace({
      pathname: '/recommendation/done',
      params: {
        message: message?.trim() || 'Simdilik bu kadar onerimiz var senin icin.',
      },
    });
  };

  const handlePreviousRecommendationPress = () => {
    if (!previousRecommendationEventId) {
      return;
    }

    setRecommendationCurrentIndex(recommendationCurrentIndex - 1);
    navigateWithinRecommendationFlow(previousRecommendationEventId);
  };

  const handleNextRecommendationPress = async () => {
    if (nextRecommendationEventId) {
      setRecommendationCurrentIndex(recommendationCurrentIndex + 1);
      navigateWithinRecommendationFlow(nextRecommendationEventId);
      return;
    }

    try {
      const result = await dailyRecommendationMutation.mutateAsync(undefined);
      if (result.status === 'served' && result.event) {
        if (recommendationEventIds.includes(result.event.id)) {
          navigateToRecommendationDone();
          return;
        }

        appendRecommendationEvent(result.event.id);
        navigateWithinRecommendationFlow(result.event.id);
        return;
      }

      if (result.status === 'depleted') {
        navigateToRecommendationDone(result.message);
        return;
      }

      toast.error(result.message ?? 'Su anda yeni oneri alinamadi.');
    } catch {
      toast.error('Siradaki oneri alinamadi.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={screenOptions} />
      <ScrollView contentContainerStyle={{ paddingBottom: isRecommendationFlow ? 132 : 40 }}>
        <View style={{ height: 280 }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {photos.map((url, index) => (
              <Image
                key={`${url}-${index}`}
                source={{ uri: url }}
                style={{ width: windowWidth, height: 280 }}
                contentFit="cover"
                transition={180}
              />
            ))}
          </ScrollView>
          <Pressable
            className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-black/35"
            style={{ top: insets.top + 8 }}
            onPress={handleBackNavigation}>
            <ArrowLeft size={18} color="#ffffff" />
          </Pressable>
        </View>

        <View className="gap-5 px-5 pt-5">
          <View className="gap-2">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-2xl font-bold text-slate-900">{data.title}</Text>
              <View className="flex-row items-center gap-2">
                {canOpenChat ? (
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
                    onPress={() => {
                      clearUnread(eventId);
                      router.push({
                        pathname: '/event/[id]/chat',
                        params: { id: eventId, eventId, joined: isOwner ? '1' : undefined },
                      });
                    }}>
                    <MessageCircle size={18} color="#0f172a" />
                    {unreadCount > 0 ? (
                      <View className="absolute -right-0.5 -top-0.5 min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1">
                        <Text className="text-[10px] font-semibold text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                ) : null}
                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
                  disabled={bookmarkMutation.isPending}
                  onPress={() => bookmarkMutation.mutate()}>
                  <Heart
                    size={18}
                    color={isBookmarked ? '#ef4444' : '#0f172a'}
                    fill={isBookmarked ? '#ef4444' : 'transparent'}
                  />
                </Pressable>
                {!isOwner ? (
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
                    onPress={() => setIsReportModalOpen(true)}>
                    <Flag size={18} color="#ef4444" />
                  </Pressable>
                ) : null}
              </View>
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
                {data.time.slice(0, 5)} - {data.durationMinutes} dk
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

          {hasCustomLocationDetail ? (
            <View className="rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-base font-semibold text-slate-900">Konum Detayi</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-700">{locationLabel}</Text>
            </View>
          ) : null}

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
            <Text className="text-base font-semibold text-slate-900">Sahibi</Text>
            <Text className="mt-2 text-sm text-slate-700">{data.organizerName}</Text>
            {data.organizerType ? (
              <Text className="mt-1 text-xs uppercase text-slate-500">{data.organizerType}</Text>
            ) : null}
          </View>

          <Pressable
            className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
            onPress={() =>
              router.push({
                pathname: '/event/[id]/participants' as const,
                params: { id: eventId },
              } as never)
            }>
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Users size={18} color="#2563eb" />
              </View>
              <View>
                <Text className="text-base font-semibold text-slate-900">
                  {isOwner ? 'Katilimci Yonetimi' : 'Katilimcilar'}
                </Text>
                <Text className="text-xs text-slate-500">
                  {data.participantCount}/{data.capacity} katilimci
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </Pressable>

          {!isRecommendationFlow ? (
            <>
              {!isOwner ? (
                !isJoined ? (
                  <Button
                    label="Etkinlige Katil"
                    isLoading={joinMutation.isPending}
                    disabled={joinButtonDisabled}
                    className="bg-blue-600"
                    onPress={() => joinMutation.mutate()}
                  />
                ) : null
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
            </>
          ) : null}
        </View>
      </ScrollView>
      {isRecommendationFlow ? (
        <View
          className="absolute inset-x-0 flex-row items-center justify-center gap-4"
          style={{
            bottom: insets.bottom + 12,
          }}>
          <Pressable
            accessibilityLabel="Onceki oneri"
            className="h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100"
            disabled={!previousRecommendationEventId}
            onPress={handlePreviousRecommendationPress}
            style={{ opacity: previousRecommendationEventId ? 1 : 0 }}>
            <ArrowLeft size={20} color="#0f172a" />
          </Pressable>
          <Pressable
            accessibilityLabel="Etkinlige katil"
            className="h-16 w-16 items-center justify-center rounded-full bg-blue-600"
            disabled={recommendationJoinDisabled || joinMutation.isPending}
            onPress={() => joinMutation.mutate()}
            style={{
              opacity: recommendationJoinDisabled && !joinMutation.isPending ? 0.45 : 1,
            }}>
            {joinMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Check size={24} color="#ffffff" />
            )}
          </Pressable>
          <Pressable
            accessibilityLabel="Siradaki oneri"
            className="h-14 w-14 items-center justify-center rounded-full bg-emerald-600"
            disabled={dailyRecommendationMutation.isPending}
            onPress={handleNextRecommendationPress}
            style={{ opacity: dailyRecommendationMutation.isPending ? 0.6 : 1 }}>
            {dailyRecommendationMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ArrowRight size={20} color="#ffffff" />
            )}
          </Pressable>
        </View>
      ) : null}
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

