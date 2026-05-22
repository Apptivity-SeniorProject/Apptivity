import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/src/api/queryClient';
import { useAuthGuard } from '@/src/hooks/useAuthGuard';
import { ToastHost } from '@/src/components/ui/toast-host';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useColorScheme } from '@/hooks/use-color-scheme';

import '../../../global.css';

export function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isReady, redirectTo } = useAuthGuard();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const previousAccessTokenRef = useRef<string | null | undefined>(undefined);

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

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {!isReady ? null : redirectTo ? (
            <Redirect href={redirectTo} />
          ) : (
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="otp" options={{ headerShown: false }} />
              <Stack.Screen name="event/[id]/index" options={{ headerShown: true, title: 'Etkinlik' }} />
              <Stack.Screen name="event/[id]/chat" options={{ headerShown: true, title: 'Sohbet' }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
          )}
          <ToastHost />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
