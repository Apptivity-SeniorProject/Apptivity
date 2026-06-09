import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getEventMessages, mapRawMessage, type RawMessageDto } from '@/src/api/chatService';
import { Button } from '@/src/components/ui/button';
import { useEventDetail } from '@/src/hooks/useEvents';
import { useSignalR } from '@/src/hooks/useSignalR';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useChatStore } from '@/src/store/useChatStore';
import type { MessageDto } from '@/src/types/chat';
import { getApiErrorMessage } from '@/src/utils/error';
import { ChatReportModal } from '@/src/components/reports/chat-report-modal';
import { AlertCircle } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

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

  if (message.senderName?.trim()) {
    return message.senderName.trim();
  }

  return 'Kullanici';
}

function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function ChatScreen() {
  const params = useLocalSearchParams<{ id?: string; eventId?: string; joined?: string }>();
  const eventId = params.eventId ?? params.id ?? '';
  const joinedHint = params.joined === '1';

  const accessToken = useAuthStore((state) => state.accessToken);
  const myAccountId = useAuthStore((state) => state.user?.id);

  const setActiveEvent = useChatStore((state) => state.setActiveEvent);
  const clearUnread = useChatStore((state) => state.clearUnread);
  const incrementUnread = useChatStore((state) => state.incrementUnread);

  const listRef = useRef<FlatList<MessageDto>>(null);
  const [inputValue, setInputValue] = useState('');
  const [liveMessages, setLiveMessages] = useState<MessageDto[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(76);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  const eventDetailQuery = useEventDetail(eventId, {
    refetchIntervalMs: 8000,
  });
  const isOwner = Boolean(
    myAccountId &&
      eventDetailQuery.data?.ownerId &&
      myAccountId === eventDetailQuery.data.ownerId
  );
  const isApprovedParticipant = eventDetailQuery.data?.currentUserParticipationStatus === 'Approved';
  const canAccessChat = joinedHint || isOwner || isApprovedParticipant;

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', eventId],
    queryFn: () => getEventMessages(eventId, 1, 50),
    enabled: Boolean(eventId && canAccessChat),
    staleTime: 30000,
  });

  const { connectionStatus, leaveEventRoom, stopConnection, sendMessageToRoom } = useSignalR<RawMessageDto>({
    eventId,
    accessToken,
    enabled: Boolean(eventId && accessToken && canAccessChat),
    onReceiveMessage: (payload) => {
      const message = mapRawMessage(payload);

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
    },
  });

  useEffect(() => {
    if (!eventId) {
      return;
    }

    setActiveEvent(eventId);
    clearUnread(eventId);

    return () => {
      setActiveEvent(null);
      void leaveEventRoom(eventId);
      void stopConnection();
    };
  }, [clearUnread, eventId, leaveEventRoom, setActiveEvent, stopConnection]);

  useEffect(() => {
    if (connectionStatus === 'Disconnected' && eventId && accessToken && canAccessChat) {
      setConnectionError('Sohbet baglantisi kesildi. Yeniden baglaniliyor.');
      return;
    }

    setConnectionError(null);
  }, [accessToken, canAccessChat, connectionStatus, eventId]);

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

  useEffect(() => {
    if (allMessages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [allMessages.length]);

  useEffect(() => {
    const handleKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessageToRoom(eventId, content),
    onSuccess: () => {
      setInputValue('');
      clearUnread(eventId);
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, 'Mesaj gonderilemedi.');
      if (message.toLowerCase().includes('expired')) {
        setConnectionError('Etkinlik sohbet suresi doldu (baslangictan 2 saat sonra kapanir).');
        return;
      }
      setConnectionError(message);
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

  if (!canAccessChat) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-center text-base text-slate-600">
          Sohbete sadece etkinlik sahibi veya onayli katilimcilar erisebilir.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen 
        options={{ 
          title: 'Etkinlik Sohbeti',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => setIsReportModalVisible(true)}
              className="mr-2 p-2 rounded-full hover:bg-slate-100"
            >
              <AlertCircle size={20} color="#ef4444" />
            </TouchableOpacity>
          )
        }} 
      />
      <View className="flex-1">
        {connectionError ? (
          <View className="mx-4 mt-3 rounded-xl bg-rose-100 px-3 py-2">
            <Text className="text-sm text-rose-700">{connectionError}</Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          className="flex-1 px-4 pt-4"
          data={allMessages}
          keyExtractor={(item) => item.messageId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            gap: 12,
            paddingBottom:
              composerHeight + (Platform.OS === 'android' ? keyboardHeight : 0) + 12,
          }}
          onContentSizeChange={() => {
            if (allMessages.length > 0) {
              listRef.current?.scrollToEnd({ animated: true });
            }
          }}
          renderItem={({ item }) => {
            const isMine = item.senderAccountId === myAccountId;
            const name = senderDisplayName(item, myAccountId);
            const bubbleClassName = isMine
              ? 'max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600 px-3 py-2'
              : 'max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3 py-2';

            return (
              <View className={isMine ? 'items-end' : 'items-start'}>
                <View className={isMine ? '' : 'flex-row items-end gap-2'}>
                  {!isMine ? (
                    item.senderProfilePhoto ? (
                      <Image
                        source={{ uri: item.senderProfilePhoto }}
                        style={{ width: 24, height: 24, borderRadius: 999 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="h-6 w-6 items-center justify-center rounded-full bg-slate-200">
                        <Text className="text-[10px] font-semibold text-slate-700">
                          {getInitials(name)}
                        </Text>
                      </View>
                    )
                  ) : null}

                  <View className={bubbleClassName}>
                    <Text
                      className={
                        isMine
                          ? 'text-xs font-semibold text-emerald-100'
                          : 'text-xs font-semibold text-slate-500'
                      }>
                      {name}
                    </Text>
                    <Text className={isMine ? 'mt-1 text-sm text-white' : 'mt-1 text-sm text-slate-800'}>
                      {item.content}
                    </Text>
                    <Text
                      className={
                        isMine ? 'mt-1 text-[11px] text-emerald-100' : 'mt-1 text-[11px] text-slate-400'
                      }>
                      {formatTimestamp(item.sentAtUtc)}
                    </Text>
                  </View>
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

        <View
          className="absolute inset-x-0 flex-row items-end gap-2 border-t border-slate-200 bg-white px-4 pb-4 pt-3"
          style={{ bottom: Platform.OS === 'android' ? keyboardHeight : 0 }}
          onLayout={(event) => {
            setComposerHeight(event.nativeEvent.layout.height);
          }}>
          <TextInput
            className="min-h-12 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            placeholder="Mesaj yaz..."
            placeholderTextColor="#94A3B8"
            value={inputValue}
            onChangeText={setInputValue}
            onFocus={() => {
              requestAnimationFrame(() => {
                listRef.current?.scrollToEnd({ animated: true });
              });
            }}
            multiline
            maxLength={500}
          />
          <Button
            label="Gonder"
            className="h-12 px-4"
            isLoading={sendMutation.isPending}
            disabled={!inputValue.trim() || connectionStatus !== 'Connected'}
            onPress={() => sendMutation.mutate(inputValue.trim())}
          />
        </View>
      </View>

      <ChatReportModal 
        visible={isReportModalVisible} 
        onClose={() => setIsReportModalVisible(false)} 
        eventId={eventId} 
      />
    </SafeAreaView>
  );
}

export { ChatScreen as EventChatScreen };
