import {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
  useMutation,
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
  getProfileOrganizedEvents,
  getProfileParticipatedEvents,
  getRecommendedEvents,
  getRecommendedNearbyEvents,
  getDailyRecommendedNext,
  toggleEventBookmark,
} from '@/src/api/eventService';
import {
  getCurrentRecommendationCoordinates,
  getOrderedHotZoneKeysForRecommendations,
  getOrderedHotZonesForRecommendations,
} from '@/src/services/recommendationHotZoneService';
import type {
  EventDetail,
  EventFilters,
  EventListItem,
  EventParticipantsResponseDto,
  PagedResult,
} from '@/src/types/event';

interface UseEventsOptions {
  pageSize?: number;
  enabled?: boolean;
}

interface RealtimeQueryOptions {
  enabled?: boolean;
  refetchIntervalMs?: number;
}

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_HOME_RADIUS_KM = 50;

function getEventsQueryKey(filters: EventFilters, pageSize: number): QueryKey {
  const tagIdsKey = (filters.tagIds ?? []).slice().sort().join(',');

  return [
    'events',
    filters.searchTerm ?? '',
    filters.city ?? '',
    filters.tagId ?? '',
    tagIdsKey,
    filters.isPaid ?? 'all',
    filters.matchAllTags ?? false,
    filters.startDate ?? '',
    filters.endDate ?? '',
    filters.userLat ?? '',
    filters.userLng ?? '',
    filters.nearbyRadiusKm ?? '',
    filters.sort ?? '',
    pageSize,
  ];
}

function getNextEventsPageParam(lastPage: PagedResult<EventListItem>) {
  const loadedCount = lastPage.pageNumber * lastPage.pageSize;
  if (loadedCount >= lastPage.totalCount) {
    return undefined;
  }

  return lastPage.pageNumber + 1;
}

function getRecommendedNearbyEventsQueryKey(lat?: number, lng?: number, pageSize = 10): QueryKey {
  return ['recommended-nearby-events', lat, lng, pageSize];
}

export function useEvents(filters: EventFilters, options?: UseEventsOptions) {
  const pageSize = options?.pageSize ?? filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const enabled = options?.enabled ?? true;

  const queryResult = useInfiniteQuery<
    PagedResult<EventListItem>,
    Error,
    InfiniteData<PagedResult<EventListItem>>,
    QueryKey,
    number
  >({
    queryKey: getEventsQueryKey(filters, pageSize),
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
        userLat: filters.userLat,
        userLng: filters.userLng,
        nearbyRadiusKm: filters.nearbyRadiusKm,
        sort: filters.sort,
        pageNumber: pageParam,
        pageSize,
      }),
    initialPageParam: 1,
    getNextPageParam: getNextEventsPageParam,
    staleTime: 120000,
    gcTime: 900000,
    enabled,
  });

  const events = useMemo(() => {
    return queryResult.data?.pages.flatMap((page) => page.items) ?? [];
  }, [queryResult.data?.pages]);

  const refresh = queryResult.refetch;

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
    queryFn: async () => {
      const orderedHotZones = await getOrderedHotZonesForRecommendations();
      return getRecommendedEvents(1, pageSize, orderedHotZones);
    },
    staleTime: 120000,
    gcTime: 900000,
    enabled: options?.enabled ?? true,
  });
}

export function useRecommendedNearbyEvents(lat?: number, lng?: number, pageSize = 10, options?: UseRecommendedEventsOptions) {
  return useQuery<PagedResult<EventListItem>>({
    queryKey: getRecommendedNearbyEventsQueryKey(lat, lng, pageSize),
    queryFn: async () => {
      if (lat === undefined || lng === undefined) return { items: [], totalCount: 0, pageNumber: 1, pageSize };
      return getRecommendedNearbyEvents(lat, lng, 1, pageSize);
    },
    staleTime: 120000,
    gcTime: 900000,
    enabled: (options?.enabled ?? true) && lat !== undefined && lng !== undefined,
  });
}

export type DailyRecommendedNextOverrides = {
  latitude?: number;
  longitude?: number;
  orderedHotZones?: string[] | null;
};

