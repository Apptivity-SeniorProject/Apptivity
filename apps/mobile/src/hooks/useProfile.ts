import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMyProfile, getProfileStats, setMyInterests, updateMyProfile, uploadProfilePhoto } from '@/src/api/profileService';
import type { ProfileDto, ProfileStatsDto, UpdateProfilePayload } from '@/src/types/profile';

export function useMyProfile() {
  return useQuery<ProfileDto>({
    queryKey: ['profile-me'],
    queryFn: getMyProfile,
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
    onSuccess: (profilePhotoUrl) => {
      queryClient.setQueryData<ProfileDto | undefined>(['profile-me'], (current) => {
        if (!current) return current;
        return {
          ...current,
          profilePhoto: profilePhotoUrl,
        };
      });
    },
  });
}
