import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { chatSignalRService, getEventMessages } from '@/src/api/chatService';
import { Button } from '@/src/components/ui/button';
import { useEventDetail } from '@/src/hooks/useEvents';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useChatStore } from '@/src/store/useChatStore';
import type { MessageDto } from '@/src/types/chat';
import { getApiErrorMessage } from '@/src/utils/error';

function formatTimestamp(value: string): string {
  try {
    return format(new Date(value), 'HH:mm', { locale: tr });
  } catch {
    return '--:--';
  }
}

function senderDisplayName(message: MessageDto, myAccountId?: string): string {
  if (message.senderAccountId === myAccountId) {
    return 'Sen';
  }

  if (message.senderName) {
    return message.senderName;
  }

  return `Kullanici ${message.senderAccountId.slice(0, 6)}`;
}

export function EventChatScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = params.id ?? '';
  const queryClient = useQueryClient();

  const accessToken = useAuthStore((state) => state.accessToken);
  const myAccountId = useAuthStore((state) => state.user?.id);

  const setActiveEvent = useChatStore((state) => state.setActiveEvent);
  const clearUnread = useChatStore((state) => state.clearUnread);
  const incrementUnread = useChatStore((state) => state.incrementUnread);

  const [inputValue, setInputValue] = useState('');
  const [liveMessages, setLiveMessages] = useState<MessageDto[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const eventDetailQuery = useEventDetail(eventId);
  const isApprovedParticipant = eventDetailQuery.data?.currentUserParticipationStatus === 'Approved';

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', eventId],
    queryFn: () => getEventMessages(eventId, 1, 50),
    enabled: Boolean(eventId && isApprovedParticipant),
    staleTime: 30000,
  });

  useEffect(() => {
    if (!eventId || !accessToken || !isApprovedParticipant) {
      return;
    }

    let disposed = false;
    setActiveEvent(eventId);
    clearUnread(eventId);

    const unsubscribe = chatSignalRService.onReceiveMessage((message) => {
      if (message.eventId !== eventId) {
        incrementUnread(message.eventId);
        return;
      }

      setLiveMessages((current) => {
        if (current.some((item) => item.messageId === message.messageId)) {
          return current;
        }
        return [...current, message];
      });
      if (message.senderAccountId !== myAccountId) {
        incrementUnread(eventId);
      }
    });

    chatSignalRService
      .startConnection(eventId, accessToken)
      .catch((error: unknown) => {
        if (!disposed) {
          setConnectionError(getApiErrorMessage(error, 'Sohbet baglantisi kurulamadi.'));
        }
      });

    return () => {
      disposed = true;
      unsubscribe();
      setActiveEvent(null);
      chatSignalRService.stopConnection().catch(() => {
        // ekran kapatilirken baglanti durdurma hatasi yutulur
      });
    };
  }, [
    accessToken,
    clearUnread,
    eventId,
    incrementUnread,
    isApprovedParticipant,
    myAccountId,
    setActiveEvent,
  ]);

  const allMessages = useMemo(() => {
    const apiItems = messagesQuery.data?.items ?? [];
    const merged = [...apiItems, ...liveMessages];
    const map = new Map<string, MessageDto>();
    merged.forEach((message) => {
      map.set(message.messageId, message);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.sentAtUtc).getTime() - new Date(b.sentAtUtc).getTime()
    );
  }, [liveMessages, messagesQuery.data?.items]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatSignalRService.sendMessage(eventId, content),
    onSuccess: () => {
      setInputValue('');
    },
    onError: (error) => {
      setConnectionError(getApiErrorMessage(error, 'Mesaj gonderilemedi.'));
    },
  });

  const loading = eventDetailQuery.isPending || messagesQuery.isPending;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  if (!isApprovedParticipant) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-center text-base text-slate-600">
          Sohbete yalnizca onayli katilimcilar erisebilir.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ title: 'Etkinlik Sohbeti' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {connectionError ? (
          <View className="mx-4 mt-3 rounded-xl bg-rose-100 px-3 py-2">
            <Text className="text-sm text-rose-700">{connectionError}</Text>
          </View>
        ) : null}

        <FlatList
          className="flex-1 px-4 pt-4"
          data={allMessages}
          keyExtractor={(item) => item.messageId}
          contentContainerClassName="gap-3 pb-4"
          renderItem={({ item }) => {
            const isMine = item.senderAccountId === myAccountId;
            return (
              <View className={isMine ? 'items-end' : 'items-start'}>
                <View
                  className={
                    isMine
                      ? 'max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-3 py-2'
                      : 'max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3 py-2'
                  }>
                  <Text className={isMine ? 'text-xs font-semibold text-blue-100' : 'text-xs font-semibold text-slate-500'}>
                    {senderDisplayName(item, myAccountId)}
                  </Text>
                  <Text className={isMine ? 'mt-1 text-sm text-white' : 'mt-1 text-sm text-slate-800'}>
                    {item.content}
                  </Text>
                  <Text className={isMine ? 'mt-1 text-[11px] text-blue-100' : 'mt-1 text-[11px] text-slate-400'}>
                    {formatTimestamp(item.sentAtUtc)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="mt-10 items-center">
              <Text className="text-sm text-slate-500">Henuz mesaj yok.</Text>
            </View>
          }
        />

        <View className="flex-row items-end gap-2 border-t border-slate-200 bg-white px-4 pb-4 pt-3">
          <TextInput
            className="min-h-12 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            placeholder="Mesaj yaz..."
            placeholderTextColor="#94A3B8"
            value={inputValue}
            onChangeText={setInputValue}
            multiline
            maxLength={500}
          />
          <Button
            label="Gonder"
            className="h-12 px-4"
            isLoading={sendMutation.isPending}
            disabled={!inputValue.trim()}
            onPress={() => sendMutation.mutate(inputValue.trim())}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
