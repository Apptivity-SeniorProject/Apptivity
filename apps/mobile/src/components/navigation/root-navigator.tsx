import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { queryClient } from '@/src/api/queryClient';
import { useAuthGuard } from '@/src/hooks/useAuthGuard';
import { useColorScheme } from '@/hooks/use-color-scheme';

import '../../../global.css';

export function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isReady, redirectTo } = useAuthGuard();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {!isReady ? null : redirectTo ? (
          <Redirect href={redirectTo} />
        ) : (
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="otp" options={{ headerShown: false }} />
            <Stack.Screen name="event/[id]" options={{ headerShown: true, title: 'Etkinlik' }} />
            <Stack.Screen name="event/[id]/chat" options={{ headerShown: true, title: 'Sohbet' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        )}
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
