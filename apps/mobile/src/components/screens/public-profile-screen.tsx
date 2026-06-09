import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile, useProfileEvents, useProfileStats } from '@/src/hooks/useProfile';
import type { ProfileDto } from '@/src/types/profile';

function normalizeAccountType(type: ProfileDto['type']): 'organization' | 'individual' | 'admin' | 'unknown' {
  if (typeof type === 'number') {
    if (type === 2) return 'organization';
    if (type === 1) return 'individual';
    if (type === 3) return 'admin';
    return 'unknown';
  }

  if (typeof type === 'string') {
    const normalized = type.trim().toLowerCase();
    if (normalized === 'organization' || normalized === 'individual' || normalized === 'admin') {
      return normalized;
    }
  }

  return 'unknown';
}

function getDisplayName(
  username: string,
  type?: ProfileDto['type'],
  userName?: string,
  surname?: string,
  clubName?: string | null
): string {
  if (normalizeAccountType(type) === 'organization') {
    return clubName?.trim() || username;
  }

  const fullName = [userName, surname].filter(Boolean).join(' ').trim();
  return fullName || username;
}

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function PublicProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const accountId = params.id ?? '';

  const profileQuery = useProfile(accountId);
  const statsQuery = useProfileStats(accountId);
  const eventsQuery = useProfileEvents(accountId, 10);

  if (profileQuery.isPending || statsQuery.isPending || eventsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  const profile = profileQuery.data;
  const stats = statsQuery.data;
  const events = eventsQuery.data?.items ?? [];

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-base text-slate-500">Profil bulunamadi.</Text>
      </View>
    );
  }

  const displayName = getDisplayName(
    profile.username,
    profile.type,
    profile.userProfile?.name,
    profile.userProfile?.surname,
    profile.clubProfile?.name
  );
  const initials = getInitials(displayName);
  const interests = profile.interests?.map((interest) => interest.name).filter(Boolean) ?? [];
  const normalizedType = normalizeAccountType(profile.type);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="px-4 pb-8 pt-5">
        <View className="rounded-3xl border border-slate-200 bg-white p-5">
          <View className="flex-row items-center gap-4">
            {profile.profilePhoto ? (
              <Image
                source={{ uri: profile.profilePhoto }}
                style={{ width: 72, height: 72, borderRadius: 999 }}
                contentFit="cover"
                transition={120}
              />
            ) : (
              <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-emerald-100">
                <Text className="text-xl font-semibold text-emerald-700">{initials}</Text>
              </View>
            )}

            <View className="flex-1">
              <Text className="text-xl font-semibold text-slate-900">{displayName}</Text>
              <Text className="mt-1 text-sm text-slate-500">@{profile.username}</Text>
              <Text className="mt-1 text-xs uppercase text-slate-400">{normalizedType}</Text>
            </View>
          </View>

          {normalizedType === 'organization' ? (
            <Text className="mt-4 text-sm leading-6 text-slate-700">
              {profile.clubProfile?.description?.trim() || 'Organizasyon profili aciklamasi bulunmuyor.'}
            </Text>
          ) : (
            <Text className="mt-4 text-sm leading-6 text-slate-700">
              {profile.userProfile?.bio?.trim() || 'Kullanici bio bilgisi bulunmuyor.'}
            </Text>
          )}
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Etkinlik</Text>
            <Text className="mt-2 text-2xl font-semibold text-slate-900">{stats?.totalEvents ?? 0}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Yorum</Text>
            <Text className="mt-2 text-2xl font-semibold text-slate-900">{stats?.totalReviews ?? 0}</Text>
          </View>
        </View>

        {interests.length ? (
          <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-semibold text-slate-900">Ilgi Alanlari</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {interests.map((interest) => (
                <View key={interest} className="rounded-full bg-slate-100 px-3 py-2">
                  <Text className="text-xs font-medium text-slate-700">{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-slate-900">Etkinlikler</Text>
            <Text className="text-xs text-slate-500">{events.length} sonuc</Text>
          </View>

          {events.length ? (
            <View className="mt-3 gap-3">
              {events.map((event) => (
                <Pressable
                  key={event.eventId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  onPress={() => router.push(`/event/${event.eventId}`)}>
                  <Text className="text-base font-semibold text-slate-900">{event.name}</Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    {event.date} {event.time.slice(0, 5)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text className="mt-3 text-sm text-slate-500">Gosterilecek etkinlik bulunmuyor.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
