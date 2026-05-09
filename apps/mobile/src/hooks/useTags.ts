import { useQuery } from '@tanstack/react-query';

import { getTags } from '@/src/api/lookupService';
import type { TagDto } from '@/src/types/lookup';

export function useTags() {
  return useQuery<TagDto[]>({
    queryKey: ['lookup-tags'],
    queryFn: getTags,
    staleTime: 1800000,
    gcTime: 3600000,
  });
}
