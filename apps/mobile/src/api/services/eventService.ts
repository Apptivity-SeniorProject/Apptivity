import { apiClient } from '@/src/api/apiClient';
import type { EventDto } from '@/src/types/event';

export async function getEvents(): Promise<EventDto[]> {
  const response = await apiClient.get<EventDto[]>('/events');
  return response.data;
}
