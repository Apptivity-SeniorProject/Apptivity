import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EventCard } from '@/src/components/events/event-card';
import { getFullImageUrl } from '@/src/api/eventService';
import { useProfile, useProfileEvents, useProfileStats } from '@/src/hooks/useProfile';
import type { EventListItem } from '@/src/types/event';
import type { ProfileEventDto } from '@/src/types/profile';
import { cn } from '@/src/utils/cn';
import { colors } from '@/src/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type ProfileTab = 'organized-events' | 'participated-events';

function normalizeAccountType(type?: string | number | null): 'individual' | 'organization' | 'admin' | 'unknown' {
  if (typeof type === 'number') {
    if (type === 1) return 'individual';
    if (type === 2) return 'organization';
    if (type === 3) return 'admin';
    return 'unknown';
  }

  if (typeof type === 'string') {
    const normalized = type.trim().toLowerCase();
    if (normalized === '1' || normalized === 'individual') return 'individual';
    if (normalized === '2' || normalized === 'organization') return 'organization';
    if (normalized === '3' || normalized === 'admin') return 'admin';
  }

  return 'unknown';
}

function isCancelledStatus(status?: string | number | null): boolean {
  if (typeof status === 'string') return status.toLowerCase() === 'cancelled';
  if (typeof status === 'number') return status === 5;
  return false;
}

function isRejectedStatus(status?: string | number | null): boolean {
  if (typeof status === 'string') return status.toLowerCase() === 'rejected';
  if (typeof status === 'number') return status === 7;
  return false;
}

function isHiddenFromActiveTabs(status?: string | number | null): boolean {
  return isCancelledStatus(status) || isRejectedStatus(status);
}

function isPendingApprovalStatus(status?: string | number | null): boolean {
  if (typeof status === 'string') return status.toLowerCase() === 'pendingapproval';
  if (typeof status === 'number') return status === 6;
  return false;
}

function getDisplayName(username: string, name?: string, surname?: string): string {
  const fullName = [name, surname].filter(Boolean).join(' ').trim();
  return fullName || username;
}

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function getReputationLabel(level: string): string {
  switch (level) {
    case 'Pariah': return 'Etkinlik Bozan';
    case 'Suspicious': return 'Gelmese mi ya ?';
    case 'Neutral': return 'Normal görünüyor';
    case 'Trusted': return 'Gelsin kanka';
    case 'Exemplary': return 'Etkinlik Canavarı';
    default: return level;
  }
}

function parseProfileEventLocation(locationData?: string | null) {
  if (!locationData) {
    return {};
  }

  try {
    const parsed = JSON.parse(locationData) as Record<string, unknown>;
    return {
      city: typeof parsed.city === 'string' ? parsed.city : undefined,
      fullAddress:
        typeof parsed.fullAddress === 'string'
          ? parsed.fullAddress
          : typeof parsed.address === 'string'
            ? parsed.address
            : undefined,
      locationLabel: typeof parsed.locationLabel === 'string' ? parsed.locationLabel : undefined,
      imageUrls: Array.isArray(parsed.imageUrls)
        ? parsed.imageUrls
            .filter((url): url is string => typeof url === 'string')
            .map((url) => getFullImageUrl(url) ?? url)
        : undefined,
    };
  } catch {
    return {};
  }
}

function mapProfileEventToListItem(event: ProfileEventDto, organizerName: string): EventListItem {
  const location = parseProfileEventLocation(event.locationData);
  const imageUrls = location.imageUrls?.filter(Boolean);

  return {
    id: event.eventId,
    title: event.name,
    description: '',
    date: event.date,
    time: event.time,
    location,
    price: Number(event.price ?? 0),
    isPaid: Number(event.price ?? 0) > 0,
    organizerName: event.ownerName || organizerName,
    status: event.status,
    remainingParticipationCount: 0,
    capacity: 0,
    tags: event.tags ?? [],
    participantCount: 0,
    bannerImageUrl: event.bannerImage ?? imageUrls?.[0],
    organizerProfilePhoto: event.ownerProfilePhoto ?? undefined,
    primaryTagId: event.primaryTagId ?? undefined,
    imageUrls,
  };
}

