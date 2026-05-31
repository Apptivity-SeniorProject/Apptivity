import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CHAT_HUB_URL } from '@/src/constants/env';

export type SignalRConnectionStatus = 'Connected' | 'Reconnecting' | 'Disconnected';

interface UseSignalROptions<TMessage = unknown> {
  eventId: string;
  accessToken: string | null;
  enabled?: boolean;
  hubUrl?: string;
  onReceiveMessage?: (message: TMessage) => void;
}

interface UseSignalRResult {
  connectionStatus: SignalRConnectionStatus;
  joinEventRoom: (targetEventId?: string) => Promise<void>;
  leaveEventRoom: (targetEventId?: string) => Promise<void>;
  sendMessageToRoom: (targetEventId: string, message: string) => Promise<void>;
  stopConnection: () => Promise<void>;
}

const JOIN_ROOM_METHODS = ['JoinEventRoom', 'JoinEventChat'] as const;
const LEAVE_ROOM_METHODS = ['LeaveEventRoom', 'LeaveEventChat'] as const;
const SEND_MESSAGE_METHODS = ['SendMessageToRoom', 'SendMessage'] as const;

async function invokeWithFallback(
  connection: HubConnection,
  methods: readonly string[],
  ...args: unknown[]
): Promise<void> {
  let lastError: unknown;

  for (const method of methods) {
    try {
      await connection.invoke(method, ...args);
      return;
    } catch (error: unknown) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('SignalR method invocation failed.');
}

export function useSignalR<TMessage = unknown>({
  eventId,
  accessToken,
  enabled = true,
  hubUrl = CHAT_HUB_URL,
  onReceiveMessage,
}: UseSignalROptions<TMessage>): UseSignalRResult {
  const connectionRef = useRef<HubConnection | null>(null);
  const receiveHandlerRef = useRef(onReceiveMessage);
  const roomIdRef = useRef<string | null>(null);
  const signalRListenerRef = useRef<((message: unknown) => void) | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<SignalRConnectionStatus>('Disconnected');

  useEffect(() => {
    receiveHandlerRef.current = onReceiveMessage;
  }, [onReceiveMessage]);

  const joinEventRoom = useCallback(
    async (targetEventId?: string) => {
      const roomId = targetEventId ?? eventId;
      const connection = connectionRef.current;

      if (!connection || !roomId) {
        return;
      }

      await invokeWithFallback(connection, JOIN_ROOM_METHODS, roomId);
      roomIdRef.current = roomId;
    },
    [eventId]
  );

  const leaveEventRoom = useCallback(
    async (targetEventId?: string) => {
      const roomId = targetEventId ?? roomIdRef.current ?? eventId;
      const connection = connectionRef.current;

      if (!connection || !roomId) {
        return;
      }

      try {
        await invokeWithFallback(connection, LEAVE_ROOM_METHODS, roomId);
      } finally {
        if (roomIdRef.current === roomId) {
          roomIdRef.current = null;
        }
      }
    },
    [eventId]
  );

  const sendMessageToRoom = useCallback(
    async (targetEventId: string, message: string) => {
      const connection = connectionRef.current;

      if (!connection || connection.state !== HubConnectionState.Connected) {
        throw new Error('Chat baglantisi hazir degil.');
      }

      await invokeWithFallback(connection, SEND_MESSAGE_METHODS, targetEventId, message);
    },
    []
  );

  const stopConnection = useCallback(async () => {
    const connection = connectionRef.current;
    if (!connection) {
      setConnectionStatus('Disconnected');
      return;
    }

    const listener = signalRListenerRef.current;
    const joinedRoomId = roomIdRef.current;

    connectionRef.current = null;
    signalRListenerRef.current = null;
    roomIdRef.current = null;
    setConnectionStatus('Disconnected');

    if (listener) {
      connection.off('ReceiveMessage', listener);
    }

    try {
      if (joinedRoomId) {
        await invokeWithFallback(connection, LEAVE_ROOM_METHODS, joinedRoomId);
      }
    } catch {
      // Baglanti kopukken odadan cikis invoke hatasi yutulur.
    }

    await connection.stop();
  }, []);

  useEffect(() => {
    if (!enabled || !eventId || !accessToken) {
      setConnectionStatus('Disconnected');
      return;
    }

    let disposed = false;

    const start = async () => {
      await stopConnection();

      const connection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => accessToken,
          transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();

      connection.onreconnecting(() => {
        if (!disposed) {
          setConnectionStatus('Reconnecting');
        }
      });

      connection.onreconnected(() => {
        if (disposed) {
          return;
        }
        setConnectionStatus('Connected');
        void joinEventRoom(eventId);
      });

      connection.onclose(() => {
        if (!disposed) {
          setConnectionStatus('Disconnected');
        }
      });

      const listener = (payload: unknown) => {
        receiveHandlerRef.current?.(payload as TMessage);
      };

      signalRListenerRef.current = listener;
      connection.on('ReceiveMessage', listener);

      connectionRef.current = connection;
      await connection.start();
      setConnectionStatus('Connected');
      await joinEventRoom(eventId);
    };

    start().catch(() => {
      if (!disposed) {
        setConnectionStatus('Disconnected');
      }
    });

    return () => {
      disposed = true;
      void stopConnection();
    };
  }, [accessToken, enabled, eventId, hubUrl, joinEventRoom, stopConnection]);

  return {
    connectionStatus,
    joinEventRoom,
    leaveEventRoom,
    sendMessageToRoom,
    stopConnection,
  };
}
