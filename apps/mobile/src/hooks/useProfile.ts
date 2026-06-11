import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMyProfile,
  getProfileById,
  getProfileEvents,
  getProfileStats,
  searchProfiles,
  setMyInterests,
  updateMyProfile,
  uploadProfilePhoto,
} from '@/src/api/profileService';
import type { PagedResult } from '@/src/types/event';
import type {
  ProfileDto,
  ProfileEventDto,
  ProfileSearchParams,
  ProfileStatsDto,
  UpdateProfilePayload,
} from '@/src/types/profile';

export function useMyProfile() {
  return useQuery<ProfileDto>({
    queryKey: ['profile-me'],
    queryFn: getMyProfile,
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useProfile(accountId?: string) {
  return useQuery<ProfileDto>({
    queryKey: ['profile', accountId],
    queryFn: () => getProfileById(accountId ?? ''),
    enabled: Boolean(accountId),
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useProfileStats(accountId?: string) {
  return useQuery<ProfileStatsDto>({
    queryKey: ['profile-stats', accountId],
    queryFn: () => getProfileStats(accountId ?? ''),
    enabled: Boolean(accountId),
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useProfileEvents(accountId?: string, pageSize = 20) {
  return useQuery<PagedResult<ProfileEventDto>>({
    queryKey: ['profile-events', accountId, pageSize],
    queryFn: () => getProfileEvents(accountId ?? '', 1, pageSize),
    enabled: Boolean(accountId),
    staleTime: 120000,
    gcTime: 900000,
  });
}

export function useProfileSearch(params: ProfileSearchParams, enabled = true) {
  return useQuery<PagedResult<ProfileDto>>({
    queryKey: ['profile-search', params.query ?? '', params.type ?? '', params.city ?? '', params.pageNumber ?? 1, params.pageSize ?? 20],
    queryFn: () => searchProfiles(params),
    enabled,
    staleTime: 30000,
    gcTime: 300000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateMyProfile(payload),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile-me'], updatedProfile);
    },
  });
}

export function useSetMyInterests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagIds: string[]) => setMyInterests(tagIds),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile-me'], updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['recommended-events'] });
    },
  });
}

export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uri, mimeType }: { uri: string; mimeType: string }) => uploadProfilePhoto(uri, mimeType),
    onSuccess: async (profilePhotoUrl) => {
      queryClient.setQueryData<ProfileDto | undefined>(['profile-me'], (current) => {
        if (!current) return current;
        return {
          ...current,
          profilePhoto: profilePhotoUrl,
        };
      });

      await queryClient.invalidateQueries({
        queryKey: ['profile-me'],
        exact: true,
      });
    },
  });
}
