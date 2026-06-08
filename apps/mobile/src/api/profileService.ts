import { apiClient } from '@/src/api/apiClient';
import { getFullImageUrl } from '@/src/api/eventService';
import type { ApiEnvelope } from '@/src/types/api';
import type { ProfileDto, ProfileStatsDto, UpdateProfilePayload } from '@/src/types/profile';

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'Istek basarisiz.');
}

export async function getMyProfile(): Promise<ProfileDto> {
  const response = await apiClient.get<ApiEnvelope<ProfileDto>>('/api/profiles/me');
  const payload = unwrapEnvelope(response.data);
  return {
    ...payload,
    profilePhoto: getFullImageUrl(payload.profilePhoto) ?? payload.profilePhoto,
  };
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<ProfileDto> {
  const response = await apiClient.put<ApiEnvelope<ProfileDto>>('/api/profiles/me', payload);
  return unwrapEnvelope(response.data);
}

export async function getProfileStats(accountId: string): Promise<ProfileStatsDto> {
  const response = await apiClient.get<ApiEnvelope<ProfileStatsDto>>(`/api/profiles/${accountId}/stats`);
  return unwrapEnvelope(response.data);
}

export async function setMyInterests(tagIds: string[]): Promise<ProfileDto> {
  const response = await apiClient.put<ApiEnvelope<ProfileDto>>('/api/profiles/me/interests', {
    tagIds,
  });
  return unwrapEnvelope(response.data);
}

export async function uploadProfilePhoto(uri: string, mimeType: string): Promise<string> {
  const formData = new FormData();
  const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';

  formData.append('file', {
    uri,
    name: `profile-photo-${Date.now()}.${extension}`,
    type: mimeType,
  } as never);

  const response = await apiClient.post<ApiEnvelope<{ profilePhotoUrl: string }>>(
    '/api/images/profile-photo',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  const payload = unwrapEnvelope(response.data);
  return getFullImageUrl(payload.profilePhotoUrl) as string;
}
