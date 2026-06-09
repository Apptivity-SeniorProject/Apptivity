import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Route adına göre ikon eşleştirmesi
function getIconName(routeName: string): React.ComponentProps<typeof IconSymbol>['name'] {
  switch (routeName) {
    case 'index':
      return 'house.fill';
    case 'map':
      return 'map.fill';
    case 'calendar':
      return 'calendar';
    case 'profile':
      return 'person.fill';
    default:
      return 'circle';
  }
}

// Route adına göre etiket eşleştirmesi (yedek)
function getLabel(routeName: string, title?: string): string {
  if (title) return title;
  switch (routeName) {
    case 'index':
      return 'Ana Sayfa';
    case 'map':
      return 'Harita';
    case 'calendar':
      return 'Takvim';
    case 'profile':
      return 'Profil';
    default:
      return routeName;
  }
}

interface TabBarItemProps {
  routeName: string;
  isFocused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}

function TabBarItem({ routeName, isFocused, label, onPress, onLongPress }: TabBarItemProps) {
  const scale = useRef(new Animated.Value(isFocused ? 1 : 0.8)).current;
  const opacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: isFocused ? 1 : 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused, opacity, scale]);

  const color = isFocused ? '#5bcc2a' : '#9CA3AF';
  const iconName = getIconName(routeName);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-1 items-center justify-center pt-2 pb-1"
      hitSlop={8}>
      <View className="items-center justify-center h-8 w-8">
        <Animated.View
          style={{
            position: 'absolute',
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: '#f0fce8',
            opacity,
            transform: [{ scale }],
          }}
        />
        <IconSymbol name={iconName} size={24} color={color} />
      </View>
      <Text
        style={{
          fontSize: 10,
          color,
          marginTop: 3,
          fontWeight: isFocused ? '600' : '500',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

interface FabItemProps {
  onPress: () => void;
  onLongPress: () => void;
}

function FabItem({ onPress, onLongPress }: FabItemProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, { toValue: 0.92, duration: 100, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  };

  return (
    <View className="flex-1 items-center justify-center">
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        onLongPress={onLongPress}>
        <Animated.View
          className="items-center justify-center bg-[#77e349]"
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            marginTop: -20,
            transform: [{ scale }],
            // İsteğe bağlı gölge (shadow), şık durabilir
            shadowColor: '#77e349',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 4,
          }}>
          <Ionicons name="add" size={28} color="#1a4a05" />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        height: 56 + insets.bottom,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 0.5,
        borderTopColor: '#E5E7EB',
        paddingBottom: insets.bottom,
      }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        // Expo Router'da href: null olan sekmeleri (örn. notifications) gizle
        if ((options as any).href === null || route.name === 'notifications' || route.name === 'user/[id]' || route.name === 'event') {
          return null;
        }

        const isFocused = state.index === index;
        const label = getLabel(route.name, options.title);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        if (route.name === 'create') {
          return (
            <FabItem
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        }

        return (
          <TabBarItem
            key={route.key}
            routeName={route.name}
            isFocused={isFocused}
            label={label}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}
