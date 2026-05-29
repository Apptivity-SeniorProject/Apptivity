import * as Location from 'expo-location';

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

export async function getOrderedHotZoneKeysForRecommendations(): Promise<string[] | null> {
  await enforceLocationPrivacyOnDeniedPermission();

  const grids = await getTopLocationGrids(3);
  if (grids.length === 0) {
    return null;
  }

  return grids.map((grid) => `${grid.grid_lat.toFixed(2)}:${grid.grid_lng.toFixed(2)}`);
}

export async function getCurrentRecommendationCoordinates(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  await enforceLocationPrivacyOnDeniedPermission();

  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: Number(current.coords.latitude.toFixed(4)),
      longitude: Number(current.coords.longitude.toFixed(4)),
    };
  } catch {
    return null;
  }
}
