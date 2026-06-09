import { Redirect, router } from 'expo-router';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/src/components/ui/button';
import { useAuthStore } from '@/src/store/useAuthStore';

export function LandingScreen() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  // Oturum varsa doğrudan ana sayfaya yönlendir
  if (hasHydrated && accessToken) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 items-center justify-center px-8">
        {/* ── Logo & Branding ── */}
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-3xl bg-primary-50">
          <Image
            source={require('@/assets/apptivity/apptivity_logo.png')}
            style={{ width: 64, height: 64 }}
            resizeMode="contain"
          />
        </View>

        <Text style={{ fontSize: 32, lineHeight: 40, letterSpacing: -0.5 }} className="font-sans-extrabold text-gray-900">
          Apptivity
        </Text>

        {/* ── Feature Highlights ── */}
        <View className="mt-4 w-full gap-3">
          <FeatureItem
            iconName="location-outline"
            title="Yakınındaki Etkinlikler"
          />
          <FeatureItem
            iconName="calendar-outline"
            title="Takvim ile Planla"
          />
          <FeatureItem
            iconName="people-outline"
            title="Katılımcılarla Sohbet"
          />
        </View>
      </View>

      {/* ── Action Buttons ── */}
      <View className="gap-3 px-8 pb-4">
        <Button
          label="Hesap Oluştur"
          variant="outline"
          size="lg"
          className="rounded-full"
          onPress={() => router.push('/(auth)/register')}
        />
        <Button
          label="Giriş Yap"
          variant="primary"
          size="lg"
          className="rounded-full"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Feature Item ────────────────────────────────────────────────────────────

function FeatureItem({
  iconName,
  title,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
}) {
  return (
    <View className="flex-row items-center gap-4 rounded-card border border-gray-200 bg-white px-4 py-3.5">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
        <Ionicons name={iconName} size={20} color="#44a31e" />
      </View>
      <View className="flex-1">
        <Text className="font-sans-semibold text-sm text-gray-900">{title}</Text>
      </View>

    </View>
  );
}
