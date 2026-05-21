import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'mobile-device-id';

function generateDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const currentValue = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (currentValue) {
    return currentValue;
  }

  const createdValue = generateDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, createdValue);
  return createdValue;
}
