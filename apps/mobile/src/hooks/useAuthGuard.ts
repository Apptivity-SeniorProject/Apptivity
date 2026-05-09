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

  const isOnLoginScreen = segments[0] === 'login';

  if (!hasHydrated) {
    return { isReady: false, redirectTo: null };
  }

  if (!accessToken && !isOnLoginScreen) {
    return { isReady: true, redirectTo: '/login' };
  }

  if (accessToken && isOnLoginScreen) {
    return { isReady: true, redirectTo: '/(tabs)' };
  }

  return { isReady: true, redirectTo: null };
}
