import type { OrderedHotZone } from '@/src/types/event';
import { getTopLocationGrids } from '@/src/services/locationHistoryStore';
import { enforceLocationPrivacyOnDeniedPermission } from '@/src/services/locationTrackingService';

export async function getOrderedHotZonesForRecommendations(): Promise<OrderedHotZone[] | null> {
  await enforceLocationPrivacyOnDeniedPermission();

  const grids = await getTopLocationGrids(3);
  if (grids.length === 0) {
    return null;
  }

  // Inverse priority mapping: densest -> home(3), then work(2), then social(1).
  const withInversePriority = grids.map((grid, index) => {
    const derivedPriority = Math.max(1, 3 - index) as 1 | 2 | 3;
    return {
      priority: derivedPriority,
      lat: Number(grid.grid_lat.toFixed(4)),
      lng: Number(grid.grid_lng.toFixed(4)),
      sampleCount: grid.sample_count,
      lastSeenMs: grid.last_seen_ms,
    };
  });

  return withInversePriority
    .sort((a, b) => a.priority - b.priority)
    .map(({ priority, lat, lng }) => ({ priority, lat, lng }));
}
