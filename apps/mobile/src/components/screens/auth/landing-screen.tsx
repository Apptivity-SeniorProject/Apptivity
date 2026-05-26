import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        {/* ── Logo & Branding ── */}
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-3xl bg-primary-50">
          <Text style={{ fontSize: 48 }}>🎉</Text>
        </View>

        <Text className="font-sans-extrabold text-4xl text-gray-900">
          Apptivity
        </Text>

        <Text className="mt-3 text-center font-sans text-base text-gray-500">
          Etkinlikleri keşfet, katıl, paylaş.{'\n'}
          Çevrende neler olduğunu gör.
        </Text>

        {/* ── Feature Highlights ── */}
        <View className="mt-10 w-full gap-4">
          <FeatureItem
            emoji="📍"
            title="Yakınındaki Etkinlikler"
            description="Konumuna göre sana özel etkinlik önerileri"
          />
          <FeatureItem
            emoji="🗓️"
            title="Takvim ile Planla"
            description="Etkinliklerini takvimde görüntüle ve takip et"
          />
          <FeatureItem
            emoji="💬"
            title="Katılımcılarla Sohbet"
            description="Etkinlik içi gerçek zamanlı mesajlaşma"
          />
        </View>
      </View>

      {/* ── Action Buttons ── */}
      <View className="gap-3 px-8 pb-6">
        <Button
          label="Giriş Yap"
          variant="primary"
          size="lg"
          onPress={() => router.push('/(auth)/login')}
        />
        <Button
          label="Hesap Oluştur"
          variant="outline"
          size="lg"
          onPress={() => router.push('/(auth)/register')}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Feature Item ────────────────────────────────────────────────────────────

function FeatureItem({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row items-center gap-4 rounded-card bg-surface-secondary px-4 py-3.5">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-sans-semibold text-sm text-gray-900">{title}</Text>
        <Text className="font-sans text-xs text-gray-500">{description}</Text>
      </View>
    </View>
  );
}
