import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  type KeyboardEvent,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Bell, CheckCheck, ChevronLeft, MessageCircle, Send } from 'lucide-react-native';

import { getEventMessages, mapRawMessage, type RawMessageDto } from '@/src/api/chatService';
import { ChatReportModal } from '@/src/components/reports/chat-report-modal';
import { colors, palette, hitSlop } from '@/src/constants/theme';
import { useEventDetail } from '@/src/hooks/useEvents';
import { useSignalR } from '@/src/hooks/useSignalR';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useChatStore } from '@/src/store/useChatStore';
import { useNotifications } from '@/src/hooks/useNotifications';
import type { MessageDto } from '@/src/types/chat';
import { getApiErrorMessage } from '@/src/utils/error';
import { normalizePossiblyMojibakeText } from '@/src/utils/text';

// ── Mockup design tokens (flat, rounded-square language) ──
const RADIUS = {
  btn: 10,
  avatar: 10,
  send: 12,
  input: 22,
  emptyIcon: 18,
  bubble: 16,
  bubbleTail: 4,
};
const BORDER_COLOR = '#e5e7eb';
const BORDER_WIDTH = 0.5;

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
    return normalizePossiblyMojibakeText(message.senderName.trim());
  }

  return 'Kullanıcı';
}

function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
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
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState('');
  const [liveMessages, setLiveMessages] = useState<MessageDto[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(62);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const composerOffset = keyboardHeight > 0 ? Math.max(keyboardHeight - insets.bottom, 0) : 0;

  const notificationsQuery = useNotifications(50);
  const unreadCount = (notificationsQuery.data?.items ?? []).filter((n) => !n.isRead).length;

  const eventDetailQuery = useEventDetail(eventId, {});
  const isOwner = Boolean(
    myAccountId &&
      eventDetailQuery.data?.ownerId &&
      myAccountId === eventDetailQuery.data.ownerId
  );
  const isApprovedParticipant =
    eventDetailQuery.data?.currentUserParticipationStatus === 'Approved';
  const canAccessChat = joinedHint || isOwner || isApprovedParticipant;

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', eventId],
    queryFn: () => getEventMessages(eventId, 1, 50),
    enabled: Boolean(eventId && canAccessChat),
    refetchInterval: 5000,
  });

  const { connectionStatus, leaveEventRoom, stopConnection, sendMessageToRoom } =
    useSignalR<RawMessageDto>({
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
          if (current.some((item) => item.messageId === message.messageId)) return current;
          return [...current, message];
        });
      },
    });

  useEffect(() => {
    if (!eventId) return;
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
      setConnectionError('Sohbet bağlantısı kesildi. Yeniden bağlanılıyor.');
      return;
    }
    setConnectionError(null);
  }, [accessToken, canAccessChat, connectionStatus, eventId]);

  const allMessages = useMemo(() => {
    const apiItems = messagesQuery.data?.items ?? [];
    const merged = [...apiItems, ...liveMessages];
    const map = new Map<string, MessageDto>();
    merged.forEach((m) => map.set(m.messageId, m));
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.sentAtUtc).getTime() - new Date(b.sentAtUtc).getTime()
    );
  }, [liveMessages, messagesQuery.data?.items]);

  useEffect(() => {
    if (allMessages.length === 0) return;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [allMessages.length]);

  useEffect(() => {
    const handleShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    };
    const handleHide = () => setKeyboardHeight(0);
    const s1 = Keyboard.addListener('keyboardDidShow', handleShow);
    const s2 = Keyboard.addListener('keyboardDidHide', handleHide);
    return () => { s1.remove(); s2.remove(); };
  }, []);

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessageToRoom(eventId, content),
    onSuccess: () => { setInputValue(''); clearUnread(eventId); },
    onError: (error) => {
      const msg = getApiErrorMessage(error, 'Mesaj gönderilemedi.');
      if (msg.toLowerCase().includes('expired')) {
        setConnectionError('Etkinlik sohbet süresi doldu. Sohbet başlangıçtan 2 saat sonra kapanır.');
        return;
      }
      setConnectionError(msg);
    },
  });

  const loading = eventDetailQuery.isPending || messagesQuery.isPending;
  const eventTitle = eventDetailQuery.data?.title ?? 'Etkinlik sohbeti';
  const isDisabled = !inputValue.trim() || connectionStatus !== 'Connected' || sendMutation.isPending;

  // ── Loading ──
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.surfaceSecondary }}>
        <ActivityIndicator color={palette.primary[600]} />
        <Text style={{ marginTop: 12, fontSize: 13, fontWeight: '500', color: '#6b7280' }}>
          Sohbet hazırlanıyor...
        </Text>
      </View>
    );
  }

  // ── Access denied ──
  if (!canAccessChat) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: colors.surfaceSecondary }}>
        <View style={{
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: BORDER_WIDTH,
          borderColor: BORDER_COLOR,
          paddingHorizontal: 24,
          paddingVertical: 32,
          maxWidth: 320,
          width: '100%',
        }}>
          <View style={{
            width: 60, height: 60, borderRadius: RADIUS.emptyIcon,
            backgroundColor: palette.primary[50],
            borderWidth: 1, borderColor: palette.primary[200],
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <MessageCircle size={28} color={palette.primary[600]} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '500', color: palette.primary[900], marginBottom: 8 }}>
            Sohbet erişimi kapalı
          </Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 }}>
            Sohbete sadece etkinlik sahibi veya{'\n'}onaylı katılımcılar erişebilir.
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface }}>
      {/* ════════ HEADER ════════ */}
      <Stack.Screen
        options={{
          header: () => (
            <View style={{ backgroundColor: colors.surface, paddingTop: insets.top }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: BORDER_WIDTH,
                borderBottomColor: BORDER_COLOR,
              }}>
                {/* Back — rounded square */}
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={hitSlop.md}
                  style={{
                    width: 34, height: 34, borderRadius: RADIUS.btn,
                    backgroundColor: colors.surfaceSecondary,
                    borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                  <ChevronLeft size={16} color={palette.primary[700]} />
                </Pressable>

                {/* Avatar — rounded square */}
                <View style={{
                  width: 36, height: 36, borderRadius: RADIUS.avatar,
                  backgroundColor: palette.primary[50],
                  borderWidth: 1, borderColor: palette.primary[200],
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageCircle size={18} color={palette.primary[600]} />
                </View>

                {/* Title + status */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13, fontWeight: '500', color: palette.primary[900],
                      maxWidth: 160,
                    }}
                    numberOfLines={1}>
                    {eventTitle}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <View style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: connectionStatus === 'Connected' ? palette.primary[400] : '#9ca3af',
                    }} />
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>
                      {allMessages.length} mesaj · {connectionStatus === 'Connected' ? 'Çevrimiçi' : 'Bağlanıyor...'}
                    </Text>
                  </View>
                </View>

                {/* Notification bell — rounded square */}
                <Pressable
                  onPress={() => router.push('/(tabs)/notifications')}
                  style={{
                    width: 34, height: 34, borderRadius: RADIUS.btn,
                    backgroundColor: colors.surfaceSecondary,
                    borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Bell size={16} color={palette.primary[700]} />
                  {unreadCount > 0 ? (
                    <View style={{
                      position: 'absolute', top: -4, right: -4,
                      width: 16, height: 16, borderRadius: 8,
                      backgroundColor: '#ef4444',
                      borderWidth: 1.5, borderColor: colors.surface,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: '600', color: '#fff' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>
          ),
        }}
      />

      <View className="flex-1">
        {/* Connection error */}
        {connectionError ? (
          <View style={{
            marginHorizontal: 16, marginTop: 8,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.errorLight, borderRadius: 12,
            borderWidth: BORDER_WIDTH, borderColor: colors.errorMuted,
            paddingHorizontal: 12, paddingVertical: 8,
          }}>
            <AlertCircle size={14} color={colors.error} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.error, lineHeight: 18 }}>
              {connectionError}
            </Text>
          </View>
        ) : null}

        {/* ════════ MESSAGES ════════ */}
        <FlatList
          ref={listRef}
          className="flex-1"
          data={allMessages}
          keyExtractor={(item) => item.messageId}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: composerHeight + composerOffset + 8,
            gap: 8,
            flexGrow: allMessages.length === 0 ? 1 : undefined,
          }}
          onContentSizeChange={() => {
            if (allMessages.length > 0) listRef.current?.scrollToEnd({ animated: true });
          }}
          renderItem={({ item }) => {
            const isMine = item.senderAccountId === myAccountId;
            const name = senderDisplayName(item, myAccountId);

            return (
              <View style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                <View style={{
                  flexDirection: isMine ? 'column' : 'row',
                  alignItems: 'flex-end',
                  gap: 8,
                  maxWidth: '82%',
                }}>
                  {/* Avatar — other users */}
                  {!isMine ? (
                    item.senderProfilePhoto ? (
                      <Image
                        source={{ uri: item.senderProfilePhoto }}
                        style={{ width: 30, height: 30, borderRadius: RADIUS.avatar }}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={{
                        width: 30, height: 30, borderRadius: RADIUS.avatar,
                        backgroundColor: colors.surfaceTertiary,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280' }}>
                          {getInitials(name)}
                        </Text>
                      </View>
                    )
                  ) : null}

                  {/* Bubble */}
                  <View>
                    {!isMine ? (
                      <Text style={{
                        fontSize: 11, fontWeight: '600', color: '#9ca3af',
                        marginBottom: 3, marginLeft: 2,
                      }}>
                        {name}
                      </Text>
                    ) : null}

                    <View style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: RADIUS.bubble,
                      borderBottomRightRadius: isMine ? RADIUS.bubbleTail : RADIUS.bubble,
                      borderBottomLeftRadius: isMine ? RADIUS.bubble : RADIUS.bubbleTail,
                      backgroundColor: isMine ? palette.primary[100] : colors.surfaceSecondary,
                    }}>
                      <Text style={{
                        fontSize: 13, lineHeight: 19,
                        color: isMine ? palette.primary[900] : palette.neutral[900],
                      }}>
                        {item.content}
                      </Text>

                      {/* Time + read receipt */}
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'flex-end', gap: 3, marginTop: 4,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          color: isMine ? palette.primary[600] : '#9ca3af',
                        }}>
                          {formatTimestamp(item.sentAtUtc)}
                        </Text>
                        {isMine ? (
                          <CheckCheck size={12} color={palette.primary[500]} strokeWidth={2.5} />
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{
              flex: 1,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.surfaceSecondary,
              padding: 16,
            }}>
              <View style={{
                alignItems: 'center', gap: 12,
              }}>
                {/* Icon — rounded square, matching mockup */}
                <View style={{
                  width: 60, height: 60, borderRadius: RADIUS.emptyIcon,
                  backgroundColor: palette.primary[50],
                  borderWidth: 1, borderColor: palette.primary[200],
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageCircle size={28} color={palette.primary[600]} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '500', color: palette.primary[900] }}>
                  Henüz mesaj yok
                </Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 }}>
                  İlk mesajı gönderip sohbeti{'\n'}başlatabilirsin.
                </Text>
              </View>
            </View>
          }
        />

        {/* ════════ INPUT AREA ════════ */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: composerOffset,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.surface,
            borderTopWidth: BORDER_WIDTH,
            borderTopColor: BORDER_COLOR,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
          onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}>
          {/* Input */}
          <View style={{
            flex: 1,
            backgroundColor: colors.surfaceSecondary,
            borderWidth: BORDER_WIDTH,
            borderColor: BORDER_COLOR,
            borderRadius: RADIUS.input,
            paddingHorizontal: 16,
            minHeight: 42,
            maxHeight: 120,
            justifyContent: 'center',
          }}>
            <TextInput
              ref={inputRef}
              style={{
                fontSize: 13,
                color: palette.primary[900],
                paddingVertical: 10,
                maxHeight: 100,
                textAlignVertical: 'center',
              }}
              placeholder="Bir mesaj yaz…"
              placeholderTextColor="#9ca3af"
              value={inputValue}
              onChangeText={setInputValue}
              onFocus={() => {
                requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
              }}
              multiline
              scrollEnabled
              maxLength={500}
            />
          </View>

          {/* Send — always green, rounded square */}
          <Pressable
            disabled={isDisabled}
            onPress={() => sendMutation.mutate(inputValue.trim())}
            style={({ pressed }) => ({
              width: 46, height: 46, borderRadius: 14,
              backgroundColor: palette.primary[400],
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}>
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color={palette.primary[900]} />
            ) : (
              <Send size={20} color={palette.primary[900]} />
            )}
          </Pressable>
        </View>
      </View>

      <ChatReportModal
        visible={isReportModalVisible}
        onClose={() => setIsReportModalVisible(false)}
        eventId={eventId}
      />
    </View>
  );
}

export { ChatScreen as EventChatScreen };
