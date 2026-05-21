import { apiClient } from '@/src/api/apiClient';
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
  return unwrapEnvelope(response.data);
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
