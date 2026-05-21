import { apiClient } from '@/src/api/apiClient';
import type { ApiEnvelope } from '@/src/types/api';
import type {
  ApplyToEventResponseDto,
  EventDetail,
  EventDetailsDto,
  EventListItem,
  EventListRequest,
  EventLocation,
  EventSummaryDto,
  MyParticipationDto,
  PagedResult,
  ParticipationStatus,
  ParticipationStatusDto,
} from '@/src/types/event';

const DEFAULT_PAGE_SIZE = 10;

function isUuid(value?: string): boolean {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseLocationData(locationData?: string | null): EventLocation {
  if (!locationData) {
    return {};
  }

  const toNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  };

  try {
    const parsed = JSON.parse(locationData) as Record<string, unknown>;
    return {
      city: typeof parsed.city === 'string' ? parsed.city : undefined,
      fullAddress:
        typeof parsed.fullAddress === 'string'
          ? parsed.fullAddress
          : typeof parsed.address === 'string'
            ? parsed.address
            : undefined,
      locationLabel: typeof parsed.locationLabel === 'string' ? parsed.locationLabel : undefined,
      lat: toNumber(parsed.lat),
      lng: toNumber(parsed.lng),
    };
  } catch {
    return {
      fullAddress: locationData,
    };
  }
}

function extractBannerImageUrl(description: string): string | undefined {
  const match = description.match(/https?:\/\/\S+\.(png|jpg|jpeg|webp|gif)/i);
  return match?.[0];
}

function normalizeParticipationStatus(value?: string | null): ParticipationStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'pending') return 'Pending';
  if (normalized === 'approved') return 'Approved';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'withdrawn') return 'Withdrawn';
  return null;
}

function toEventDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

function mapEventSummary(dto: EventSummaryDto): EventListItem {
  const participantCount = Math.max(0, dto.capacity - dto.remainingParticipationCount);

  return {
    id: dto.id,
    title: dto.name,
    description: dto.description,
    date: dto.date,
    time: dto.time,
    location: parseLocationData(dto.locationData),
    price: Number(dto.price ?? 0),
    isPaid: Number(dto.price ?? 0) > 0,
    organizerName: 'Organizator',
    bannerImageUrl: extractBannerImageUrl(dto.description),
    status: dto.status,
    remainingParticipationCount: dto.remainingParticipationCount,
    capacity: dto.capacity,
    primaryTagId: dto.primaryTagId,
    tags: dto.tags ?? [],
    participantCount,
  };
}

function mapMyParticipation(dto: MyParticipationDto): EventListItem {
  return {
    id: dto.eventId,
    title: dto.eventName,
    description: dto.rejectionReason ?? '',
    date: dto.date,
    time: dto.time,
    location: {},
    price: 0,
    isPaid: false,
    organizerName: 'Organizator',
    organizerProfilePhoto: undefined,
    status: dto.eventStatus,
    remainingParticipationCount: 0,
    capacity: 0,
    tags: [],
    participantCount: 0,
    currentUserParticipationStatus: normalizeParticipationStatus(dto.participationStatus),
  };
}

function mapEventDetail(dto: EventDetailsDto): EventDetail {
  const location = parseLocationData(dto.locationData);
  const price = Number(dto.price ?? 0);
  const participantCount = Math.max(0, dto.capacity - dto.remainingParticipationCount);
  const eventDateTime = toEventDateTime(dto.date, dto.time);
  const participationStatus = normalizeParticipationStatus(dto.currentUserParticipationStatus);

  return {
    id: dto.id,
    title: dto.name,
    description: dto.description,
    date: dto.date,
    time: dto.time,
    location,
    price,
    isPaid: price > 0,
    organizerName: dto.ownerName ?? 'Organizator',
    organizerType: dto.ownerType,
    organizerProfilePhoto: dto.ownerProfilePhoto ?? undefined,
    bannerImageUrl: extractBannerImageUrl(dto.description),
    status: dto.status,
    capacity: dto.capacity,
    remainingParticipationCount: dto.remainingParticipationCount,
    participantCount,
    durationMinutes: dto.durationMinutes,
    primaryTagName: dto.primaryTagName ?? undefined,
    currentUserParticipationStatus: participationStatus,
    isPast: eventDateTime.getTime() < Date.now(),
    isFull: dto.remainingParticipationCount <= 0,
  };
}

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'Istek basarisiz.');
}

