import { useMutation, useQueryClient } from '@tanstack/react-query';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Clock, UserCheck, UserX, XCircle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { TopBar } from '@/src/components/ui/top-bar';
import { ApptivityLogo } from '@/src/components/ui/apptivity-logo';
import { Button } from '@/src/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { hitSlop, theme } from '@/src/constants/theme';
import { closeEventVoting, updateEventParticipationStatus } from '@/src/api/eventService';
import { useEventDetail, useEventParticipants } from '@/src/hooks/useEvents';
import { useSubmitReview } from '@/src/hooks/useReviews';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { EventParticipantProfileDto, ParticipationStatus } from '@/src/types/event';
import { cn } from '@/src/utils/cn';
import { getApiErrorMessage } from '@/src/utils/error';
import { normalizePossiblyMojibakeText } from '@/src/utils/text';

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
    emptyText: 'Henüz kabul edilen katılımcı yok.',
    statusFilter: 'Approved',
    activeColor: 'border-emerald-600',
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
  },
  {
    key: 'pending',
    label: 'Bekliyor',
    emptyText: 'Bekleyen katılımcı yok.',
    statusFilter: 'Pending',
    activeColor: 'border-amber-600',
    activeBg: 'bg-amber-600',
    activeText: 'text-white',
  },
  {
    key: 'rejected',
    label: 'Red Edildi',
    emptyText: 'Reddedilen katılımcı yok.',
    statusFilter: 'Rejected',
    activeColor: 'border-rose-600',
    activeBg: 'bg-rose-600',
    activeText: 'text-white',
  },
];

function getStatusIcon(status: ParticipationStatus | string | number | null | undefined) {
  if (status === 'Approved' || status === 2) {
    return <CheckCircle2 size={14} color="#059669" />;
  }
  if (status === 'Pending' || status === 1) {
    return <Clock size={14} color="#d97706" />;
  }
  if (status === 'Rejected' || status === 3) {
    return <XCircle size={14} color="#e11d48" />;
  }
  return null;
}

function getStatusLabel(status: ParticipationStatus | string | number | null | undefined): string {
  if (status === 'Approved' || status === 2) return 'Kabul Edildi';
  if (status === 'Pending' || status === 1) return 'Bekliyor';
  if (status === 'Rejected' || status === 3) return 'Red Edildi';
  return '';
}

function getStatusColor(status: ParticipationStatus | string | number | null | undefined): string {
  if (status === 'Approved' || status === 2) return 'text-emerald-600';
  if (status === 'Pending' || status === 1) return 'text-amber-600';
  if (status === 'Rejected' || status === 3) return 'text-rose-600';
  return 'text-slate-500';
}

