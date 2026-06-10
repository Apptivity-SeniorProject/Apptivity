import { QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/src/api/queryClient';
import { ErrorModalHost } from '@/src/components/ui/error-modal-host';
import { ToastHost } from '@/src/components/ui/toast-host';
import { prefetchInitialHomeQueries } from '@/src/hooks/useEvents';
import { getStartupHomeCoordinates } from '@/src/services/recommendationHotZoneService';
import { syncRecommendationLocationTracking } from '@/src/services/locationTrackingService';
import { useAuthStore } from '@/src/store/useAuthStore';
import { parseAuthToken } from '@/src/utils/auth';

import '../../../global.css';

export function RootNavigator() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const previousAccessTokenRef = useRef<string | null | undefined>(undefined);
  const prefetchedAccessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const previousAccessToken = previousAccessTokenRef.current;

    if (previousAccessToken !== undefined && previousAccessToken !== accessToken) {
      queryClient.clear();
    }

    previousAccessTokenRef.current = accessToken;
  }, [accessToken, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    void syncRecommendationLocationTracking(Boolean(accessToken));
  }, [accessToken, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !accessToken) {
      prefetchedAccessTokenRef.current = null;
      return;
    }

    if (prefetchedAccessTokenRef.current === accessToken) {
      return;
    }

    prefetchedAccessTokenRef.current = accessToken;
    const authToken = parseAuthToken(accessToken);

    void (async () => {
      const coords = await getStartupHomeCoordinates();

      await prefetchInitialHomeQueries(queryClient, {
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        includeNearby: authToken?.role === 'Individual',
      });
    })();
  }, [accessToken, hasHydrated]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="recommendation/loading" options={{ headerShown: false }} />
            <Stack.Screen name="recommendation/done" options={{ headerShown: false }} />

            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <ErrorModalHost />
          <ToastHost />
          <StatusBar style="dark" />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
