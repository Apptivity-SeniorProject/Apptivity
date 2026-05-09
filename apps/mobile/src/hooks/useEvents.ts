import { useQuery } from '@tanstack/react-query';

import { getEvents } from '@/src/api/services/eventService';
import type { EventDto } from '@/src/types/event';

export function useEvents() {
  return useQuery<EventDto[]>({
    queryKey: ['events'],
    queryFn: getEvents,
  });
}
