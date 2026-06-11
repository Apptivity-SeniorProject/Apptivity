export interface UserProfileDto {
  name?: string;
  surname?: string;
  bio?: string | null;
}

export interface ClubProfileDto {
  name?: string;
  description?: string | null;
  city?: string | null;
}

export interface ProfileInterestTag {
  id: string;
  name: string;
  iconName?: string | null;
  colorCode?: string | null;
}

export interface ProfileDto {
  accountId: string;
  username: string;
  type: string;
  status: string;
  profilePhoto?: string | null;
  socialLinks?: string | null;
  interests: ProfileInterestTag[];
  userProfile?: UserProfileDto | null;
  clubProfile?: ClubProfileDto | null;
}

export interface ProfileStatsDto {
  accountId: string;
  totalEvents: number;
  totalReviews: number;
  reputationScore?: number | null;
  reputationLevel?: string | null;
  rating?: number | null;
}

export interface ProfileEventDto {
  eventId: string;
  name: string;
  date: string;
  time: string;
  status: string;
  isPast: boolean;
  bannerImage?: string | null;
  locationData?: string | null;
  price?: number;
  ownerName?: string;
  ownerProfilePhoto?: string | null;
  primaryTagId?: string | null;
  tags?: ProfileInterestTag[];
}

export interface ProfileSearchParams {
  query?: string;
  type?: string;
  city?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface UpdateProfilePayload {
  username?: string;
  socialLinks?: string;
  bio?: string;
  name?: string;
  surname?: string;
  clubName?: string;
  clubDescription?: string;
  city?: string;
}
