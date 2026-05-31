export interface EventFilters {
  searchTerm?: string;
  city?: string;
  tagId?: string;
  tagIds?: string[];
  isPaid?: boolean;
  matchAllTags?: boolean;
  startDate?: string;
  endDate?: string;
  pageSize?: number;
}

export interface CreateEventPayload {
  name: string;
  description: string;
  date: string;
  time: string;
  durationMinutes: number;
  capacity: number;
  price: number;
  locationData: string;
  primaryTagId?: string;
  tagIds?: string[];
}

export interface EventListRequest {
  searchTerm?: string;
  city?: string;
  tagId?: string;
  tagIds?: string[];
  isPaid?: boolean;
  matchAllTags?: boolean;
  startDate?: string;
  endDate?: string;
  pageNumber: number;
  pageSize: number;
}

export interface EventTag {
  id: string;
  name: string;
  iconName?: string | null;
  colorCode?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface EventSummaryDto {
  id: string;
  ownerId?: string;
  ownerName?: string;
  ownerType?: string | number;
  ownerProfilePhoto?: string | null;
  primaryTagId?: string | null;
  tags?: EventTag[];
  name: string;
  description: string;
  bannerImage?: string | null;
  date: string;
  time: string;
  durationMinutes: number;
  capacity: number;
  remainingParticipationCount: number;
  status: string;
  rejectedViolationReason?: string | null;
  rejectedAdditionalExplanation?: string | null;
  price: number;
  locationData?: string | null;
}

export interface RecommendedEventSummaryDto extends EventSummaryDto {
  recommendationScore?: number | null;
  recommendationReason?: string | null;
}

export interface OrderedHotZone {
  priority: 1 | 2 | 3;
  lat: number;
  lng: number;
}

export type DailyRecommendationStatus = 'served' | 'depleted' | 'unavailable';

export interface DailyRecommendedNextRequest {
  latitude?: number;
  longitude?: number;
  ordered_hot_zones?: string[] | null;
}

export interface DailyRecommendedNextResponseDto {
  event: EventSummaryDto | null;
  status: DailyRecommendationStatus;
  currentTagOrder: number | null;
  remainingTagCount: number;
  message?: string | null;
  debugLlmTagIds?: string[] | null;
}

export interface ApplyToEventResponseDto {
  eventId: string;
  userId: string;
  status: ParticipationStatus | number | string;
  eventStatus: string;
}

export interface ParticipationStatusDto {
  eventId: string;
  userId: string;
  status: ParticipationStatus | number | string;
  rejectionReason?: string | null;
  eventStatus: string;
}

export interface MyParticipationDto {
  eventId: string;
  eventName: string;
  date: string;
  time: string;
  eventStatus: string;
  participationStatus: ParticipationStatus | number | string;
  rejectionReason?: string | null;
  bannerImage?: string | null;
  locationData?: string | null;
  price?: number;
  ownerName?: string;
  ownerType?: string | number;
  ownerProfilePhoto?: string | null;
}

export type ParticipationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn';
export type EventStatus = 'Draft' | 'PendingApproval' | 'Published' | 'Ongoing' | 'Completed' | 'Cancelled' | 'Rejected';

export interface EventParticipantProfileDto {
  accountId: string;
  type: string;
  username: string;
  profilePhoto?: string | null;
  displayName: string;
  status?: ParticipationStatus | number | string | null;
}

export interface EventParticipantsResponseDto {
  eventId: string;
  eventStatus: EventStatus;
  organizer: EventParticipantProfileDto;
  participants: EventParticipantProfileDto[];
}

export interface EventDetailsDto {
  id: string;
  ownerId?: string;
  ownerName?: string;
  ownerType?: string;
  ownerProfilePhoto?: string | null;
  primaryTagId?: string | null;
  primaryTagName?: string | null;
  name: string;
  description: string;
  bannerImage?: string | null;
  date: string;
  time: string;
  durationMinutes: number;
  capacity: number;
  remainingParticipationCount: number;
  status: string;
  price: number;
  locationData?: string | null;
  isBookmarkedByCurrentUser?: boolean;
  currentUserParticipationStatus?: string | number | null;
}

export interface EventLocation {
  city?: string;
  fullAddress?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  imageUrls?: string[];
}

export interface EventListItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: EventLocation;
  price: number;
  isPaid: boolean;
  organizerName: string;
  bannerImageUrl?: string;
  status: string;
  remainingParticipationCount: number;
  capacity: number;
  primaryTagId?: string | null;
  tags: EventTag[];
  participantCount: number;
  organizerProfilePhoto?: string;
  currentUserParticipationStatus?: ParticipationStatus | null;
  imageUrls?: string[];
}

export interface EventDetail {
  id: string;
  ownerId?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: EventLocation;
  price: number;
  isPaid: boolean;
  organizerName: string;
  organizerType?: string;
  organizerProfilePhoto?: string;
  bannerImageUrl?: string;
  status: string;
  capacity: number;
  remainingParticipationCount: number;
  participantCount: number;
  durationMinutes: number;
  primaryTagName?: string;
  currentUserParticipationStatus?: ParticipationStatus | null;
  isPast: boolean;
  isFull: boolean;
  imageUrls?: string[];
}
