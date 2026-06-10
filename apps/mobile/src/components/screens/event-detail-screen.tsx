import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Flag, Heart, MapPin, MessageCircle, UserCheck, Users } from 'lucide-react-native';
import { ActivityIndicator, BackHandler, Dimensions, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, type Region } from 'react-native-maps';

import { applyToEvent, cancelEvent, toggleEventBookmark } from '@/src/api/eventService';
import { ReportModal } from '@/src/components/report-modal';
import { Button } from '@/src/components/ui/button';
import { useDailyRecommendedNext, useEventDetail, useEventParticipants } from '@/src/hooks/useEvents';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useChatStore } from '@/src/store/useChatStore';
import { useRecommendationFlowStore } from '@/src/store/useRecommendationFlowStore';
import type { ApiEnvelope } from '@/src/types/api';
import type { EventDetail, ParticipationStatus } from '@/src/types/event';
import { getApiErrorMessage } from '@/src/utils/error';
import { formatEventDate, formatEventPrice } from '@/src/utils/event-format';
import { TopBar } from '@/src/components/ui/top-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { hitSlop } from '@/src/constants/theme';

const { width: windowWidth } = Dimensions.get('window');

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80';
const PLACEHOLDER_AVATAR = 'https://ui-avatars.com/api/?background=e2e8f0&color=475569&bold=true&size=80';

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

