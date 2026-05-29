import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { EditProfileModal } from '@/src/components/profile/edit-profile-modal';
import { colors, radius, hitSlop } from '@/src/constants/theme';
import { EventCard } from '@/src/components/events/event-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useMyBookmarks, useMyEvents, useMyParticipations } from '@/src/hooks/useEvents';
import { useMyProfile, useProfileStats, useSetMyInterests } from '@/src/hooks/useProfile';
import { useTags } from '@/src/hooks/useTags';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { EventListItem } from '@/src/types/event';
import { getApiErrorMessage } from '@/src/utils/error';
import { cn } from '@/src/utils/cn';

type ProfileTab = 'my-events' | 'my-participations' | 'my-bookmarks' | 'my-cancelled';

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: 'my-events', label: 'Etkinliklerim' },
  { key: 'my-participations', label: 'Katıldıklarım' },
  { key: 'my-bookmarks', label: 'Beğendiklerim' },
  { key: 'my-cancelled', label: 'İptal Ettiklerim' },
];

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

function getDisplayName(username: string, name?: string, surname?: string): string {
  const fullName = [name, surname].filter(Boolean).join(' ').trim();
  return fullName || username;
}

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getEmptyStateText(tab: ProfileTab): string {
  if (tab === 'my-events') return 'Henüz oluşturduğun etkinlik yok.';
  if (tab === 'my-participations') return 'Katılım kaydın bulunmuyor.';
  if (tab === 'my-cancelled') return 'İptal edilen etkinlik bulunmuyor.';
  return 'Beğendiğin etkinlik bulunmuyor.';
}



