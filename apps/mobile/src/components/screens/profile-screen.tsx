import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Flag } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditProfileModal } from '@/src/components/profile/edit-profile-modal';
import { ReportModal } from '@/src/components/report-modal';
import { EventCard } from '@/src/components/events/event-card';
import { Button } from '@/src/components/ui/button';
import { useMyBookmarks, useMyEvents, useMyParticipations } from '@/src/hooks/useEvents';
import { useMyProfile, useProfileStats, useSetMyInterests } from '@/src/hooks/useProfile';
import { useTags } from '@/src/hooks/useTags';
import { useToast } from '@/src/hooks/useToast';
import type { EventListItem } from '@/src/types/event';
import { getApiErrorMessage } from '@/src/utils/error';
import { cn } from '@/src/utils/cn';

const AVATAR_PLACEHOLDER =
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=300&q=80';

type ProfileTab = 'my-events' | 'my-participations' | 'my-bookmarks';

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: 'my-events', label: 'Etkinliklerim' },
  { key: 'my-participations', label: 'Katildiklarim' },
  { key: 'my-bookmarks', label: 'Begendiklerim' },
];

function getDisplayName(username: string, name?: string, surname?: string): string {
  const fullName = [name, surname].filter(Boolean).join(' ').trim();
  return fullName || username;
}

function getEmptyStateText(tab: ProfileTab): string {
  if (tab === 'my-events') return 'Henuz olusturdugun etkinlik yok.';
  if (tab === 'my-participations') return 'Katilim kaydin bulunmuyor.';
  return 'Begendigin etkinlik bulunmuyor.';
}

export function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('my-events');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
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

  const reviewCount = statsQuery.data?.totalReviews ?? 0;

  const activeItems = useMemo<EventListItem[]>(() => {
    if (activeTab === 'my-events') {
      return myEventsQuery.data?.items ?? [];
    }
    if (activeTab === 'my-participations') {
      return myParticipationsQuery.data?.items ?? [];
    }
    return myBookmarksQuery.data?.items ?? [];
  }, [
    activeTab,
    myBookmarksQuery.data?.items,
    myEventsQuery.data?.items,
    myParticipationsQuery.data?.items,
  ]);

  const isListRefetching =
    myEventsQuery.isRefetching || myParticipationsQuery.isRefetching || myBookmarksQuery.isRefetching;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center bg-slate-50">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FlatList
        className="flex-1 bg-slate-50"
        data={activeItems}
        key={activeTab}
        keyExtractor={(item) => `${activeTab}-${item.id}`}
        renderItem={({ item }) => (
          <View className="mb-4 px-4">
            <EventCard event={item} onPress={(eventId) => router.push(`/event/${eventId}`)} />
          </View>
        )}
        ListHeaderComponent={
          <View className="mb-4">
            <View className="rounded-b-3xl bg-emerald-600 px-4 pb-6 pt-14">
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-center gap-3">
                  <Image
                    source={{ uri: profile?.profilePhoto ?? AVATAR_PLACEHOLDER }}
                    style={{ width: 76, height: 76, borderRadius: 999 }}
                    contentFit="cover"
                  />
                  <View>
                    <Text className="text-xl font-bold text-white">{displayName}</Text>
                    <Text className="mt-1 text-sm text-emerald-100">@{profile?.username}</Text>
                    <Text className="mt-1 text-xs uppercase text-emerald-100">{profile?.type}</Text>
                  </View>
                </View>

                <Pressable className="rounded-full bg-white/20 p-2" onPress={() => setIsReportModalOpen(true)}>
                  <Flag size={18} color="#ffffff" />
                </Pressable>
              </View>

              <View className="mt-4 flex-row gap-2">
                <Button
                  label="Profili Duzenle"
                  className="h-10 flex-1 bg-white"
                  textClassName="text-emerald-700"
                  onPress={() => {
                    setDraftInterestTagIds(profile?.interests?.map((interest) => interest.id) ?? []);
                    setIsEditModalOpen(true);
                  }}
                />
              </View>
            </View>

            <View className="mt-4 px-4">
              <View className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text className="text-base font-semibold text-slate-900">Istatistikler</Text>
                <View className="mt-4 flex-row gap-3">
                  <View className="flex-1 rounded-xl bg-slate-100 p-3">
                    <Text className="text-xs text-slate-500">Etkinlik</Text>
                    <Text className="mt-1 text-lg font-bold text-slate-900">{myEventsQuery.data?.totalCount ?? 0}</Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-slate-100 p-3">
                    <Text className="text-xs text-slate-500">Katilim</Text>
                    <Text className="mt-1 text-lg font-bold text-slate-900">{myParticipationsQuery.data?.totalCount ?? 0}</Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-slate-100 p-3">
                    <Text className="text-xs text-slate-500">Yorum</Text>
                    <Text className="mt-1 text-lg font-bold text-slate-900">{reviewCount}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-4 flex-row gap-2">
                {PROFILE_TABS.map((tab) => {
                  const isSelected = activeTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      className={cn(
                        'flex-1 rounded-full border px-3 py-2',
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-white'
                      )}
                      onPress={() => setActiveTab(tab.key)}>
                      <Text
                        className={cn(
                          'text-center text-xs font-semibold',
                          isSelected ? 'text-white' : 'text-slate-700'
                        )}>
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {profile?.interests?.length ? (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {profile.interests.slice(0, 6).map((interest) => (
                    <View key={interest.id} className="rounded-full bg-slate-200 px-3 py-1">
                      <Text className="text-xs font-semibold text-slate-700">{interest.name}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text className="mb-3 mt-5 text-lg font-semibold text-slate-900">
                {PROFILE_TABS.find((tab) => tab.key === activeTab)?.label}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="mx-4 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-sm text-slate-500">{getEmptyStateText(activeTab)}</Text>
          </View>
        }
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl
            refreshing={
              profileQuery.isRefetching || statsQuery.isRefetching || isListRefetching
            }
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

      {profile?.accountId ? (
        <ReportModal
          visible={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetId={profile.accountId}
          targetType={2}
        />
      ) : null}

      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        tags={tagsQuery.data ?? []}
        selectedTagIds={draftInterestTagIds}
        onToggleTag={(tagId) => {
          setDraftInterestTagIds((current) =>
            current.includes(tagId)
              ? current.filter((id) => id !== tagId)
              : [...current, tagId]
          );
        }}
        isSaving={setInterestsMutation.isPending}
        onSave={() => {
          setInterestsMutation.mutate(draftInterestTagIds, {
            onSuccess: () => {
              setIsEditModalOpen(false);
            },
            onError: (error) => {
              toast.error(getApiErrorMessage(error));
            },
          });
        }}
      />
    </SafeAreaView>
  );
}
