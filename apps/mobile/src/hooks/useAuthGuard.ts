import { useSegments } from 'expo-router';

import { useAuthStore } from '@/src/store/useAuthStore';

interface AuthGuardState {
  isReady: boolean;
  redirectTo: '/login' | '/(tabs)' | null;
}

export function useAuthGuard(): AuthGuardState {
  const segments = useSegments();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const authScreens = ['login', 'otp'];
  const isOnAuthScreen = authScreens.includes(segments[0] ?? '');

  if (!hasHydrated) {
    return { isReady: false, redirectTo: null };
  }

  if (!accessToken && !isOnAuthScreen) {
    return { isReady: true, redirectTo: '/login' };
  }

  if (accessToken && isOnAuthScreen) {
    return { isReady: true, redirectTo: '/(tabs)' };
  }

  return { isReady: true, redirectTo: null };
}
