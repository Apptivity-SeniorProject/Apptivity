import { apiClient } from '@/src/api/apiClient';
import type { ApiEnvelope } from '@/src/types/api';
import type { MessageDto } from '@/src/types/chat';
import type { PagedResult } from '@/src/types/event';

export interface RawMessageDto {
  messageId?: string;
  eventId?: string;
  senderAccountId?: string;
  senderProfilePhoto?: string;
  content?: string;
  sentAtUtc?: string;
  senderName?: string;
  MessageId?: string;
  EventId?: string;
  SenderAccountId?: string;
  SenderProfilePhoto?: string;
  Content?: string;
  SentAtUtc?: string;
  SenderName?: string;
}

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'Istek basarisiz.');
}

export function mapRawMessage(raw: RawMessageDto): MessageDto {
  return {
    messageId: raw.messageId ?? raw.MessageId ?? '',
    eventId: raw.eventId ?? raw.EventId ?? '',
    senderAccountId: raw.senderAccountId ?? raw.SenderAccountId ?? '',
    senderName: raw.senderName ?? raw.SenderName ?? undefined,
    senderProfilePhoto: raw.senderProfilePhoto ?? raw.SenderProfilePhoto ?? undefined,
    content: raw.content ?? raw.Content ?? '',
    sentAtUtc: raw.sentAtUtc ?? raw.SentAtUtc ?? new Date().toISOString(),
  };
}

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
    items: payload.items.map(mapRawMessage),
  };
}
