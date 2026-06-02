import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock, UserCheck, UserX, XCircle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { updateEventParticipationStatus } from '@/src/api/eventService';
import { useEventDetail, useEventParticipants } from '@/src/hooks/useEvents';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { EventParticipantProfileDto, ParticipationStatus } from '@/src/types/event';
import { getApiErrorMessage } from '@/src/utils/error';

type TabKey = 'approved' | 'pending' | 'rejected';

interface TabConfig {
  key: TabKey;
  label: string;
  emptyText: string;
  statusFilter: ParticipationStatus;
  activeColor: string;
  activeBg: string;
  activeText: string;
}

const OWNER_TABS: TabConfig[] = [
  {
    key: 'approved',
    label: 'Kabul Edildi',
    emptyText: 'Henuz kabul edilen katilimci yok.',
    statusFilter: 'Approved',
    activeColor: 'border-emerald-600',
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
  },
  {
    key: 'pending',
    label: 'Bekliyor',
    emptyText: 'Bekleyen katilimci yok.',
    statusFilter: 'Pending',
    activeColor: 'border-amber-600',
    activeBg: 'bg-amber-600',
    activeText: 'text-white',
  },
  {
    key: 'rejected',
    label: 'Red Edildi',
    emptyText: 'Reddedilen katilimci yok.',
    statusFilter: 'Rejected',
    activeColor: 'border-rose-600',
    activeBg: 'bg-rose-600',
    activeText: 'text-white',
  },
];

function getStatusIcon(status: ParticipationStatus | string | number | null | undefined) {
  if (status === 'Approved') {
    return <CheckCircle2 size={14} color="#059669" />;
  }
  if (status === 'Pending') {
    return <Clock size={14} color="#d97706" />;
  }
  if (status === 'Rejected') {
    return <XCircle size={14} color="#e11d48" />;
  }
  return null;
}

function getStatusLabel(status: ParticipationStatus | string | number | null | undefined): string {
  if (status === 'Approved') return 'Kabul Edildi';
  if (status === 'Pending') return 'Bekliyor';
  if (status === 'Rejected') return 'Red Edildi';
  return '';
}

function getStatusColor(status: ParticipationStatus | string | number | null | undefined): string {
  if (status === 'Approved') return 'text-emerald-600';
  if (status === 'Pending') return 'text-amber-600';
  if (status === 'Rejected') return 'text-rose-600';
  return 'text-slate-500';
}

const PLACEHOLDER_AVATAR = 'https://ui-avatars.com/api/?background=e2e8f0&color=475569&bold=true&size=80';

