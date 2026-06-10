import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, BackHandler, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/constants/theme';
import { fetchDailyRecommendedNext, type DailyRecommendedNextOverrides } from '@/src/hooks/useEvents';
import { useRecommendationFlowStore } from '@/src/store/useRecommendationFlowStore';

let inFlightRecommendationRequest:
  | Promise<Awaited<ReturnType<typeof fetchDailyRecommendedNext>>>
  | null = null;

function requestDailyRecommendation(overrides?: DailyRecommendedNextOverrides) {
  if (!inFlightRecommendationRequest) {
    inFlightRecommendationRequest = fetchDailyRecommendedNext(overrides).finally(() => {
      inFlightRecommendationRequest = null;
    });
  }

  return inFlightRecommendationRequest;
}

export default function RecommendationLoadingScreen() {
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const resetRecommendationFlow = useRecommendationFlowStore((state) => state.reset);
  const startRecommendationSession = useRecommendationFlowStore((state) => state.startSession);
  const screenOptions = useMemo(() => ({ headerShown: false }), []);
  const hasRequestedRef = useRef(false);
  const requestCoordinates = useMemo(() => {
    const latitude = params.latitude ? Number(params.latitude) : undefined;
    const longitude = params.longitude ? Number(params.longitude) : undefined;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return undefined;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return undefined;
    }

    return {
      latitude,
      longitude,
    };
  }, [params.latitude, params.longitude]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      resetRecommendationFlow();
      router.replace('/(tabs)');
      return true;
    });

    return () => subscription.remove();
  }, [resetRecommendationFlow]);

  useEffect(() => {
    if (hasRequestedRef.current) {
      return;
    }

    hasRequestedRef.current = true;
    let isCancelled = false;

    const run = async () => {
      try {
        const result = await requestDailyRecommendation(requestCoordinates);
        if (isCancelled) {
          return;
        }

        if (result.status === 'served' && result.event) {
          startRecommendationSession(result.event.id);
          router.replace({
            pathname: '/event/[id]',
            params: {
              id: result.event.id,
              recommendationFlow: '1',
              returnToHome: '1',
            },
          });
          return;
        }

        router.replace({
          pathname: '/recommendation/done',
          params: {
            message:
              result.message ??
              'Şimdilik bu kadar önerimiz var senin için.',
          },
        });
      } catch {
        if (isCancelled) {
          return;
        }

        router.replace({
          pathname: '/recommendation/done',
          params: {
            message: 'Etkinlik önerileri şu anda hazırlanamıyor. Lütfen daha sonra tekrar dene.',
          },
        });
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [requestCoordinates, startRecommendationSession]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={screenOptions} />
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="mb-6 h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.primaryLight }}>
          <Sparkles size={34} color={colors.primaryDark} />
        </View>
        <Text className="text-center text-2xl font-bold text-slate-900">Öneriler hazırlanıyor</Text>
        <Text className="mt-3 text-center text-sm leading-6 text-slate-500">
          AI senin için en iyi etkinlikleri seçiyor. Birkaç saniye içinde hazır olacak.
        </Text>
        <View className="mt-8">
          <ActivityIndicator size="large" color={colors.primaryDark} />
        </View>
      </View>
    </SafeAreaView>
  );
}