function getReputationDisplay(level: string | null | undefined) {
  if (!level) return null;

  const normalizedLevel = normalizePossiblyMojibakeText(level);

  if (normalizedLevel.includes('Yıldız') || normalizedLevel.toLowerCase().includes('yildiz')) {
    return { label: normalizedLevel, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' };
  }

  switch (normalizedLevel) {
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
      return { label: normalizedLevel, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  }
}

function normalizeAccountType(type: string | number | null | undefined): 'individual' | 'organization' | 'admin' | 'unknown' {
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

const PLACEHOLDER_AVATAR = 'https://ui-avatars.com/api/?background=e2e8f0&color=475569&bold=true&size=80';

function ParticipantVoting({
  accountType,
  isMutating,
  onSubmit,
}: {
  accountType: string | number | null | undefined;
  isMutating: boolean;
  onSubmit: (rating: number) => void;
}) {
  const isOrganizationTarget = normalizeAccountType(accountType) === 'organization';
  const [rating, setRating] = useState<number>(isOrganizationTarget ? 1 : 0);

  return (
    <View className="mt-3 border-t border-slate-100 pt-3">
      <Text className="mb-2 text-xs font-semibold text-slate-500">
        {isOrganizationTarget ? 'Organizasyonu Değerlendir' : 'Katılımcıyı Değerlendir'}
      </Text>

      {isOrganizationTarget ? (
        <View className="mb-3 flex-row items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((starValue) => {
            const isActive = starValue <= rating;

            return (
              <Pressable
                key={starValue}
                className="rounded-full p-1"
                disabled={isMutating}
                onPress={() => setRating(starValue)}>
                <Ionicons
                  name={isActive ? 'star' : 'star-outline'}
                  size={28}
                  color={isActive ? theme.colors.primary : theme.colors.textTertiary}
                />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="mb-3 items-center justify-center">
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={-2}
            maximumValue={2}
            step={1}
            value={rating}
            onValueChange={setRating}
            minimumTrackTintColor={rating > 0 ? '#10b981' : rating < 0 ? '#e11d48' : '#3b82f6'}
            maximumTrackTintColor="#e2e8f0"
            thumbTintColor={rating > 0 ? '#10b981' : rating < 0 ? '#e11d48' : '#3b82f6'}
          />
        </View>
      )}

      <Pressable
        style={{
          backgroundColor: isMutating ? theme.colors.surfaceTertiary : theme.colors.primary,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 4,
        }}
        className="mt-2 items-center justify-center rounded-xl py-3 active:opacity-70"
        disabled={isMutating}
        onPress={() => onSubmit(rating)}>
        {isMutating ? (
          <ActivityIndicator color={theme.colors.primaryDark} size="small" />
        ) : (
          <Text className="text-[15px] font-extrabold tracking-wide text-white">Oy Ver</Text>
        )}
      </Pressable>
    </View>
  );
}

function ParticipantCard({
  participant,
  isOwner,
  isPending,
  onApprove,
  onReject,
  isMutatingStatus,
  canVote,
  eventId,
}: {
  participant: EventParticipantProfileDto;
  isOwner: boolean;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
  isMutatingStatus: boolean;
  canVote: boolean;
  eventId: string;
}) {
  const submitReviewMutation = useSubmitReview();
  const avatarUri = participant.profilePhoto
    ? participant.profilePhoto
    : `${PLACEHOLDER_AVATAR}&name=${encodeURIComponent(participant.displayName || 'U')}`;

  const repDisplay = getReputationDisplay(participant.reputationLevel);

  return (
    <View className="mb-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <View className="flex-row items-center">
        <Pressable
          className="flex-row items-center flex-1"
          onPress={() => router.push(`/user/${participant.accountId}`)}
        >
          <Image
            source={{ uri: avatarUri }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            contentFit="cover"
            transition={120}
          />
          <View className="ml-3 flex-1">
            <Text className="flex-shrink text-sm font-semibold text-slate-900">{participant.displayName}</Text>
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
        </Pressable>

        {!canVote && !participant.isVoted && repDisplay ? (
          <View className={`mr-3 rounded border px-2 py-1 ${repDisplay.bg} ${repDisplay.border}`}>
            <Text className={`text-[10px] font-bold ${repDisplay.color}`}>{repDisplay.label}</Text>
          </View>
        ) : null}

        {participant.isVoted ? (
          <View className="mr-3 flex-row items-center gap-1 rounded-full border border-indigo-200 bg-indigo-100 px-2 py-1">
            <CheckCircle2 size={12} color="#4f46e5" />
            <Text className="text-[10px] font-bold text-indigo-600">Oy Verildi</Text>
          </View>
        ) : null}

        {isOwner && isPending ? (
          <View className="flex-row items-center gap-2">
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full bg-emerald-100"
              disabled={isMutatingStatus}
              onPress={onApprove}>
              <UserCheck size={18} color="#059669" />
            </Pressable>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full bg-rose-100"
              disabled={isMutatingStatus}
              onPress={onReject}>
              <UserX size={18} color="#e11d48" />
            </Pressable>
          </View>
        ) : null}
      </View>

      {canVote && !participant.isVoted ? (
        <ParticipantVoting
          accountType={participant.type}
          isMutating={submitReviewMutation.isPending}
          onSubmit={(rating) =>
            submitReviewMutation.mutate({
              eventId,
              reviewedAccountId: participant.accountId,
              rating,
              comment: null,
            })
          }
        />
      ) : null}
    </View>
  );
}

export function EventParticipantsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = params.id as string;
  const queryClient = useQueryClient();
  const toast = useToast();
  const myAccountId = useAuthStore((state) => state.user?.id);
  const myRole = useAuthStore((state) => state.user?.role);
  const [activeTab, setActiveTab] = useState<TabKey>('approved');
  const [refreshing, setRefreshing] = useState(false);
  const [isCloseVotingConfirmVisible, setIsCloseVotingConfirmVisible] = useState(false);

  const { data: eventData, isPending: isEventPending, refetch: refetchEvent } = useEventDetail(eventId);
  const participantsQuery = useEventParticipants(eventId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEvent(), participantsQuery.refetch()]);
    setRefreshing(false);
  }, [refetchEvent, participantsQuery]);

  const isOwner = Boolean(
    myAccountId &&
      eventData?.ownerId &&
      String(myAccountId).toLowerCase() === String(eventData.ownerId).toLowerCase(),
  );

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
      toast.error(getApiErrorMessage(error, 'Katılım durumu güncellenemedi.'));
    },
  });

  const closeVotingMutation = useMutation({
    mutationFn: () => closeEventVoting(eventId),
    onSuccess: async () => {
      setIsCloseVotingConfirmVisible(false);
      toast.success('Oylama kapatıldı. Puanlar güncellendi.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-participants', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['my-participations'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-stats'] }),
      ]);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Oylama kapatılamadı.'));
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
        <Text className="text-base text-slate-500">Etkinlik bulunamadı.</Text>
      </View>
    );
  }

  const allParticipants = participantsQuery.data?.participants ?? [];

  const isCompleted =
    String(eventData.status) === 'Completed' ||
    String(eventData.status) === '4' ||
    String(participantsQuery.data?.eventStatus) === 'Completed' ||
    String(participantsQuery.data?.eventStatus) === '4';
  const isApprovedParticipant =
    String(eventData.currentUserParticipationStatus) === 'Approved' ||
    String(eventData.currentUserParticipationStatus) === '2';
  const canIVote = myRole === 'Individual' && (isOwner || isApprovedParticipant);
  const isVotingClosed = participantsQuery.data?.isVotingClosed ?? false;

  const filteredParticipants = isOwner
    ? allParticipants.filter((p) => {
        const filterStr = OWNER_TABS.find((t) => t.key === activeTab)?.statusFilter;
        if (filterStr === 'Approved') return String(p.status) === 'Approved' || String(p.status) === '2';
        if (filterStr === 'Pending') return String(p.status) === 'Pending' || String(p.status) === '1';
        if (filterStr === 'Rejected') return String(p.status) === 'Rejected' || String(p.status) === '3';
        return String(p.status) === filterStr;
      })
    : allParticipants.filter((p) => String(p.status) === 'Approved' || String(p.status) === '2');

  const approvedCount = allParticipants.filter((p) => String(p.status) === 'Approved' || String(p.status) === '2').length;
  const pendingCount = allParticipants.filter((p) => String(p.status) === 'Pending' || String(p.status) === '1').length;
  const rejectedCount = allParticipants.filter((p) => String(p.status) === 'Rejected' || String(p.status) === '3').length;

  const tabCounts: Record<TabKey, number> = {
    approved: approvedCount,
    pending: pendingCount,
    rejected: rejectedCount,
  };

  const activeTabConfig = OWNER_TABS.find((t) => t.key === activeTab)!;

  return (
    <>
      <View className="flex-1 bg-slate-50">
      <Stack.Screen 
        options={{ 
          header: () => (
            <TopBar 
              leftContent={
                <View className="flex-row items-center gap-2">
                  <Pressable onPress={() => router.back()} hitSlop={hitSlop.md} className="flex-row items-center justify-center pl-2">
                    <IconSymbol name="chevron.left" size={28} color="#111827" />
                  </Pressable>
                  <ApptivityLogo />
                </View>
              }
            />
          )
        }} 
      />



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

      {isCompleted ? (
        <View className="bg-white px-4 pb-3">
          <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-800">
                  {isVotingClosed ? 'Oylama kapandı' : 'Oylama açık'}
                </Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">
                  {isVotingClosed
                    ? 'Oy verme tamamlandı. Güncel puanlar artık herkes için görünür.'
                    : isOwner
                      ? 'İstersen 24 saat dolmadan oylamayı kapatıp puanları hemen yansıtabilirsin.'
                      : 'Oylama süresi dolana kadar katılımcılar oy vermeye devam edebilir.'}
                </Text>
              </View>

              {isOwner && !isVotingClosed ? (
                <Pressable
                  className="rounded-xl bg-[#5bcc2a] px-4 py-3 active:opacity-80"
                  disabled={closeVotingMutation.isPending}
                  onPress={() => setIsCloseVotingConfirmVisible(true)}>
                  {closeVotingMutation.isPending ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text className="text-xs font-extrabold tracking-wide text-white">
                      Oylamayı Kapat
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

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
                <View className={`mt-0.5 rounded-full px-2 py-0.5 ${isActive ? tab.activeBg : 'bg-slate-100'}`}>
                  <Text className={`text-[10px] font-bold ${isActive ? tab.activeText : 'text-slate-500'}`}>
                    {tabCounts[tab.key]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {!isOwner ? (
        <View className="flex-row items-center gap-2 px-5 pb-2 pt-4">
          <UserCheck size={16} color="#059669" />
          <Text className="text-sm font-semibold text-slate-700">Kabul Edilen Katılımcılar ({approvedCount})</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerClassName="gap-4 px-4 py-3 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {participantsQuery.data?.organizer ? (
          <View className="gap-2">
            <View className="flex-row items-center gap-2 px-1 pb-1">
              <UserCheck size={16} color="#334155" />
              <Text className="text-sm font-semibold text-slate-700">Etkinlik Sahibi</Text>
            </View>
            <ParticipantCard
              key={participantsQuery.data.organizer.accountId}
              participant={participantsQuery.data.organizer}
              isOwner={false}
              isPending={false}
              isMutatingStatus={false}
              canVote={
                isCompleted &&
                !isVotingClosed &&
                canIVote &&
                String(participantsQuery.data.organizer.accountId).toLowerCase() !== String(myAccountId).toLowerCase()
              }
              eventId={eventId}
              onApprove={() => {}}
              onReject={() => {}}
            />
          </View>
        ) : null}

        <View className="mt-2 gap-2">
          <View className="flex-row items-center gap-2 px-1 pb-1">
            <UserCheck size={16} color="#334155" />
            <Text className="text-sm font-semibold text-slate-700">Katılımcılar</Text>
          </View>

          {filteredParticipants.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-sm text-slate-400">
                {isOwner ? activeTabConfig.emptyText : 'Henüz kabul edilen katılımcı yok.'}
              </Text>
            </View>
          ) : (
            filteredParticipants.map((participant) => {
              const isTargetApproved = String(participant.status) === 'Approved' || String(participant.status) === '2';
              const isTargetMe = String(participant.accountId).toLowerCase() === String(myAccountId).toLowerCase();
              const canVoteForThisParticipant =
                isCompleted && !isVotingClosed && canIVote && !isTargetMe && isTargetApproved;

              return (
                <ParticipantCard
                  key={participant.accountId}
                  participant={participant}
                  isOwner={isOwner}
                  isPending={participant.status === 'Pending' || participant.status === 1}
                  isMutatingStatus={reviewMutation.isPending}
                  canVote={canVoteForThisParticipant}
                  eventId={eventId}
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
              );
            })
          )}
        </View>
      </ScrollView>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isCloseVotingConfirmVisible}
        onRequestClose={() => {
          if (!closeVotingMutation.isPending) {
            setIsCloseVotingConfirmVisible(false);
          }
        }}>
        <View className="flex-1 justify-end bg-black/35">
          <Pressable
            className="absolute inset-0"
            disabled={closeVotingMutation.isPending}
            onPress={() => setIsCloseVotingConfirmVisible(false)}
          />

          <View className="rounded-t-3xl bg-white px-5 pb-6 pt-5">
            <Text className="text-lg font-semibold text-slate-900">Oylamayı Kapat</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-500">
              Bu işlem oylamayı hemen kapatır ve puanları herkese yansıtır. Kapatıldıktan sonra yeniden açılamaz.
            </Text>

            <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Text className="text-xs font-semibold uppercase tracking-[0.4px] text-amber-700">Dikkat</Text>
              <Text className="mt-1 text-sm leading-5 text-amber-800">
                Henüz oy vermemiş kullanıcılar varsa bu işlemden sonra değerlendirme yapamaz.
              </Text>
            </View>

            <View className="mt-5 flex-row gap-3">
              <Button
                label="Vazgeç"
                variant="secondary"
                className="flex-1"
                disabled={closeVotingMutation.isPending}
                onPress={() => setIsCloseVotingConfirmVisible(false)}
              />
              <Button
                label="Oylamayı Kapat"
                className={cn('flex-1', closeVotingMutation.isPending ? '' : 'bg-[#5bcc2a]')}
                isLoading={closeVotingMutation.isPending}
                onPress={() => closeVotingMutation.mutate()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
