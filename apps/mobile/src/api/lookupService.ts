import { apiClient } from '@/src/api/apiClient';
import type { ApiEnvelope } from '@/src/types/api';
import type { TagDto } from '@/src/types/lookup';

const MOCK_TAGS: TagDto[] = [
  { id: 'sports-mock-tag', name: 'Spor' },
  { id: 'technology-mock-tag', name: 'Teknoloji' },
  { id: 'music-mock-tag', name: 'Muzik' },
  { id: 'art-mock-tag', name: 'Sanat' },
];

interface RawTagDto {
  id?: string;
  name?: string;
  label?: string;
}

function mapRawTag(raw: RawTagDto): TagDto | null {
  const id = raw.id?.trim();
  const name = (raw.name ?? raw.label)?.trim();

  if (!id || !name) {
    return null;
  }

  return { id, name };
}

async function tryGetTagsFromEndpoint(url: string): Promise<TagDto[]> {
  const response = await apiClient.get<ApiEnvelope<RawTagDto[]> | RawTagDto[]>(url);
  const payload = Array.isArray(response.data)
    ? response.data
    : response.data.isSuccess
      ? (response.data.data ?? [])
      : [];

  return payload.map(mapRawTag).filter((item): item is TagDto => item !== null);
}

export async function getTags(): Promise<TagDto[]> {
  const endpoints = ['/api/lookups/tags', '/api/tags'];

  for (const endpoint of endpoints) {
    try {
      const tags = await tryGetTagsFromEndpoint(endpoint);
      if (tags.length > 0) {
        return tags;
      }
    } catch {
      // endpoint mevcut degilse bir sonrakini dene
    }
  }

  return MOCK_TAGS;
}
