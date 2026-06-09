import * as Location from 'expo-location';

import type { OrderedHotZone } from '@/src/types/event';
import { getTopLocationGrids } from '@/src/services/locationHistoryStore';
import { enforceLocationPrivacyOnDeniedPermission } from '@/src/services/locationTrackingService';

let startupCoordinatesPromise: Promise<{
  latitude: number;
  longitude: number;
} | null> | null = null;

function normalizeCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

export async function getOrderedHotZonesForRecommendations(): Promise<OrderedHotZone[] | null> {
  void enforceLocationPrivacyOnDeniedPermission();

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
  void enforceLocationPrivacyOnDeniedPermission();

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
  return getStartupHomeCoordinates();
}

export async function getStartupHomeCoordinates(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  if (startupCoordinatesPromise) {
    return startupCoordinatesPromise;
  }

  startupCoordinatesPromise = (async () => {
  void enforceLocationPrivacyOnDeniedPermission();

    const currentPermission = await Location.getForegroundPermissionsAsync();
    const permission = currentPermission.granted
      ? currentPermission
      : await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      return null;
    }

    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 15 * 60 * 1000,
        requiredAccuracy: 500,
      });

      if (lastKnown) {
        return {
          latitude: normalizeCoordinate(lastKnown.coords.latitude),
          longitude: normalizeCoordinate(lastKnown.coords.longitude),
        };
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      return {
        latitude: normalizeCoordinate(current.coords.latitude),
        longitude: normalizeCoordinate(current.coords.longitude),
      };
    } catch {
      return null;
    } finally {
      startupCoordinatesPromise = null;
    }
  })();

  return startupCoordinatesPromise;
}