export function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('my-events');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [draftInterestTagIds, setDraftInterestTagIds] = useState<string[]>([]);
  const toast = useToast();

  const profileQuery = useMyProfile();
  const profile = profileQuery.data;

  const statsQuery = useProfileStats(profile?.accountId);
  const myEventsQuery = useMyEvents(20);
  const myParticipationsQuery = useMyParticipations(20);
  const myBookmarksQuery = useMyBookmarks(20);
  const tagsQuery = useTags();
  const setInterestsMutation = useSetMyInterests();

  const isLoading = profileQuery.isPending || statsQuery.isPending;
  const displayName = profile
    ? getDisplayName(profile.username, profile.userProfile?.name, profile.userProfile?.surname)
    : '';
  const initials = getInitials(displayName || profile?.username || 'U');

  const reviewCount = statsQuery.data?.totalReviews ?? 0;
  
  const rawScore = statsQuery.data?.reputationScore ?? 0;
  const repLevelName = statsQuery.data?.reputationLevel ?? 'Yeni'; 

  const cancelledItems = useMemo<EventListItem[]>(() => {
    const source = [
      ...(myEventsQuery.data?.items ?? []),
      ...(myParticipationsQuery.data?.items ?? []),
      ...(myBookmarksQuery.data?.items ?? []),
    ].filter((item) => isCancelledStatus(item.status));

    const unique = new Map<string, EventListItem>();
    source.forEach((item) => {
      if (!unique.has(item.id)) {
        unique.set(item.id, item);
      }
    });
    return Array.from(unique.values());
  }, [myBookmarksQuery.data?.items, myEventsQuery.data?.items, myParticipationsQuery.data?.items]);

  const activeItems = useMemo<EventListItem[]>(() => {
    if (activeTab === 'my-events') {
      return (myEventsQuery.data?.items ?? []).filter((item) => !isHiddenFromActiveTabs(item.status));
    }
    if (activeTab === 'my-participations') {
      return (myParticipationsQuery.data?.items ?? []).filter((item) => !isHiddenFromActiveTabs(item.status));
    }
    if (activeTab === 'my-cancelled') {
      return cancelledItems;
    }
    return (myBookmarksQuery.data?.items ?? []).filter((item) => !isHiddenFromActiveTabs(item.status));
  }, [activeTab, cancelledItems, myBookmarksQuery.data?.items, myEventsQuery.data?.items, myParticipationsQuery.data?.items]);

  const isListRefetching = myEventsQuery.isRefetching || myParticipationsQuery.isRefetching || myBookmarksQuery.isRefetching;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color="#5bcc2a" />
      </View>
    );
  }

  const thumbPosition = (rawScore + 1) / 2; // 0.0 - 1.0 arası
  const fillWidth = Math.abs(rawScore) / 2; // 0.0 - 0.5 arası
  const fillStart = rawScore >= 0 ? 0.5 : 0.5 - fillWidth;

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
      {/* Profil Header Kartı */}
      <View className="bg-white px-4 pb-4 pt-5 border-b border-gray-200">
        <View className="flex-row items-center mb-4">
          <View className="h-16 w-16 rounded-full bg-[#f0fce8] border-2 border-[#77e349] items-center justify-center mr-3.5 shrink-0">
            {profile?.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} className="h-full w-full rounded-full" />
            ) : (
              <Text className="text-[22px] font-semibold text-[#357c1c]">{initials}</Text>
            )}
          </View>
          <View className="flex-1 min-w-0 justify-center">
            <Text className="text-lg font-semibold text-gray-900 leading-tight mb-[3px]" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="text-[13px] text-gray-500" numberOfLines={1}>
              @{profile?.type ? String(profile.type).toLowerCase() : 'user'}.{profile?.username}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setDraftInterestTagIds(profile?.interests?.map((i) => i.id) ?? []);
              setIsEditModalOpen(true);
            }}
            hitSlop={hitSlop.md}
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 0.5,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-start',
            }}>
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* İtibar Widget */}
        <View className="bg-gray-50 rounded-xl px-3.5 py-3 border border-gray-200">
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center gap-1.5">
              <IconSymbol name="star.fill" size={13} color="#5bcc2a" />
              <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                İtibar
              </Text>
            </View>
            <View className={`${badgeBg} border ${badgeBorder} px-2.5 py-[3px] rounded-full`}>
              <Text className={`text-xs font-semibold ${badgeText}`}>{repLevelName}</Text>
            </View>
          </View>

          {/* Rep Track */}
          <View className="relative h-[7px] bg-gray-100 rounded-full border border-gray-200 mb-1.5 overflow-visible">
            {/* Negatif & Pozitif Zemin */}
            <View className="absolute left-0 top-0 w-1/2 h-full bg-red-500/10 rounded-l-full" />
            <View className="absolute right-0 top-0 w-1/2 h-full bg-[#77e349]/20 rounded-r-full" />
            
            {/* Merkez Çizgi */}
            <View className="absolute left-1/2 -top-[1px] w-[1.5px] h-[9px] bg-gray-300 -translate-x-1/2 z-10" />
            
            {/* Fill */}
            <View 
              className={`absolute top-0 h-full rounded-full z-[5] ${fillColor}`}
              style={{ left: `${fillLeftPercent}%`, width: `${fillWidthPercent}%` }}
            />
            
            {/* Thumb */}
            <View 
              className="absolute top-1/2 h-3 w-3 rounded-full bg-[#5bcc2a] border-2 border-white z-20"
              style={{ left: `${thumbLeftPercent}%`, transform: [{ translateX: -6 }, { translateY: -6 }] }}
            />
          </View>
          
          <View className="flex-row justify-between px-[1px]">
            <Text className="text-[10px] text-red-500/70">olumsuz</Text>
            <Text className="text-[10px] text-gray-400">nötr</Text>
            <Text className="text-[10px] text-[#5bcc2a]/80">olumlu</Text>
          </View>
        </View>
      </View>

      {/* İstatistik Grid */}
      <View className="bg-white px-4 py-3.5 mt-2 border-b border-gray-200">
        <View className="flex-row gap-2">
          <View className="flex-1 bg-gray-50 rounded-xl px-2 py-3 items-center border border-gray-200">
            <IconSymbol name="calendar" size={16} color="#77e349" />
            <Text className="text-[22px] font-semibold text-gray-900 mt-1 mb-1 leading-none">
              {myEventsQuery.data?.totalCount ?? 0}
            </Text>
            <Text className="text-[11px] text-gray-500">Etkinlik</Text>
          </View>
          <View className="flex-1 bg-gray-50 rounded-xl px-2 py-3 items-center border border-gray-200">
            <IconSymbol name="person.3.fill" size={16} color="#77e349" />
            <Text className="text-[22px] font-semibold text-gray-900 mt-1 mb-1 leading-none">
              {myParticipationsQuery.data?.totalCount ?? 0}
            </Text>
            <Text className="text-[11px] text-gray-500">Katılım</Text>
          </View>
          <View className="flex-1 bg-gray-50 rounded-xl px-2 py-3 items-center border border-gray-200">
            <IconSymbol name="bubble.left.and.bubble.right.fill" size={16} color="#77e349" />
            <Text className="text-[22px] font-semibold text-gray-900 mt-1 mb-1 leading-none">
              {reviewCount}
            </Text>
            <Text className="text-[11px] text-gray-500">Yorum</Text>
          </View>
        </View>
      </View>

      {/* Filter Chips */}
      <View className="bg-white px-4 pt-3 mt-2 border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-3" contentContainerClassName="gap-2">
          {PROFILE_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full border',
                  isActive ? 'bg-[#77e349] border-[#77e349]' : 'bg-white border-gray-200'
                )}>
                <Text className={cn('text-[13px]', isActive ? 'text-[#1a4a05] font-semibold' : 'text-gray-500 font-medium')}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Section Header */}
      <View className="bg-white px-4 py-3.5 flex-row items-center justify-between">
        <Text className="text-[15px] font-semibold text-gray-900">
          {PROFILE_TABS.find(t => t.key === activeTab)?.label}
        </Text>
        <Pressable>
          <Text className="text-xs font-medium text-[#5bcc2a]">Tümünü gör</Text>
        </Pressable>
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
          <View className="px-4 mb-3 bg-white">
            <EventCard event={item} onPress={(eventId) => router.push(`/event/${eventId}`)} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View className="mx-4 mt-2 mb-4 bg-white rounded-[14px] border border-gray-200 p-4 items-center">
            <Text className="text-[13px] text-gray-500">{getEmptyStateText(activeTab)}</Text>
          </View>
        }
        contentContainerClassName="pb-24"
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching || statsQuery.isRefetching || isListRefetching}
            onRefresh={() => {
              profileQuery.refetch();
              statsQuery.refetch();
              myEventsQuery.refetch();
              myParticipationsQuery.refetch();
              myBookmarksQuery.refetch();
            }}
          />
        }
      />

      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        tags={tagsQuery.data ?? []}
        selectedTagIds={draftInterestTagIds}
        onToggleTag={(tagId) => {
          setDraftInterestTagIds((current) =>
            current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
          );
        }}
        isSaving={setInterestsMutation.isPending}
        onSave={() => {
          setInterestsMutation.mutate(draftInterestTagIds, {
            onSuccess: () => setIsEditModalOpen(false),
            onError: (error) => toast.error(getApiErrorMessage(error)),
          });
        }}
      />
    </View>
  );
}
