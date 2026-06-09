import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'expo-image';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/src/store/useAuthStore';
import { TopBar } from '@/src/components/ui/top-bar';
import { TabBar } from '@/src/components/ui/tab-bar';
import { hitSlop } from '@/src/constants/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const logout = useAuthStore((state) => state.logout);

  if (!hasHydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/landing" />;
  }

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/landing');
        },
      },
    ]);
  };

  const profileRightContent = (
    <>
      <Pressable
        hitSlop={hitSlop.md}
        onPress={() => router.push('/(tabs)/notifications')}>
        <IconSymbol size={22} name="bell.fill" color="#6B7280" />
      </Pressable>
      <Pressable
        hitSlop={hitSlop.md}
        onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
      </Pressable>
    </>
  );

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        header: () => <TopBar />,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Harita',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
          header: () => <TopBar />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Oluştur',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="plus.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Takvim',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          header: () => <TopBar rightContent={profileRightContent} />,
        }}
      />
      <Tabs.Screen
        name="user/[id]"
        options={{
          href: null,
          header: () => (
            <TopBar 
              leftContent={
                <View className="flex-row items-center gap-2">
                  <Pressable onPress={() => router.back()} hitSlop={hitSlop.md} className="flex-row items-center justify-center pl-2">
                    <IconSymbol name="chevron.left" size={28} color="#111827" />
                  </Pressable>
                  <View className="flex-row items-center gap-2">
                    <Image 
                      source={require('@/assets/apptivity/apptivity_logo.svg')} 
                      style={{ width: 26, height: 26 }} 
                      contentFit="contain" 
                    />
                    <Text className="font-sans-bold text-lg text-primary-600">
                      Apptivity
                    </Text>
                  </View>
                </View>
              }
            />
          ),
        }}
      />
    </Tabs>
  );
}
