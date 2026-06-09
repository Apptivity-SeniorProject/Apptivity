import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { colors, radius, spacing, hitSlop } from '@/src/constants/theme';
import { useDailyRecommendedNext, useEvents, useRecommendedNearbyEvents } from '@/src/hooks/useEvents';
import { useToast } from '@/src/hooks/useToast';
import { useTags } from '@/src/hooks/useTags';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { EventListItem } from '@/src/types/event';
import { parseAuthToken } from '@/src/utils/auth';

type CategoryOption = { id: string; name: string };
const ALL_CATEGORY_ID = 'all';

export default function HomeScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([ALL_CATEGORY_ID]);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);
  const [suggestedEvent, setSuggestedEvent] = useState<EventListItem | null>(null);
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationResolved, setLocationResolved] = useState(false);

  const isSuggestRequestInFlightRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const toast = useToast();

  const { data: tags } = useTags();
  const authToken = useMemo(
    () => (accessToken ? parseAuthToken(accessToken) : null),
    [accessToken]
  );
  const canLoadEvents = hasHydrated && Boolean(accessToken);
  const canLoadRecommended = hasHydrated && authToken?.role === 'Individual';

  const categories = useMemo<CategoryOption[]>(() => {
    const dynamicCategories = (tags ?? []).map((tag) => ({
      id: tag.id,
      name: tag.name,
    }));
    return [{ id: ALL_CATEGORY_ID, name: 'Tümü' }, ...dynamicCategories];
  }, [tags]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchInput.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setLocationResolved(true);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (isMounted) {
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch (e) {
        console.warn('Location error:', e);
      } finally {
        if (isMounted) setLocationResolved(true);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const normalizedTagIds = useMemo(
    () => selectedTagIds.filter((id) => id !== ALL_CATEGORY_ID),
    [selectedTagIds]
  );

  const {
    events,
    isPending,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refresh,
  } = useEvents({
    searchTerm: debouncedSearchTerm || undefined,
    tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
    pageSize: 10,
    userLat: location?.lat,
    userLng: location?.lng,
    nearbyRadiusKm: location ? 50 : undefined,
    sort: location ? 'nearby' : undefined,
  }, {
    enabled: canLoadEvents && locationResolved,
  });

  const recommendedQuery = useRecommendedNearbyEvents(location?.lat, location?.lng, 8, { enabled: canLoadRecommended && locationResolved });
  const dailyRecommendationMutation = useDailyRecommendedNext();

  const handleSuggestEventsPress = async () => {
    if (dailyRecommendationMutation.isPending || isSuggestRequestInFlightRef.current) return;
    if (!canLoadRecommended) {
      toast.info('Etkinlik önerileri için bireysel hesapla giriş yapmalısın.');
      return;
    }

    isSuggestRequestInFlightRef.current = true;
    try {
      const result = await dailyRecommendationMutation.mutateAsync();
      if (result.status === 'served' && result.event) {
        setSuggestedEvent(result.event);
        setIsRecommendationModalOpen(true);
        return;
      }
      if (result.status === 'depleted') {
        toast.info(result.message ?? 'Bugünlük buralardaki tüm pasları tükettin kral!');
        return;
      }
      toast.error(result.message ?? 'Şu anda öneri servisi kullanılamıyor.');
    } catch {
      toast.error('Etkinlik önerileri alınamadı.');
    } finally {
      isSuggestRequestInFlightRef.current = false;
    }
  };

  const toggleCategory = (category: CategoryOption) => {
    if (category.id === ALL_CATEGORY_ID) {
      setSelectedTagIds([ALL_CATEGORY_ID]);
      return;
    }
    setSelectedTagIds((prev) => {
      const base = prev.filter((id) => id !== ALL_CATEGORY_ID);
      const exists = base.includes(category.id);
      const next = exists ? base.filter((id) => id !== category.id) : [...base, category.id];
      return next.length ? next : [ALL_CATEGORY_ID];
    });
  };

  const TAB_BAR_HEIGHT = 56;
  const FAB_BOTTOM = TAB_BAR_HEIGHT - 30;
  const PADDING_BOTTOM = TAB_BAR_HEIGHT + insets.bottom + 80;

  const renderFeatCard = (event: EventListItem) => {
    const isFree = event.price === 0;
    const spotsLeft = event.maxParticipants > 0 ? event.maxParticipants - event.participantCount : null;

    return (
      <Pressable
        key={event.id}
        onPress={() => router.push(`/event/${event.id}`)}
        style={{
          width: 190,
          backgroundColor: colors.background,
          borderRadius: radius.lg,
          borderWidth: 0.5,
          borderColor: colors.border,
          overflow: 'hidden',
        }}>
        <View style={{ height: 115, backgroundColor: colors.surfaceTertiary, justifyContent: 'center', alignItems: 'center' }}>
          {(event.bannerImageUrl || event.imageUrls?.[0]) ? (
            <ExpoImage source={{ uri: event.bannerImageUrl || event.imageUrls?.[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Ionicons name="image-outline" size={30} color="rgba(255,255,255,0.15)" />
          )}
          {event.tags?.[0]?.name && (
            <View style={{
              position: 'absolute', top: 8, left: 8,
              backgroundColor: 'rgba(255,255,255,0.15)',
              paddingHorizontal: 7, paddingVertical: 2,
              borderRadius: 5
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.4 }}>
                {event.tags[0].name.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={{ padding: spacing.lg }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 5 }} numberOfLines={1}>
            {event.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{new Date(event.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>{event.location?.locationLabel || event.location?.city || event.location?.fullAddress || 'Belirtilmemiş'}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 6, gap: 5 }}>
            {isFree ? (
              <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 0.5, borderColor: '#bbf09e' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primaryDark }}>Ücretsiz</Text>
              </View>
            ) : spotsLeft !== null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="people" size={12} color={spotsLeft <= 5 ? colors.error : colors.textSecondary} />
                <Text style={{ fontSize: 11, fontWeight: '500', color: spotsLeft <= 5 ? colors.error : colors.textSecondary }}>{spotsLeft} yer kaldı</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={{ backgroundColor: colors.background }}>
      {/* Search Section */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.surfaceSecondary, borderWidth: 0.5,
            borderColor: colors.border, borderRadius: radius.lg, height: 40, paddingHorizontal: 12
          }}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <Text style={{ fontSize: 14, color: colors.textTertiary, flex: 1 }}>Etkinlik ara...</Text>
          </View>
          <Pressable style={{
            width: 28, height: 28, borderRadius: radius.md,
            backgroundColor: colors.background, borderWidth: 0.5, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Ionicons name="options-outline" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {categories.map((cat) => {
            const isActive = selectedTagIds.includes(cat.id);
            return (
              <Pressable
                key={cat.id} onPress={() => toggleCategory(cat)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999, borderWidth: 0.5,
                  backgroundColor: isActive ? colors.primary : colors.background,
                  borderColor: isActive ? colors.primary : colors.border
                }}>
                <Text style={{ fontSize: 13, fontWeight: isActive ? '600' : '500', color: isActive ? '#1a4a05' : colors.textSecondary }}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Senin İçin Section */}
      {recommendedQuery.data?.items && recommendedQuery.data.items.length > 0 && (
        <View style={{ marginTop: 8, backgroundColor: colors.background, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Senin İçin</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 4 }}>
            {recommendedQuery.data.items.map(renderFeatCard)}
          </ScrollView>
        </View>
      )}

      {/* Genel Akış Header */}
      <View style={{ marginTop: 8, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Genel Akış</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{events.length} sonuç</Text>
      </View>
    </View>
  );

  const renderListCard = ({ item: event }: { item: EventListItem }) => {
    const isFree = event.price === 0;
    const spotsLeft = event.maxParticipants > 0 ? event.maxParticipants - event.participantCount : null;

    return (
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Pressable
          onPress={() => router.push(`/event/${event.id}`)}
          style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 12,
            padding: 12, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border,
            backgroundColor: colors.background
          }}>
          <View style={{ width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {(event.bannerImageUrl || event.imageUrls?.[0]) ? (
              <ExpoImage source={{ uri: event.bannerImageUrl || event.imageUrls?.[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Ionicons name="image-outline" size={24} color="rgba(255,255,255,0.2)" />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }} numberOfLines={1}>{event.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{event.location?.locationLabel || event.location?.city || event.location?.fullAddress || 'Belirtilmemiş'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{new Date(event.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              {isFree && (
                <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 0.5, borderColor: '#bbf09e' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primaryDark }}>Ücretsiz</Text>
                </View>
              )}
              {spotsLeft !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="people" size={12} color={spotsLeft <= 5 ? colors.error : colors.textSecondary} />
                  <Text style={{ fontSize: 11, fontWeight: '500', color: spotsLeft <= 5 ? colors.error : colors.textSecondary }}>{spotsLeft} yer kaldı</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        contentContainerStyle={{ paddingBottom: PADDING_BOTTOM }}
        data={events}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderListCard}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        refreshControl={<RefreshControl refreshing={isRefetching || recommendedQuery.isRefetching} onRefresh={async () => {
          await Promise.all([
            refresh(),
            recommendedQuery.refetch()
          ]);
        }} />}
      />

      <Animated.View style={{
        position: 'absolute',
        bottom: FAB_BOTTOM,
        right: spacing.xl,
        transform: [{ scale: scaleAnim }],
      }}>
        <Pressable
          onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
          onPress={handleSuggestEventsPress}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 24,
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 6,
          }}>
          <Ionicons name="dice-outline" size={24} color="#1a4a05" />
        </Pressable>
      </Animated.View>

      <Modal animationType="slide" transparent visible={isRecommendationModalOpen}>
        <Pressable className="flex-1 justify-end bg-black/35" onPress={() => setIsRecommendationModalOpen(false)}>
          <View className="rounded-t-3xl bg-white px-5 py-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">Sana Özel Öneri</Text>
            </View>
            {suggestedEvent ? (
              <View className="pb-4">
                {renderListCard({ item: suggestedEvent })}
              </View>
            ) : (
              <View className="pb-4">
                <Text className="text-sm text-slate-500">Şu an için bir öneri bulunamadı.</Text>
              </View>
            )}
            <Pressable
              style={{ backgroundColor: colors.surfaceSecondary, padding: 12, borderRadius: radius.md, alignItems: 'center' }}
              onPress={() => setIsRecommendationModalOpen(false)}>
              <Text style={{ fontWeight: '600', color: colors.text }}>Kapat</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