export function PublicProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const accountId = params.id ?? '';

  const [activeTab, setActiveTab] = useState<ProfileTab>('organized-events');
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);

  const profileQuery = useProfile(accountId);
  const statsQuery = useProfileStats(accountId);
  const profileEventsQuery = useProfileEvents(accountId, 20);

  const profile = profileQuery.data;
  const accountType = normalizeAccountType(profile?.type as string | number | null | undefined);
  const isIndividualProfile = accountType === 'individual';

  const visibleTabs = useMemo<{ key: ProfileTab; label: string }[]>(
    () =>
      isIndividualProfile
        ? [{ key: 'participated-events', label: 'Katıldığı etkinlikler' }]
        : [{ key: 'organized-events', label: 'Düzenlediği etkinlikler' }],
    [isIndividualProfile]
  );

  useEffect(() => {
    const nextTab = visibleTabs[0]?.key ?? 'organized-events';
    if (activeTab !== nextTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, visibleTabs]);

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

  const isLoading = profileQuery.isPending || statsQuery.isPending;
  const displayName = profile
    ? getDisplayName(profile.username, profile.userProfile?.name, profile.userProfile?.surname)
    : '';
  const organizerName = displayName || profile?.username || 'Profil';
  const initials = getInitials(organizerName);

  const rawScore = statsQuery.data?.reputationScore ?? 0;
  const repLevelName = getReputationLabel(statsQuery.data?.reputationLevel ?? 'Yeni');
  const ratingValue = Math.max(0, Math.min(5, statsQuery.data?.rating ?? 0));

  const activeItems = useMemo<EventListItem[]>(() => {
    const mapped = (profileEventsQuery.data?.items ?? []).map((item) =>
      mapProfileEventToListItem(item, organizerName)
    );

    if (activeTab === 'organized-events') {
      return mapped.filter(
        (item) => !isHiddenFromActiveTabs(item.status) && !isPendingApprovalStatus(item.status)
      );
    }

    return mapped.filter((item) => !isHiddenFromActiveTabs(item.status));
  }, [activeTab, organizerName, profileEventsQuery.data?.items]);

  const isListRefetching = profileEventsQuery.isRefetching;
  const eventCountLabel = isIndividualProfile ? 'Katılım' : 'Düzenlenen';
  const primaryTabLabel = visibleTabs[0]?.label ?? 'Etkinlikler';

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color="#5bcc2a" />
      </View>
    );
  }

  const normalized = rawScore / 100;
  const thumbPosition = (normalized + 1) / 2;
  const fillWidth = Math.abs(normalized) / 2;
  const fillStart = normalized >= 0 ? 0.5 : 0.5 - fillWidth;

  const thumbLeftPercent = thumbPosition * 100;
  const fillWidthPercent = fillWidth * 100;
  const fillLeftPercent = fillStart * 100;

  let badgeBg = 'bg-gray-100';
  let badgeBorder = 'border-gray-200';
  let badgeText = 'text-gray-600';
  let fillColor = 'bg-transparent';

  if (rawScore > 0) {
    badgeBg = 'bg-[#f0fce8]';
    badgeBorder = 'border-[#bbf09e]';
    badgeText = 'text-[#357c1c]';
    fillColor = 'bg-[#77e349]';
  } else if (rawScore < 0) {
    badgeBg = 'bg-red-50';
    badgeBorder = 'border-red-200';
    badgeText = 'text-red-700';
    fillColor = 'bg-red-500';
  }

  const renderHeader = () => (
    <View>
      <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-5">
        <View className="mb-4 flex-row items-center">
          <Pressable
            className="relative mr-3.5 h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#77e349] bg-[#f0fce8]"
            disabled={!profile?.profilePhoto}
            onPress={() => setIsPhotoViewerOpen(true)}>
            {profile?.profilePhoto ? (
              <Image
                source={{ uri: profile.profilePhoto }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Text className="text-[22px] font-semibold text-[#357c1c]">{initials}</Text>
            )}
          </Pressable>
          <View className="min-w-0 flex-1 justify-center">
            <Text className="mb-[3px] text-lg font-semibold leading-tight text-gray-900" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="text-[13px] text-gray-500" numberOfLines={1}>
              @{profile?.username}
            </Text>
          </View>
        </View>

        {profile?.userProfile?.bio ? (
          <Text className="mb-4 text-[14px] leading-5 text-gray-700">{profile.userProfile.bio}</Text>
        ) : null}

        {isIndividualProfile ? (
          <View className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
            <View className="mb-2.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <IconSymbol name="star.fill" size={13} color="#5bcc2a" />
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  İtibar
                </Text>
              </View>
              <View className={`${badgeBg} rounded-full border ${badgeBorder} px-2.5 py-[3px]`}>
                <Text className={`text-xs font-semibold ${badgeText}`}>{repLevelName}</Text>
              </View>
            </View>

            <View className="relative mb-1.5 h-[7px] overflow-visible rounded-full border border-gray-200 bg-gray-100">
              <View className="absolute left-0 top-0 h-full w-1/2 rounded-l-full bg-red-500/10" />
              <View className="absolute right-0 top-0 h-full w-1/2 rounded-r-full bg-[#77e349]/20" />
              <View className="absolute left-1/2 -top-[1px] z-10 h-[9px] w-[1.5px] -translate-x-1/2 bg-gray-300" />
              <View
                className={`absolute top-0 z-[5] h-full rounded-full ${fillColor}`}
                style={{ left: `${fillLeftPercent}%`, width: `${fillWidthPercent}%` }}
              />
              <View
                className="absolute top-1/2 z-20 h-3 w-3 rounded-full border-2 border-white bg-[#5bcc2a]"
                style={{ left: `${thumbLeftPercent}%`, transform: [{ translateX: -6 }, { translateY: -6 }] }}
              />
            </View>


          </View>
        ) : (
          <View
            className="rounded-xl px-3.5 py-3"
            style={{ borderWidth: 1, borderColor: colors.primaryMuted, backgroundColor: colors.primaryLight }}>

            <Text className="mb-2 text-[12px] leading-5" style={{ color: colors.primaryDark }}>
              {statsQuery.data?.totalReviews ?? 0} değerlendirme üzerinden ortalama puan
            </Text>

            <View className="flex-row items-center gap-1">
              <View className="flex-row items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const delta = ratingValue - (starIndex - 1);
                  const starName =
                    delta >= 1 ? 'star' : delta >= 0.5 ? 'star-half' : 'star-outline';

                  return <Ionicons key={starIndex} name={starName} size={20} color={colors.primary} />;
                })}
              </View>
            </View>
          </View>
        )}
      </View>

      <View className="mt-2 border-b border-gray-200 bg-white px-4 py-3.5">
        <View className="flex-row gap-2">
          <View className="flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-2 py-3">
            <IconSymbol name="calendar" size={16} color="#77e349" />
            <Text className="mb-1 mt-1 text-[22px] font-semibold leading-none text-gray-900">
              {profileEventsQuery.data?.totalCount ?? 0}
            </Text>
            <Text className="text-[11px] text-gray-500">{eventCountLabel}</Text>
          </View>
          {isIndividualProfile ? (
            <View className="flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-2 py-3">
              <IconSymbol name="star.fill" size={16} color="#77e349" />
              <Text className="mb-1 mt-1 text-[22px] font-semibold leading-none text-gray-900">
                {statsQuery.data?.totalReviews ?? 0}
              </Text>
              <Text className="text-[11px] text-gray-500">Yorum</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="mt-2 border-b border-gray-200 bg-white px-4 pt-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pb-3"
          contentContainerClassName="gap-2">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5',
                  isActive ? 'border-[#77e349] bg-[#77e349]' : 'border-gray-200 bg-white'
                )}>
                <Text
                  className={cn(
                    'text-[13px]',
                    isActive ? 'font-semibold text-[#1a4a05]' : 'font-medium text-gray-500'
                  )}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="flex-row items-center justify-between bg-white px-4 py-3.5">
        <Text className="text-[15px] font-semibold text-gray-900">{primaryTabLabel}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={activeItems}
        keyExtractor={(item) => item.id}
        bounces={false}
        renderItem={({ item }) => (
          <View className="mb-3 bg-white px-4">
            <EventCard event={item} onPress={(eventId) => router.push(`/event/${eventId}`)} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View className="mx-4 mb-4 mt-2 items-center rounded-[14px] border border-gray-200 bg-white p-4">
            <Text className="text-[13px] text-gray-500">Bu profil için etkinlik bulunmuyor.</Text>
          </View>
        }
        contentContainerClassName="pb-24"
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching || statsQuery.isRefetching || isListRefetching}
            onRefresh={() => {
              profileQuery.refetch();
              statsQuery.refetch();
              profileEventsQuery.refetch();
            }}
          />
        }
      />
      {profile?.profilePhoto && isPhotoViewerOpen ? (
        <Modal
          visible
          animationType="fade"
          presentationStyle="fullScreen"
          statusBarTranslucent
          onRequestClose={() => setIsPhotoViewerOpen(false)}>
          <Pressable className="flex-1 items-center justify-center bg-black" onPress={() => setIsPhotoViewerOpen(false)}>
            <Image
              source={{ uri: profile.profilePhoto }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={180}
            />
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
