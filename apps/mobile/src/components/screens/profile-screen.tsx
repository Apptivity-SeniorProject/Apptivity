import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Flag } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { EventCard } from '@/src/components/events/event-card';
import { ReportModal } from '@/src/components/reports/report-modal';
import { useMyEvents, useMyParticipations } from '@/src/hooks/useEvents';
import { useMyProfile, useProfileStats } from '@/src/hooks/useProfile';

const AVATAR_PLACEHOLDER =
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=300&q=80';

function getDisplayName(username: string, name?: string, surname?: string): string {
  const fullName = [name, surname].filter(Boolean).join(' ').trim();
  return fullName || username;
}

export function ProfileScreen() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const profileQuery = useMyProfile();
  const profile = profileQuery.data;

  const statsQuery = useProfileStats(profile?.accountId);
  const myEventsQuery = useMyEvents(6);
  const myParticipationsQuery = useMyParticipations(6);

  const isLoading = profileQuery.isPending || statsQuery.isPending;
  const displayName = profile
    ? getDisplayName(profile.username, profile.userProfile?.name, profile.userProfile?.surname)
    : '';

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="gap-5 px-4 pb-8 pt-6"
      refreshControl={
        <RefreshControl
          refreshing={profileQuery.isRefetching || statsQuery.isRefetching}
          onRefresh={() => {
            profileQuery.refetch();
            statsQuery.refetch();
            myEventsQuery.refetch();
            myParticipationsQuery.refetch();
          }}
        />
      }>
      <View className="items-center rounded-2xl border border-slate-200 bg-white p-5">
        <View className="w-full flex-row justify-end">
          <Pressable onPress={() => setIsReportModalOpen(true)}>
            <Flag size={18} color="#ef4444" />
          </Pressable>
        </View>
        <Image
          source={{ uri: profile?.profilePhoto ?? AVATAR_PLACEHOLDER }}
          style={{ width: 90, height: 90, borderRadius: 45 }}
          contentFit="cover"
        />
        <Text className="mt-3 text-xl font-semibold text-slate-900">{displayName}</Text>
        <Text className="mt-1 text-sm text-slate-500">@{profile?.username}</Text>
        <Text className="mt-1 text-xs uppercase text-slate-400">{profile?.type}</Text>

        {profile?.userProfile?.bio ? (
          <Text className="mt-3 text-center text-sm text-slate-600">{profile.userProfile.bio}</Text>
        ) : null}
      </View>
      {profile?.accountId ? (
        <ReportModal
          visible={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetId={profile.accountId}
          targetType={2}
        />
      ) : null}

      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-semibold text-slate-900">Istatistikler</Text>
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-xl bg-slate-100 p-3">
            <Text className="text-xs text-slate-500">Reputation</Text>
            <Text className="mt-1 text-lg font-bold text-slate-900">
              {statsQuery.data?.reputationScore?.toFixed(1) ?? '0.0'}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-slate-100 p-3">
            <Text className="text-xs text-slate-500">Organize Ettigim</Text>
            <Text className="mt-1 text-lg font-bold text-slate-900">
              {myEventsQuery.data?.totalCount ?? 0}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-slate-100 p-3">
            <Text className="text-xs text-slate-500">Katildigim</Text>
            <Text className="mt-1 text-lg font-bold text-slate-900">
              {myParticipationsQuery.data?.totalCount ?? 0}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-slate-900">My Events</Text>
        {(myEventsQuery.data?.items ?? []).length === 0 ? (
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-sm text-slate-500">Henuz olusturdugun etkinlik yok.</Text>
          </View>
        ) : (
          (myEventsQuery.data?.items ?? []).map((event) => (
            <EventCard
              key={`my-event-${event.id}`}
              event={event}
              onPress={(eventId) => router.push(`/event/${eventId}`)}
            />
          ))
        )}
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-slate-900">My Participations</Text>
        {(myParticipationsQuery.data?.items ?? []).length === 0 ? (
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-sm text-slate-500">Katilim kaydin bulunmuyor.</Text>
          </View>
        ) : (
          (myParticipationsQuery.data?.items ?? []).map((event) => (
            <EventCard
              key={`my-participation-${event.id}`}
              event={event}
              onPress={(eventId) => router.push(`/event/${eventId}`)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
