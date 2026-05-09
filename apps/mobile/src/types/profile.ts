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

export interface ProfileDto {
  accountId: string;
  username: string;
  type: string;
  status: string;
  profilePhoto?: string | null;
  socialLinks?: string | null;
  userProfile?: UserProfileDto | null;
  clubProfile?: ClubProfileDto | null;
}

export interface ProfileStatsDto {
  accountId: string;
  totalEvents: number;
  totalReviews: number;
  reputationScore?: number | null;
  rating?: number | null;
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
