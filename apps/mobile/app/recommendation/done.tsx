import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Home } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/constants/theme';
import { useRecommendationFlowStore } from '@/src/store/useRecommendationFlowStore';

export default function RecommendationDoneScreen() {
  const params = useLocalSearchParams<{ message?: string }>();
  const recommendationEventIds = useRecommendationFlowStore((state) => state.eventIds);
  const recommendationCurrentIndex = useRecommendationFlowStore((state) => state.currentIndex);
  const setRecommendationCurrentIndex = useRecommendationFlowStore((state) => state.setCurrentIndex);
  const resetRecommendationFlow = useRecommendationFlowStore((state) => state.reset);
  const screenOptions = useMemo(() => ({ headerShown: false }), []);
  const message = params.message?.trim() || 'Simdilik bu kadar onerimiz var senin icin.';
  const returnEventIndex =
    recommendationEventIds.length === 0
      ? -1
      : Math.min(
          Math.max(recommendationCurrentIndex, 0),
          recommendationEventIds.length - 1
        );
  const returnEventId =
    returnEventIndex >= 0 ? recommendationEventIds[returnEventIndex] : undefined;

  const goHome = () => {
    resetRecommendationFlow();
    router.replace('/(tabs)');
  };

  const goBackToRecommendation = () => {
    if (!returnEventId) {
      goHome();
      return;
    }

    setRecommendationCurrentIndex(returnEventIndex);
    router.replace({
      pathname: '/event/[id]',
      params: {
        id: returnEventId,
        recommendationFlow: '1',
        returnToHome: '1',
      },
    });
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });

    return () => subscription.remove();
  }, [resetRecommendationFlow]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={screenOptions} />
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="mb-6 h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.surfaceTertiary }}>
          <Home size={34} color={colors.textSecondary} />
        </View>
        <Text className="text-center text-2xl font-bold text-slate-900">Simdilik bu kadar</Text>
        <Text className="mt-3 text-center text-sm leading-6 text-slate-500">{message}</Text>
        <View className="mt-8 flex-row items-center gap-3">
          {returnEventId ? (
            <Pressable
              className="flex-row items-center rounded-full px-5 py-4"
              style={{ backgroundColor: colors.surfaceTertiary }}
              onPress={goBackToRecommendation}>
              <ArrowLeft size={18} color={colors.textSecondary} />
              <Text className="ml-2 text-base font-semibold" style={{ color: colors.textSecondary }}>
                Geri don
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            className="rounded-full px-6 py-4"
            style={{ backgroundColor: colors.primary }}
            onPress={goHome}>
            <Text className="text-base font-semibold" style={{ color: colors.primaryForeground }}>
              Ana sayfaya don
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
