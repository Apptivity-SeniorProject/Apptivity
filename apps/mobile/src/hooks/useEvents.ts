import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  getEventDetail,
  getEventParticipants,
  getEvents,
  getMyBookmarks,
  getMyEvents,
  getMyParticipations,
  getRecommendedEvents,
} from '@/src/api/eventService';
import type {
  EventDetail,
  EventFilters,
  EventListItem,
  EventParticipantsResponseDto,
  PagedResult,
} from '@/src/types/event';

interface UseEventsOptions {
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function useEvents(filters: EventFilters, options?: UseEventsOptions) {
  const pageSize = options?.pageSize ?? filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const tagIdsKey = (filters.tagIds ?? []).slice().sort().join(',');

  const queryResult = useInfiniteQuery<
    PagedResult<EventListItem>,
    Error,
    InfiniteData<PagedResult<EventListItem>>,
    QueryKey,
    number
  >({
    queryKey: [
      'events',
      filters.searchTerm ?? '',
      filters.city ?? '',
      filters.tagId ?? '',
      tagIdsKey,
      filters.isPaid ?? 'all',
      filters.matchAllTags ?? false,
      filters.startDate ?? '',
      filters.endDate ?? '',
      pageSize,
    ],
    queryFn: ({ pageParam }) =>
      getEvents({
        searchTerm: filters.searchTerm,
        city: filters.city,
        tagId: filters.tagId,
        tagIds: filters.tagIds,
        isPaid: filters.isPaid,
        matchAllTags: filters.matchAllTags,
        startDate: filters.startDate,
        endDate: filters.endDate,
        pageNumber: pageParam,
        pageSize,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loadedCount = lastPage.pageNumber * lastPage.pageSize;
      if (loadedCount >= lastPage.totalCount) {
        return undefined;
      }
      return lastPage.pageNumber + 1;
    },
    staleTime: 120000,
    gcTime: 900000,
  });

  const events = useMemo(() => {
    return queryResult.data?.pages.flatMap((page) => page.items) ?? [];
  }, [queryResult.data?.pages]);

  const refresh = async () => {
    await queryResult.refetch();
  };

  return {
    ...queryResult,
    events,
    refresh,
  };
}

interface UseRecommendedEventsOptions {
  enabled?: boolean;
}

export function useRecommendedEvents(pageSize = 10, options?: UseRecommendedEventsOptions) {
  return useQuery<PagedResult<EventListItem>>({
    queryKey: ['recommended-events', pageSize],
    queryFn: () => getRecommendedEvents(1, pageSize),
    enabled: options?.enabled ?? true,
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useEventDetail(eventId: string) {
  return useQuery<EventDetail>({
    queryKey: ['event-detail', eventId],
    queryFn: () => getEventDetail(eventId),
    enabled: Boolean(eventId),
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useEventParticipants(eventId: string) {
  return useQuery<EventParticipantsResponseDto>({
    queryKey: ['event-participants', eventId],
    queryFn: () => getEventParticipants(eventId),
    enabled: Boolean(eventId),
    staleTime: 30000,
    gcTime: 900000,
  });
}

export function useMyEvents(pageSize = 10) {
  return useQuery<PagedResult<EventListItem>>({
    queryKey: ['my-events', pageSize],
    queryFn: () => getMyEvents(1, pageSize),
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useMyParticipations(pageSize = 10) {
  return useQuery<PagedResult<EventListItem>>({
    queryKey: ['my-participations', pageSize],
    queryFn: () => getMyParticipations(1, pageSize),
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useMyBookmarks(pageSize = 10) {
  return useQuery<PagedResult<EventListItem>>({
    queryKey: ['my-bookmarks', pageSize],
    queryFn: () => getMyBookmarks(1, pageSize),
    staleTime: 120000,
    gcTime: 900000,
  });
}
