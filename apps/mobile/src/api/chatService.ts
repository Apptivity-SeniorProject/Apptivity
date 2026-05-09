import {
  HubConnection,
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';

import { apiClient } from '@/src/api/apiClient';
import { CHAT_HUB_URL } from '@/src/constants/env';
import type { ApiEnvelope } from '@/src/types/api';
import type { MessageDto } from '@/src/types/chat';
import type { PagedResult } from '@/src/types/event';

type ReceiveMessageHandler = (message: MessageDto) => void;

interface RawMessageDto {
  messageId?: string;
  eventId?: string;
  senderAccountId?: string;
  content?: string;
  sentAtUtc?: string;
  MessageId?: string;
  EventId?: string;
  SenderAccountId?: string;
  Content?: string;
  SentAtUtc?: string;
}

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'Istek basarisiz.');
}

function mapMessage(raw: RawMessageDto): MessageDto {
  return {
    messageId: raw.messageId ?? raw.MessageId ?? '',
    eventId: raw.eventId ?? raw.EventId ?? '',
    senderAccountId: raw.senderAccountId ?? raw.SenderAccountId ?? '',
    content: raw.content ?? raw.Content ?? '',
    sentAtUtc: raw.sentAtUtc ?? raw.SentAtUtc ?? new Date().toISOString(),
  };
}

class ChatSignalRService {
  private connection: HubConnection | null = null;
  private connectedEventId: string | null = null;
  private handlers = new Set<ReceiveMessageHandler>();

  onReceiveMessage(handler: ReceiveMessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emitMessage(message: MessageDto): void {
    this.handlers.forEach((handler) => {
      handler(message);
    });
  }

  async startConnection(eventId: string, token: string): Promise<void> {
    if (this.connection && this.connectedEventId === eventId) {
      return;
    }

    await this.stopConnection();
    console.log('Attempting to connect to SignalR at:', CHAT_HUB_URL);

    const connection = new HubConnectionBuilder()
      .withUrl(CHAT_HUB_URL, {
        accessTokenFactory: () => token,
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('ReceiveMessage', (payload: RawMessageDto) => {
      this.emitMessage(mapMessage(payload));
    });

    await connection.start();
    await connection.invoke('JoinEventChat', eventId);

    this.connection = connection;
    this.connectedEventId = eventId;
  }

  async stopConnection(): Promise<void> {
    if (!this.connection) {
      return;
    }

    const currentConnection = this.connection;
    const currentEventId = this.connectedEventId;

    this.connection = null;
    this.connectedEventId = null;

    try {
      if (currentEventId) {
        await currentConnection.invoke('LeaveEventChat', currentEventId);
      }
    } catch {
      // baglanti kopmussa leave invoke hatasi yutulur
    } finally {
      await currentConnection.stop();
    }
  }

  async sendMessage(eventId: string, content: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Chat baglantisi yok.');
    }

    await this.connection.invoke('SendMessage', eventId, content);
  }
}

export const chatSignalRService = new ChatSignalRService();

export async function getEventMessages(
  eventId: string,
  pageNumber = 1,
  pageSize = 50
): Promise<PagedResult<MessageDto>> {
  const response = await apiClient.get<ApiEnvelope<PagedResult<RawMessageDto>>>(
    `/api/chats/${eventId}/messages`,
    {
      params: { pageNumber, pageSize },
    }
  );

  const payload = unwrapEnvelope(response.data);

  return {
    ...payload,
    items: payload.items.map(mapMessage),
  };
}