function buildEventQueryParams(
  request: EventListRequest
): Record<string, string | number | boolean | string[]> {
  const pageSize = request.pageSize > 0 ? request.pageSize : DEFAULT_PAGE_SIZE;
  const queryParams: Record<string, string | number | boolean | string[]> = {
    pageNumber: request.pageNumber,
    pageSize,
  };

  if (request.searchTerm) {
    queryParams.searchTerm = request.searchTerm;
  }
  if (request.city) {
    queryParams.locationCity = request.city;
  }
  if (request.tagId && isUuid(request.tagId)) {
    queryParams.primaryTagId = request.tagId;
  }
  if (request.tagIds?.length) {
    const validTagIds = request.tagIds.filter(isUuid);
    if (validTagIds.length > 0) {
      queryParams.tagIds = validTagIds;
    }
  }
  if (typeof request.isPaid === 'boolean') {
    queryParams.isPaid = request.isPaid;
  }
  if (typeof request.matchAllTags === 'boolean') {
    queryParams.matchAllTags = request.matchAllTags;
  }
  if (request.startDate) {
    queryParams.startDate = request.startDate;
  }
  if (request.endDate) {
    queryParams.endDate = request.endDate;
  }

  return queryParams;
}

export async function getEvents(request: EventListRequest): Promise<PagedResult<EventListItem>> {
  const params = buildEventQueryParams(request);
  const response = await apiClient.get<ApiEnvelope<PagedResult<EventSummaryDto>>>('/api/events', {
    params,
    paramsSerializer: {
      serialize: (rawParams) => {
        const urlParams = new URLSearchParams();

        Object.entries(rawParams).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((item) => {
              urlParams.append(key, String(item));
            });
            return;
          }

          urlParams.append(key, String(value));
        });

        return urlParams.toString();
      },
    },
  });

  const payload = unwrapEnvelope(response.data);
  return {
    ...payload,
    items: payload.items.map(mapEventSummary),
  };
}

export async function getRecommendedEvents(
  pageNumber = 1,
  pageSize = 10
): Promise<PagedResult<EventListItem>> {
  const response = await apiClient.get<ApiEnvelope<PagedResult<EventSummaryDto>>>(
    '/api/events/recommended',
    {
      params: { pageNumber, pageSize },
    }
  );

  const payload = unwrapEnvelope(response.data);
  return {
    ...payload,
    items: payload.items.map(mapEventSummary),
  };
}

export async function getEventDetail(eventId: string): Promise<EventDetail> {
  const response = await apiClient.get<ApiEnvelope<EventDetailsDto>>(`/api/events/${eventId}`);
  const payload = unwrapEnvelope(response.data);
  return mapEventDetail(payload);
}

export async function applyToEvent(eventId: string): Promise<ParticipationStatus> {
  const response = await apiClient.post<ApiEnvelope<ApplyToEventResponseDto>>(`/api/events/${eventId}/apply`);
  const payload = unwrapEnvelope(response.data);
  return normalizeParticipationStatus(payload.status) ?? 'Pending';
}

export async function withdrawFromEvent(eventId: string): Promise<ParticipationStatus> {
  const response = await apiClient.post<ApiEnvelope<ParticipationStatusDto>>(`/api/events/${eventId}/withdraw`);
  const payload = unwrapEnvelope(response.data);
  return normalizeParticipationStatus(payload.status) ?? 'Withdrawn';
}

export async function getMyEvents(pageNumber = 1, pageSize = 10): Promise<PagedResult<EventListItem>> {
  const response = await apiClient.get<ApiEnvelope<PagedResult<EventSummaryDto>>>('/api/events/my-events', {
    params: { pageNumber, pageSize },
  });
  const payload = unwrapEnvelope(response.data);
  return {
    ...payload,
    items: payload.items.map(mapEventSummary),
  };
}

export async function getMyParticipations(
  pageNumber = 1,
  pageSize = 10
): Promise<PagedResult<EventListItem>> {
  const response = await apiClient.get<ApiEnvelope<PagedResult<MyParticipationDto>>>(
    '/api/events/my-participations',
    {
      params: { pageNumber, pageSize },
    }
  );
  const payload = unwrapEnvelope(response.data);
  return {
    ...payload,
    items: payload.items.map(mapMyParticipation),
  };
}
