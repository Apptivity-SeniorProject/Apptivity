import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
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

import { colors, radius, hitSlop } from '@/src/constants/theme';
import { EventCard } from '@/src/components/events/event-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useProfileOrganizedEvents, useProfileParticipatedEvents } from '@/src/hooks/useEvents';
import { useProfile, useProfileStats } from '@/src/hooks/useProfile';
import type { EventListItem } from '@/src/types/event';
import { cn } from '@/src/utils/cn';

type ProfileTab = 'organized-events' | 'participated-events';

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: 'organized-events', label: 'Düzenlediği etkinlikler' },
  { key: 'participated-events', label: 'Katıldığı etkinlikler' },
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
  const words = displayName.trim().split(/\s+/);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getEmptyStateText(tab: ProfileTab): string {
  if (tab === 'organized-events') return 'Henüz düzenlediği etkinlik yok.';
  return 'Katılım kaydı bulunmuyor.';
}

export function PublicProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const accountId = params.id ?? '';

  const [activeTab, setActiveTab] = useState<ProfileTab>('organized-events');

  const profileQuery = useProfile(accountId);
  const profile = profileQuery.data;

  const statsQuery = useProfileStats(accountId);
  const organizedEventsQuery = useProfileOrganizedEvents(accountId, 20);
  const participatedEventsQuery = useProfileParticipatedEvents(accountId, 20);

  const isLoading = profileQuery.isPending || statsQuery.isPending;
  const displayName = profile
    ? getDisplayName(profile.username, profile.userProfile?.name, profile.userProfile?.surname)
    : '';
  const initials = getInitials(displayName || profile?.username || 'U');

  const rawScore = statsQuery.data?.reputationScore ?? 0;
  const repLevelName = statsQuery.data?.reputationLevel ?? 'Yeni'; 

  const activeItems = useMemo<EventListItem[]>(() => {
    if (activeTab === 'organized-events') {
      return (organizedEventsQuery.data?.items ?? []).filter(
        (item) => !isHiddenFromActiveTabs(item.status) && !isPendingApprovalStatus(item.status)
      );
    }
    return (participatedEventsQuery.data?.items ?? []).filter((item) => !isHiddenFromActiveTabs(item.status));
  }, [activeTab, organizedEventsQuery.data?.items, participatedEventsQuery.data?.items]);

  const isListRefetching = organizedEventsQuery.isRefetching || participatedEventsQuery.isRefetching;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color="#5bcc2a" />
      </View>
    );
  }

  const normalized = rawScore / 100; // [-100,+100] → [-1,+1]
  const thumbPosition = (normalized + 1) / 2; // 0.0 - 1.0 arası
  const fillWidth = Math.abs(normalized) / 2; // 0.0 - 0.5 arası
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
      {/* Profil Header Kartı */}
      <View className="bg-white px-4 pb-4 pt-5 border-b border-gray-200">
        <View className="flex-row items-center mb-4">
          <View 
            className="h-16 w-16 rounded-full bg-[#f0fce8] border-2 border-[#77e349] items-center justify-center mr-3.5 shrink-0 overflow-hidden relative">
            {profile?.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text className="text-[22px] font-semibold text-[#357c1c]">{initials}</Text>
            )}
          </View>
          <View className="flex-1 min-w-0 justify-center">
            <Text className="text-lg font-semibold text-gray-900 leading-tight mb-[3px]" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="text-[13px] text-gray-500" numberOfLines={1}>
              @{profile?.username}
            </Text>
          </View>
        </View>

        {profile?.userProfile?.bio ? (
          <Text className="text-[14px] text-gray-700 mb-4 leading-5">
            {profile.userProfile.bio}
          </Text>
        ) : null}

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
              {organizedEventsQuery.data?.totalCount ?? 0}
            </Text>
            <Text className="text-[11px] text-gray-500">Düzenlenen</Text>
          </View>
          <View className="flex-1 bg-gray-50 rounded-xl px-2 py-3 items-center border border-gray-200">
            <IconSymbol name="person.3.fill" size={16} color="#77e349" />
            <Text className="text-[22px] font-semibold text-gray-900 mt-1 mb-1 leading-none">
              {participatedEventsQuery.data?.totalCount ?? 0}
            </Text>
            <Text className="text-[11px] text-gray-500">Katılım</Text>
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
              organizedEventsQuery.refetch();
              participatedEventsQuery.refetch();
            }}
          />
        }
      />
    </View>
  );
}