function getReputationDisplay(level: string | null | undefined) {
  if (!level) return null;

  if (
    level.includes('YÄ±ldÄ±z') ||
    level.includes('YÃ„Â±ldÃ„Â±z') ||
    level.toLowerCase().includes('yildiz')
  ) {
    return { label: level, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' };
  }

  switch (level) {
    case 'Pariah':
      return { label: 'Etkinlik Bozan', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
    case 'Suspicious':
      return { label: 'Gelmese mi ya ?', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    case 'Neutral':
      return { label: 'Normal görünüyor', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
    case 'Trusted':
      return { label: 'Gelsin kanka', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    case 'Exemplary':
      return { label: 'Etkinlik Canavarı', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
    default:
      return { label: level, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  }
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState(0);
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


  const { data, isPending, refetch, isRefetching } = useEventDetail(eventId, {});
  const participantsQuery = useEventParticipants(eventId);
  const photoCount = data?.imageUrls?.length ? data.imageUrls.length : 1;

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [eventId, photoCount]);

  useEffect(() => {
    if (!isPhotoViewerOpen) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsPhotoViewerOpen(false);
      return true;
    });

    return () => subscription.remove();
  }, [isPhotoViewerOpen]);

  const handleBackNavigation = useCallback(() => {
    if (shouldReturnToHome || isRecommendationFlow) {
      resetRecommendationFlow();
      router.replace('/(tabs)');
      return;
    }

    router.back();
  }, [shouldReturnToHome, isRecommendationFlow, resetRecommendationFlow]);

  const screenOptions = useMemo(() => ({
    header: () => (
      <TopBar 
        leftContent={
          <View className="flex-row items-center gap-2">
            <Pressable onPress={handleBackNavigation} hitSlop={hitSlop.md} className="flex-row items-center justify-center pl-2">
              <IconSymbol name="chevron.left" size={28} color="#111827" />
            </Pressable>
            <View className="flex-row items-center gap-2">
              <Image 
                source={require('@/assets/apptivity/apptivity_logo.svg')} 
                style={{ width: 26, height: 26 }} 
                contentFit="contain" 
              />
              <Text className="font-sans-bold text-lg text-primary-600">
                Apptivity
              </Text>
            </View>
          </View>
        }
      />
    )
  }), [handleBackNavigation]);

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
  const latitude = data.location.lat;
  const longitude = data.location.lng;
  const normalizedLocationLabel = locationLabel?.toLocaleLowerCase('tr-TR');
  const hasCustomLocationDetail = Boolean(
    locationLabel &&
    normalizedLocationLabel !== fullAddress?.toLocaleLowerCase('tr-TR') &&
    normalizedLocationLabel !== city?.toLocaleLowerCase('tr-TR')
  );
  const hasMapCoordinate = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapPreviewRegion: Region | null = hasMapCoordinate
    ? {
        latitude: latitude as number,
        longitude: longitude as number,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }
    : null;

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
  const organizerParticipant = participantsQuery.data?.organizer;
  const organizerAccountId = organizerParticipant?.accountId ?? data.ownerId;
  const organizerAvatarUri = organizerParticipant?.profilePhoto || data.organizerProfilePhoto
    ? organizerParticipant?.profilePhoto || data.organizerProfilePhoto
    : `${PLACEHOLDER_AVATAR}&name=${encodeURIComponent(data.organizerName || 'U')}`;
  const organizerUsername = organizerParticipant?.username?.trim();
  const organizerReputation = !isOwner ? getReputationDisplay(organizerParticipant?.reputationLevel) : null;
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

  const handleOpenExternalMap = async () => {
    if (!hasMapCoordinate) {
      return;
    }

    const label = encodeURIComponent(data.title);
    const lat = latitude as number;
    const lng = longitude as number;
    const nativeUrl =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    try {
      const canOpenNative = await Linking.canOpenURL(nativeUrl);
      await Linking.openURL(canOpenNative ? nativeUrl : webUrl);
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={screenOptions} />
      <ScrollView 
        contentContainerStyle={{ paddingBottom: isRecommendationFlow ? 132 : 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ height: 280 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
              setCurrentPhotoIndex(Math.max(0, Math.min(nextIndex, photos.length - 1)));
            }}>
            {photos.map((url, index) => (
              <Pressable
                key={`${url}-${index}`}
                onLongPress={() => {
                  setViewerPhotoIndex(index);
                  setIsPhotoViewerOpen(true);
                }}>
                <Image
                  source={{ uri: url }}
                  style={{ width: windowWidth, height: 280 }}
                  contentFit="cover"
                  transition={180}
                />
              </Pressable>
            ))}
          </ScrollView>
          {photos.length > 1 ? (
            <View className="absolute inset-x-0 bottom-4 flex-row items-center justify-center gap-2">
              {photos.map((_, index) => {
                const isActive = index === currentPhotoIndex;

                return (
                  <View
                    key={`photo-dot-${index}`}
                    className={`rounded-full ${isActive ? 'bg-primary-500' : 'bg-white/45'}`}
                    style={{
                      width: isActive ? 10 : 7,
                      height: isActive ? 10 : 7,
                    }}
                  />
                );
              })}
            </View>
          ) : null}
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
            <View className="border-t border-slate-100 pt-3">
              <Text className="text-lg font-bold text-[#357c1c]">
                {formatEventPrice(data.price, data.isPaid)}
              </Text>
            </View>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-semibold text-slate-900">Aciklama</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-700">{data.description}</Text>
          </View>

          {mapPreviewRegion ? (
            <Pressable
              className="rounded-2xl border border-slate-200 bg-white p-4"
              onPress={handleOpenExternalMap}>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900">Haritadaki Konum</Text>
                  <Text className="mt-1 text-sm text-slate-500">Dokununca harita uygulamasinda acilir</Text>
                </View>
                <View className="self-start rounded-full bg-[#f0fce8] px-2.5 py-1">
                  <Text className="text-xs font-semibold text-[#357c1c]">Haritada Aç</Text>
                </View>
              </View>
              <View className="mt-3 overflow-hidden rounded-2xl border border-slate-200" pointerEvents="none">
                <MapView
                  style={{ height: 220 }}
                  initialRegion={mapPreviewRegion}
                  region={mapPreviewRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}>
                  <Marker
                    coordinate={{
                      latitude: latitude as number,
                      longitude: longitude as number,
                    }}
                    pinColor="#5bcc2a"
                  />
                </MapView>
              </View>
              {hasCustomLocationDetail ? (
                <Text className="mt-3 text-sm leading-6 text-slate-700">{locationLabel}</Text>
              ) : null}
            </Pressable>
          ) : null}

          <View className="gap-2">
            <View className="flex-row items-center gap-2 px-1 pb-1">
              <UserCheck size={16} color="#334155" />
              <Text className="text-sm font-semibold text-slate-700">Etkinlik Sahibi</Text>
            </View>
            <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Pressable
                className="flex-row items-center"
                disabled={!organizerAccountId}
                onPress={() => {
                  if (!organizerAccountId) {
                    return;
                  }

                  router.push(`/user/${organizerAccountId}`);
                }}>
                <Image
                  source={{ uri: organizerAvatarUri }}
                  style={{ width: 44, height: 44, borderRadius: 22 }}
                  contentFit="cover"
                  transition={120}
                />
                <View className="ml-3 flex-1">
                  <Text className="flex-shrink text-sm font-semibold text-slate-900">
                    {data.organizerName}
                  </Text>
                  {organizerUsername ? (
                    <Text className="text-xs text-slate-500">@{organizerUsername}</Text>
                  ) : null}
                </View>
                {organizerReputation ? (
                  <View
                    className={`ml-3 rounded border px-2 py-1 ${organizerReputation.bg} ${organizerReputation.border}`}>
                    <Text className={`text-[10px] font-bold ${organizerReputation.color}`}>
                      {organizerReputation.label}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
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
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#f0fce8]">
                <Users size={18} color="#357c1c" />
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
      {isPhotoViewerOpen ? (
        <Modal
          visible
          animationType="fade"
          presentationStyle="fullScreen"
          statusBarTranslucent
          onRequestClose={() => setIsPhotoViewerOpen(false)}>
          <View className="flex-1 bg-black">
            <ScrollView
              horizontal
              pagingEnabled
              contentOffset={{ x: viewerPhotoIndex * windowWidth, y: 0 }}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
                setViewerPhotoIndex(Math.max(0, Math.min(nextIndex, photos.length - 1)));
              }}>
              {photos.map((url, index) => (
                <View
                  key={`viewer-${url}-${index}`}
                  style={{ width: windowWidth, height: '100%' }}
                  className="items-center justify-center bg-black">
                  <Image
                    source={{ uri: url }}
                    style={{ width: windowWidth, height: '100%' }}
                    contentFit="contain"
                    transition={180}
                  />
                </View>
              ))}
            </ScrollView>
            {photos.length > 1 ? (
              <View
                className="absolute inset-x-0 flex-row items-center justify-center gap-2"
                style={{ bottom: Math.max(insets.bottom, 24) }}>
                {photos.map((_, index) => {
                  const isActive = index === viewerPhotoIndex;

                  return (
                    <View
                      key={`viewer-dot-${index}`}
                      className={`rounded-full ${isActive ? 'bg-primary-500' : 'bg-white/45'}`}
                      style={{
                        width: isActive ? 10 : 7,
                        height: isActive ? 10 : 7,
                      }}
                    />
                  );
                })}
              </View>
            ) : null}
          </View>
        </Modal>
      ) : null}
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
            className="h-16 w-16 items-center justify-center rounded-full bg-primary-500"
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
    </View>
  );
}