export async function prefetchInitialHomeQueries(
  queryClient: QueryClient,
  options?: {
    latitude?: number;
    longitude?: number;
    includeNearby?: boolean;
  }
) {
  const userLat = options?.latitude;
  const userLng = options?.longitude;
  const homeFilters: EventFilters = {
    pageSize: DEFAULT_PAGE_SIZE,
    userLat,
    userLng,
    nearbyRadiusKm:
      typeof userLat === 'number' && typeof userLng === 'number' ? DEFAULT_HOME_RADIUS_KM : undefined,
    sort:
      typeof userLat === 'number' && typeof userLng === 'number' ? 'nearby' : undefined,
  };

  const tasks: Promise<unknown>[] = [
    queryClient.prefetchInfiniteQuery({
      queryKey: getEventsQueryKey(homeFilters, DEFAULT_PAGE_SIZE),
      queryFn: ({ pageParam }) =>
        getEvents({
          ...homeFilters,
          pageNumber: pageParam,
          pageSize: DEFAULT_PAGE_SIZE,
        }),
      initialPageParam: 1,
      getNextPageParam: getNextEventsPageParam,
      staleTime: 120000,
      gcTime: 900000,
    }),
  ];

  if (
    options?.includeNearby &&
    typeof userLat === 'number' &&
    typeof userLng === 'number'
  ) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: getRecommendedNearbyEventsQueryKey(userLat, userLng, 8),
        queryFn: () => getRecommendedNearbyEvents(userLat, userLng, 1, 8),
        staleTime: 120000,
        gcTime: 900000,
      })
    );
  }

  await Promise.all(tasks);
}

export async function fetchDailyRecommendedNext(overrides?: DailyRecommendedNextOverrides) {
  const hasOverrideCoordinates =
    typeof overrides?.latitude === 'number' && typeof overrides?.longitude === 'number';

  const [coordinates, orderedHotZoneKeys] = await Promise.all([
    hasOverrideCoordinates
      ? Promise.resolve({
          latitude: overrides!.latitude!,
          longitude: overrides!.longitude!,
        })
      : getCurrentRecommendationCoordinates(),
    overrides?.orderedHotZones !== undefined
      ? Promise.resolve(overrides.orderedHotZones)
      : getOrderedHotZoneKeysForRecommendations(),
  ]);

  return getDailyRecommendedNext({
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    orderedHotZones: orderedHotZoneKeys,
  });
}

export function useDailyRecommendedNext() {
  return useMutation({
    mutationFn: fetchDailyRecommendedNext,
  });
}

export function useEventDetail(eventId: string, options?: RealtimeQueryOptions) {
  return useQuery<EventDetail>({
    queryKey: ['event-detail', eventId],
    queryFn: () => getEventDetail(eventId),
    enabled: options?.enabled ?? Boolean(eventId),
    refetchInterval: options?.refetchIntervalMs,
    refetchIntervalInBackground: false,
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

export function useProfileOrganizedEvents(accountId?: string, pageSize = 10) {
  return useQuery<PagedResult<EventListItem>>({
    queryKey: ['profile-organized-events', accountId, pageSize],
    queryFn: () => getProfileOrganizedEvents(accountId!, 1, pageSize),
    enabled: Boolean(accountId),
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useProfileParticipatedEvents(accountId?: string, pageSize = 10) {
  return useQuery<PagedResult<EventListItem>>({
    queryKey: ['profile-participated-events', accountId, pageSize],
    queryFn: () => getProfileParticipatedEvents(accountId!, 1, pageSize),
    enabled: Boolean(accountId),
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useMyParticipations(pageSize = 10, options?: RealtimeQueryOptions) {
  return useQuery<PagedResult<EventListItem>>({
    queryKey: ['my-participations', pageSize],
    queryFn: () => getMyParticipations(1, pageSize),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchIntervalMs,
    refetchIntervalInBackground: false,
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

export function useToggleEventBookmark() {
  return useMutation({
    mutationFn: (eventId: string) => toggleEventBookmark(eventId),
  });
}
