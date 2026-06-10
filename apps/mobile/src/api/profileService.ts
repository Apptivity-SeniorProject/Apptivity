import { apiClient } from '@/src/api/apiClient';
import { getFullImageUrl } from '@/src/api/eventService';
import type { ApiEnvelope } from '@/src/types/api';
import type { PagedResult } from '@/src/types/event';
import type {
  ProfileDto,
  ProfileEventDto,
  ProfileSearchParams,
  ProfileStatsDto,
  UpdateProfilePayload,
} from '@/src/types/profile';

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'İstek başarısız.');
}

export async function getMyProfile(): Promise<ProfileDto> {
  const response = await apiClient.get<ApiEnvelope<ProfileDto>>('/api/profiles/me');
  const payload = unwrapEnvelope(response.data);
  return {
    ...payload,
    profilePhoto: getFullImageUrl(payload.profilePhoto) ?? payload.profilePhoto,
  };
}

export async function getProfileById(accountId: string): Promise<ProfileDto> {
  const response = await apiClient.get<ApiEnvelope<ProfileDto>>(`/api/profiles/${accountId}`);
  const payload = unwrapEnvelope(response.data);
  return {
    ...payload,
    profilePhoto: getFullImageUrl(payload.profilePhoto) ?? payload.profilePhoto,
  };
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<ProfileDto> {
  const response = await apiClient.put<ApiEnvelope<ProfileDto>>('/api/profiles/me', payload);
  const data = unwrapEnvelope(response.data);
  return {
    ...data,
    profilePhoto: getFullImageUrl(data.profilePhoto) ?? data.profilePhoto,
  };
}

export async function getProfileStats(accountId: string): Promise<ProfileStatsDto> {
  const response = await apiClient.get<ApiEnvelope<ProfileStatsDto>>(`/api/profiles/${accountId}/stats`);
  return unwrapEnvelope(response.data);
}

export async function getProfileEvents(
  accountId: string,
  pageNumber = 1,
  pageSize = 20
): Promise<PagedResult<ProfileEventDto>> {
  const response = await apiClient.get<ApiEnvelope<PagedResult<ProfileEventDto>>>(
    `/api/profiles/${accountId}/events`,
    {
      params: {
        pageNumber,
        pageSize,
      },
    }
  );
  return unwrapEnvelope(response.data);
}

export async function searchProfiles(params: ProfileSearchParams): Promise<PagedResult<ProfileDto>> {
  const response = await apiClient.get<ApiEnvelope<PagedResult<ProfileDto>>>('/api/profiles', {
    params: {
      query: params.query,
      accountType: params.type,
      city: params.city,
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  });
  const data = unwrapEnvelope(response.data);
  return {
    ...data,
    items: data.items.map((profile) => ({
      ...profile,
      profilePhoto: getFullImageUrl(profile.profilePhoto) ?? profile.profilePhoto,
    })),
  };
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
