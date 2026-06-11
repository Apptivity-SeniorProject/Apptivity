import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'mobile-device-id';

function generateFallbackDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  // First check if we already saved an ID (maybe a fallback one)
  const currentValue = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (currentValue) {
    return currentValue;
  }

  let deviceId: string | null = null;

  try {
    if (Platform.OS === 'android') {
      deviceId = Application.getAndroidId();
    } else if (Platform.OS === 'ios') {
      deviceId = await Application.getIosIdForVendorAsync();
    }
  } catch (error) {
    console.warn('Could not fetch hardware device ID, using fallback.', error);
  }

  // Fallback to generating one if we couldn't get a hardware ID or on Web
  if (!deviceId) {
    deviceId = generateFallbackDeviceId();
  }

  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
