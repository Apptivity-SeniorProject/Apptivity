import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { clearLocationHistory, insertLocationSample } from '@/src/services/locationHistoryStore';

const LOCATION_TASK_NAME = 'apptivity.recommendation.location.history';
const HOURLY_INTERVAL_MS = 60 * 60 * 1000;

let foregroundSubscription: Location.LocationSubscription | null = null;

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      return;
    }

    const taskData = data as { locations?: { coords?: { latitude?: number; longitude?: number }; timestamp?: number }[] } | undefined;
    const locations = taskData?.locations ?? [];

    for (const item of locations) {
      const lat = item.coords?.latitude;
      const lng = item.coords?.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        continue;
      }

      await insertLocationSample(lat, lng, item.timestamp ?? Date.now());
    }
  });
}

async function startForegroundWatcher(): Promise<void> {
  if (foregroundSubscription) {
    return;
  }

  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: HOURLY_INTERVAL_MS,
      distanceInterval: 100,
    },
    (location) => {
      void insertLocationSample(location.coords.latitude, location.coords.longitude, location.timestamp);
    }
  );
}

function stopForegroundWatcher(): void {
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }
}

async function startBackgroundUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) {
    return;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: HOURLY_INTERVAL_MS,
    distanceInterval: 100,
    pausesUpdatesAutomatically: true,
    deferredUpdatesInterval: HOURLY_INTERVAL_MS,
  });
}

async function stopBackgroundUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

async function stopAllLocationTracking(): Promise<void> {
  stopForegroundWatcher();
  await stopBackgroundUpdates();
}

async function ensureForegroundPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

async function ensureBackgroundPermission(): Promise<boolean> {
  const current = await Location.getBackgroundPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await Location.requestBackgroundPermissionsAsync();
  return requested.granted;
}

export async function syncRecommendationLocationTracking(hasSession: boolean): Promise<void> {
  if (!hasSession) {
    await stopAllLocationTracking();
    await clearLocationHistory();
    return;
  }

  const hasForegroundPermission = await ensureForegroundPermission();
  if (!hasForegroundPermission) {
    await stopAllLocationTracking();
    await clearLocationHistory();
    return;
  }

  await startForegroundWatcher();

  const hasBackgroundPermission = await ensureBackgroundPermission();
  if (hasBackgroundPermission) {
    await startBackgroundUpdates();
  } else {
    await stopBackgroundUpdates();
  }
}

export async function enforceLocationPrivacyOnDeniedPermission(): Promise<void> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) {
    await stopAllLocationTracking();
    await clearLocationHistory();
    return;
  }

  await startForegroundWatcher();
}
