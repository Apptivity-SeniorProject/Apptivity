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
  primaryTagId?: string | null;
  tags?: EventTag[];
  name: string;
  description: string;
  date: string;
  time: string;
  durationMinutes: number;
  capacity: number;
  remainingParticipationCount: number;
  status: string;
  price: number;
  locationData?: string | null;
}

export interface ApplyToEventResponseDto {
  eventId: string;
  userId: string;
  status: ParticipationStatus;
  eventStatus: string;
}

export interface ParticipationStatusDto {
  eventId: string;
  userId: string;
  status: ParticipationStatus;
  rejectionReason?: string | null;
  eventStatus: string;
}

export interface MyParticipationDto {
  eventId: string;
  eventName: string;
  date: string;
  time: string;
  eventStatus: string;
  participationStatus: ParticipationStatus;
  rejectionReason?: string | null;
}

export type ParticipationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn';

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
  date: string;
  time: string;
  durationMinutes: number;
  capacity: number;
  remainingParticipationCount: number;
  status: string;
  price: number;
  locationData?: string | null;
  isBookmarkedByCurrentUser?: boolean;
  currentUserParticipationStatus?: string | null;
}

export interface EventLocation {
  city?: string;
  fullAddress?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
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
}

export interface EventDetail {
  id: string;
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
}
