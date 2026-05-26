import { apiClient } from '@/src/api/apiClient';
import type { ApiEnvelope } from '@/src/types/api';
import type { TagDto } from '@/src/types/lookup';

const MOCK_TAGS: TagDto[] = [
  { id: 'sports-mock-tag', name: 'Spor' },
  { id: 'technology-mock-tag', name: 'Teknoloji' },
  { id: 'music-mock-tag', name: 'Muzik' },
  { id: 'art-mock-tag', name: 'Sanat' },
];

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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

  if (!isUuid(id)) {
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
  try {
    const tags = await tryGetTagsFromEndpoint('/api/tags');
    if (tags.length > 0) {
      return tags;
    }
  } catch {
    // API gecici olarak ulasilamazsa mock listeyle devam et.
  }

  return MOCK_TAGS;
}