function ParticipantCard({
  participant,
  isOwner,
  isPending,
  onApprove,
  onReject,
  isMutating,
}: {
  participant: EventParticipantProfileDto;
  isOwner: boolean;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
  isMutating: boolean;
}) {
  const avatarUri = participant.profilePhoto
    ? participant.profilePhoto
    : `${PLACEHOLDER_AVATAR}&name=${encodeURIComponent(participant.displayName || 'U')}`;

  return (
    <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <Image
        source={{ uri: avatarUri }}
        style={{ width: 44, height: 44, borderRadius: 22 }}
        contentFit="cover"
        transition={120}
      />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-slate-900">{participant.displayName}</Text>
        {participant.username ? (
          <Text className="text-xs text-slate-500">@{participant.username}</Text>
        ) : null}
        {!isOwner ? null : (
          <View className="mt-1 flex-row items-center gap-1">
            {getStatusIcon(participant.status)}
            <Text className={`text-xs font-medium ${getStatusColor(participant.status)}`}>
              {getStatusLabel(participant.status)}
            </Text>
          </View>
        )}
      </View>

      {isOwner && isPending ? (
        <View className="flex-row items-center gap-2">
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full bg-emerald-100"
            disabled={isMutating}
            onPress={onApprove}>
            <UserCheck size={18} color="#059669" />
          </Pressable>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full bg-rose-100"
            disabled={isMutating}
            onPress={onReject}>
            <UserX size={18} color="#e11d48" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function EventParticipantsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = params.id ?? '';
  const queryClient = useQueryClient();
  const toast = useToast();
  const myAccountId = useAuthStore((state) => state.user?.id);
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('approved');
  const [refreshing, setRefreshing] = useState(false);

  const { data: eventData, isPending: isEventPending, refetch: refetchEvent } = useEventDetail(eventId);
  const participantsQuery = useEventParticipants(eventId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEvent(), participantsQuery.refetch()]);
    setRefreshing(false);
  }, [refetchEvent, participantsQuery]);

  const isOwner = Boolean(myAccountId && eventData?.ownerId && myAccountId === eventData.ownerId);

  const reviewMutation = useMutation({
    mutationFn: ({
      accountId,
      status,
    }: {
      accountId: string;
      status: 'Approved' | 'Rejected';
    }) => updateEventParticipationStatus(eventId, accountId, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-participants', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['my-participations'] }),
      ]);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Katilim durumu guncellenemedi.'));
    },
  });

  if (isEventPending || participantsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  if (!eventData) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-base text-slate-500">Etkinlik bulunamadi.</Text>
      </View>
    );
  }

  const allParticipants = participantsQuery.data?.participants ?? [];

  // Owner: filter by active tab. Non-owner: show only approved.
  const filteredParticipants = isOwner
    ? allParticipants.filter(
        (p) => p.status === OWNER_TABS.find((t) => t.key === activeTab)?.statusFilter
      )
    : allParticipants.filter((p) => p.status === 'Approved');

  const approvedCount = allParticipants.filter((p) => p.status === 'Approved').length;
  const pendingCount = allParticipants.filter((p) => p.status === 'Pending').length;
  const rejectedCount = allParticipants.filter((p) => p.status === 'Rejected').length;

  const tabCounts: Record<TabKey, number> = {
    approved: approvedCount,
    pending: pendingCount,
    rejected: rejectedCount,
  };

  const activeTabConfig = OWNER_TABS.find((t) => t.key === activeTab)!;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        className="flex-row items-center gap-3 border-b border-slate-200 bg-white px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
          onPress={() => router.back()}>
          <ArrowLeft size={20} color="#334155" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
            {isOwner ? 'Katilimci Yonetimi' : 'Katilimcilar'}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {eventData.title}
          </Text>
        </View>
      </View>

      {/* Owner: Summary badges */}
      {isOwner ? (
        <View className="flex-row justify-center gap-3 bg-white px-4 pb-3 pt-2">
          <View className="items-center rounded-xl bg-emerald-50 px-4 py-2">
            <Text className="text-lg font-bold text-emerald-700">{approvedCount}</Text>
            <Text className="text-[10px] font-medium text-emerald-600">Kabul</Text>
          </View>
          <View className="items-center rounded-xl bg-amber-50 px-4 py-2">
            <Text className="text-lg font-bold text-amber-700">{pendingCount}</Text>
            <Text className="text-[10px] font-medium text-amber-600">Bekliyor</Text>
          </View>
          <View className="items-center rounded-xl bg-rose-50 px-4 py-2">
            <Text className="text-lg font-bold text-rose-700">{rejectedCount}</Text>
            <Text className="text-[10px] font-medium text-rose-600">Red</Text>
          </View>
        </View>
      ) : null}

      {/* Owner: Tabs */}
      {isOwner ? (
        <View className="flex-row border-b border-slate-200 bg-white px-2">
          {OWNER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                className={`flex-1 items-center pb-2.5 pt-2 ${isActive ? `border-b-2 ${tab.activeColor}` : ''}`}
                onPress={() => setActiveTab(tab.key)}>
                <Text
                  className={`text-sm font-semibold ${isActive ? tab.activeColor.replace('border-', 'text-') : 'text-slate-400'}`}>
                  {tab.label}
                </Text>
                <View
                  className={`mt-0.5 rounded-full px-2 py-0.5 ${isActive ? tab.activeBg : 'bg-slate-100'}`}>
                  <Text
                    className={`text-[10px] font-bold ${isActive ? tab.activeText : 'text-slate-500'}`}>
                    {tabCounts[tab.key]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Non-owner: simple header */}
      {!isOwner ? (
        <View className="flex-row items-center gap-2 px-5 pb-2 pt-4">
          <UserCheck size={16} color="#059669" />
          <Text className="text-sm font-semibold text-slate-700">
            Kabul Edilen Katilimcilar ({approvedCount})
          </Text>
        </View>
      ) : null}

      {/* Participant list */}
      <ScrollView
        contentContainerClassName="gap-2 px-4 py-3 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredParticipants.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-sm text-slate-400">
              {isOwner ? activeTabConfig.emptyText : 'Henuz kabul edilen katilimci yok.'}
            </Text>
          </View>
        ) : (
          filteredParticipants.map((participant) => (
            <ParticipantCard
              key={participant.accountId}
              participant={participant}
              isOwner={isOwner}
              isPending={participant.status === 'Pending'}
              isMutating={reviewMutation.isPending}
              onApprove={() =>
                reviewMutation.mutate({
                  accountId: participant.accountId,
                  status: 'Approved',
                })
              }
              onReject={() =>
                reviewMutation.mutate({
                  accountId: participant.accountId,
                  status: 'Rejected',
                })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
