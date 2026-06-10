import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
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

import { colors, radius, spacing } from '@/src/constants/theme';
import { useEvents, useRecommendedNearbyEvents } from '@/src/hooks/useEvents';
import { useToast } from '@/src/hooks/useToast';
import { useTags } from '@/src/hooks/useTags';
import { getStartupHomeCoordinates } from '@/src/services/recommendationHotZoneService';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useRecommendationFlowStore } from '@/src/store/useRecommendationFlowStore';
import { useRecommendationSessionStore } from '@/src/store/useRecommendationSessionStore';
import { parseAuthToken } from '@/src/utils/auth';
import { useProfileSearch } from '@/src/hooks/useProfile';
import type { EventListItem } from '@/src/types/event';
import type { ProfileDto } from '@/src/types/profile';
import { formatLocationShort } from '@/src/utils/event-format';
import { SearchBar } from '@/src/components/events/search-bar';
import { EventRowCard } from '@/src/components/events/event-row-card';
import { EventCardSkeleton } from '@/src/components/events/event-card-skeleton';
import { TagSelectionModal } from '@/src/components/tags/tag-selection-modal';
import { normalizePossiblyMojibakeText } from '@/src/utils/text';

type CategoryOption = { id: string; name: string };
type SearchMode = 'events' | 'profiles';
const ALL_CATEGORY_ID = 'all';

function normalizeAccountType(type: ProfileDto['type']): 'organization' | 'individual' | 'admin' | 'unknown' {
  if (typeof type === 'number') {
    if (type === 2) return 'organization';
    if (type === 1) return 'individual';
    if (type === 3) return 'admin';
    return 'unknown';
  }
  if (typeof type === 'string') {
    const normalized = type.trim().toLowerCase();
    if (normalized === 'organization' || normalized === 'individual' || normalized === 'admin') {
      return normalized;
    }
  }
  return 'unknown';
}

function getProfileDisplayName(profile: ProfileDto): string {
  if (normalizeAccountType(profile.type) === 'organization') {
    return profile.clubProfile?.name?.trim() || profile.username;
  }
  const fullName = [profile.userProfile?.name, profile.userProfile?.surname].filter(Boolean).join(' ').trim();
  return fullName || profile.username;
}

function getProfileSubtitle(profile: ProfileDto): string {
  if (normalizeAccountType(profile.type) === 'organization') {
    return profile.clubProfile?.city?.trim() || 'Organizasyon';
  }
  return profile.userProfile?.bio?.trim() || 'Kullanıcı';
}

function getProfileInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function HomeScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('profiles');
  const [isSearchOverlayVisible, setIsSearchOverlayVisible] = useState(false);
  const [isTagPickerVisible, setIsTagPickerVisible] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([ALL_CATEGORY_ID]);
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationResolved, setLocationResolved] = useState(false);

  const isSuggestRequestInFlightRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const accountId = useAuthStore((state) => state.user?.id);
  const resetRecommendationFlow = useRecommendationFlowStore((state) => state.reset);
  const startNewRecommendationSession = useRecommendationSessionStore((state) => state.startNewSession);
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
      name: normalizePossiblyMojibakeText(tag.name),
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
        const coords = await getStartupHomeCoordinates();
        if (isMounted && coords) {
          setLocation({ lat: coords.latitude, lng: coords.longitude });
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
  const inlineCategories = useMemo(
    () => categories.filter((category) => category.id !== ALL_CATEGORY_ID).slice(0, 4),
    [categories]
  );
  const quickCategories = useMemo(
    () => (categories.length > 0 ? [categories[0], ...inlineCategories] : inlineCategories),
    [categories, inlineCategories]
  );
  const hiddenSelectedCount = useMemo(
    () =>
      normalizedTagIds.filter(
        (tagId) => !inlineCategories.some((category) => category.id === tagId)
      ).length,
    [inlineCategories, normalizedTagIds]
  );

  const {
    events,
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

  const shouldRunSearch = isSearchOverlayVisible && debouncedSearchTerm.length > 0;
  const shouldRunEventSearch = shouldRunSearch && searchMode === 'events';
  const shouldRunProfileSearch = shouldRunSearch && searchMode === 'profiles';

  const {
    events: searchedEvents,
    isPending: isSearchEventsPending,
  } = useEvents(
    {
      searchTerm: debouncedSearchTerm || undefined,
      tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
      pageSize: 8,
      userLat: location?.lat,
      userLng: location?.lng,
      nearbyRadiusKm: location ? 50 : undefined,
      sort: location ? 'nearby' : undefined,
    },
    {
      enabled: canLoadEvents && locationResolved && shouldRunEventSearch,
    }
  );

  const profileSearchQuery = useProfileSearch(
    { query: debouncedSearchTerm, pageNumber: 1, pageSize: 5 },
    shouldRunProfileSearch
  );

  const profileResults = (profileSearchQuery.data?.items ?? []).filter(
    (profile) => normalizeAccountType(profile.type) !== 'admin'
  );
  const hasSearchText = searchInput.trim().length > 0;
  const searchPlaceholder = searchMode === 'events' ? 'Etkinlik ara...' : 'Kullanıcı ara...';
  const isSearchLoading = hasSearchText && (debouncedSearchTerm !== searchInput.trim() || (searchMode === 'events' ? isSearchEventsPending : profileSearchQuery.isPending));

  const closeSearchOverlay = () => {
    setIsSearchOverlayVisible(false);
    setSearchInput('');
    setDebouncedSearchTerm('');
  };
  const recommendedQuery = useRecommendedNearbyEvents(location?.lat, location?.lng, 8, { enabled: canLoadRecommended && locationResolved });
  const refetchRecommended = recommendedQuery.refetch;

  const hasFocusedOnceRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!canLoadEvents || !locationResolved) {
        return;
      }

      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void refresh();

      if (canLoadRecommended) {
        void refetchRecommended();
      }
    }, [canLoadEvents, locationResolved, refresh, canLoadRecommended, refetchRecommended])
  );

  const handleSuggestEventsPress = () => {
    if (isSuggestRequestInFlightRef.current) return;
    if (!canLoadRecommended) {
      toast.info('Etkinlik önerileri için bireysel hesapla giriş yapmalısın.');
      return;
    }

    if (accountId) {
      startNewRecommendationSession(accountId);
    }

    resetRecommendationFlow();
    isSuggestRequestInFlightRef.current = true;
    router.push({
      pathname: '/recommendation/loading',
      params: location
        ? {
            latitude: String(location.lat),
            longitude: String(location.lng),
          }
        : undefined,
    });
    setTimeout(() => {
      isSuggestRequestInFlightRef.current = false;
    }, 400);
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
  const toggleTagFromPicker = (tagId: string) => {
    toggleCategory({ id: tagId, name: '' });
  };

  const TAB_BAR_HEIGHT = 56;
  const FAB_BOTTOM = TAB_BAR_HEIGHT - 30;
  const PADDING_BOTTOM = TAB_BAR_HEIGHT + insets.bottom + 80;

  const renderFeatCard = (event: EventListItem) => {
    const isFree = event.price === 0;
    const spotsLeft = event.capacity > 0 ? event.capacity - event.participantCount : null;
    const locationText = formatLocationShort(event.location);

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
            <ExpoImage
              source={{ uri: event.bannerImageUrl || event.imageUrls?.[0] }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
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
            <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>{locationText}</Text>
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
          <Pressable onPress={() => setIsSearchOverlayVisible(true)} style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.surfaceSecondary, borderWidth: 0.5,
            borderColor: colors.border, borderRadius: radius.lg, height: 40, paddingHorizontal: 12
          }}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <Text style={{ fontSize: 14, color: colors.textTertiary, flex: 1 }}>Etkinlik veya kullanıcı ara...</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 12, paddingRight: 16 }}>
          {quickCategories.map((cat) => {
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
          <Pressable
            onPress={() => setIsTagPickerVisible(true)}
            style={{
              minWidth: 40,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 9999,
              borderWidth: 0.5,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: hiddenSelectedCount > 0 ? colors.primary : colors.surfaceSecondary,
              borderColor: hiddenSelectedCount > 0 ? colors.primary : colors.border,
            }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: hiddenSelectedCount > 0 ? '#1a4a05' : colors.textSecondary,
              }}>
              {hiddenSelectedCount > 0 ? `+${hiddenSelectedCount}` : '+'}
            </Text>
          </Pressable>
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
    const spotsLeft = event.capacity > 0 ? event.capacity - event.participantCount : null;
    const locationText = formatLocationShort(event.location);

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
              <ExpoImage
                source={{ uri: event.bannerImageUrl || event.imageUrls?.[0] }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <Ionicons name="image-outline" size={24} color="rgba(255,255,255,0.2)" />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }} numberOfLines={1}>{event.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{locationText}</Text>
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
      {isSearchOverlayVisible ? (
        <View className="absolute inset-0 z-50" style={{ backgroundColor: colors.background }}>
          <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <Pressable className="absolute inset-0" onPress={closeSearchOverlay} />

            <View className="flex-1">
              <View
                className="flex-1"
                style={{
                  backgroundColor: colors.background,
                }}>
                <View
                  className="px-4 pb-4 pt-2"
                  style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text
                      className="text-xs font-semibold uppercase tracking-[1.5px]"
                      style={{ color: colors.textTertiary }}>
                      Keşfet
                    </Text>
                    <Pressable
                      className="rounded-full px-4 py-2"
                      style={{ backgroundColor: colors.surfaceTertiary }}
                      onPress={closeSearchOverlay}>
                      <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                        Kapat
                      </Text>
                    </Pressable>
                  </View>

                  <SearchBar
                    key={isSearchOverlayVisible ? 'search-overlay-open' : 'search-overlay-closed'}
                    value={searchInput}
                    onChangeText={setSearchInput}
                    autoFocus
                    showFilterButton={false}
                    placeholder={searchPlaceholder}
                  />

                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      className="flex-1 rounded-full px-4 py-3"
                      style={{
                        borderWidth: 1,
                        borderColor: searchMode === 'profiles' ? colors.primary : colors.border,
                        backgroundColor:
                          searchMode === 'profiles' ? colors.primary : colors.surfaceSecondary,
                      }}
                      onPress={() => setSearchMode('profiles')}>
                      <Text
                        className="text-center text-sm font-semibold"
                        style={{
                          color:
                            searchMode === 'profiles' ? colors.primaryForeground : colors.textSecondary,
                        }}>
                        Kullanıcı
                      </Text>
                    </Pressable>
                    <Pressable
                      className="flex-1 rounded-full px-4 py-3"
                      style={{
                        borderWidth: 1,
                        borderColor: searchMode === 'events' ? colors.primary : colors.border,
                        backgroundColor:
                          searchMode === 'events' ? colors.primary : colors.surfaceSecondary,
                      }}
                      onPress={() => setSearchMode('events')}>
                      <Text
                        className="text-center text-sm font-semibold"
                        style={{
                          color: searchMode === 'events' ? colors.primaryForeground : colors.textSecondary,
                        }}>
                        Etkinlik
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View className="px-4 pb-4 pt-4">
                  {!hasSearchText ? (
                    <View
                      className="items-center justify-center rounded-[24px] px-6 py-10"
                      style={{ backgroundColor: colors.surfaceSecondary }}>
                      <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                        {searchMode === 'events' ? 'Etkinlik ara' : 'Kullanıcı ara'}
                      </Text>
                      <Text
                        className="mt-2 text-center text-sm leading-6"
                        style={{ color: colors.textSecondary }}>
                        {searchMode === 'events'
                          ? 'Seçilen filtrelere göre etkinlik sonuçları bu panelde listelenir.'
                          : 'Kullanıcı sonuçları burada tek bir akışta görünür.'}
                      </Text>
                    </View>
                  ) : isSearchLoading ? (
                    <View className="gap-3">
                      <EventCardSkeleton />
                      <EventCardSkeleton />
                    </View>
                  ) : (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      contentContainerClassName="gap-5 pb-2">
                      {searchMode === 'profiles' ? (
                        <View className="gap-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                            Kullanıcılar
                          </Text>
                          <Text className="text-sm" style={{ color: colors.textSecondary }}>
                            {profileResults.length} sonuç
                          </Text>
                        </View>

                          {profileResults.length ? (
                            profileResults.map((profile) => {
                              const displayName = getProfileDisplayName(profile);
                              const subtitle = getProfileSubtitle(profile);
                              const initials = getProfileInitials(displayName);

                              return (
                                <Pressable
                                  key={profile.accountId}
                                  className="flex-row items-center gap-3 rounded-3xl p-4 shadow-sm"
                                  style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface,
                                  }}
                                  onPress={() => {
                                    closeSearchOverlay();
                                    router.push(`/(tabs)/user/${profile.accountId}` as any);
                                  }}>
                                  {profile.profilePhoto ? (
                                    <ExpoImage
                                      source={{ uri: profile.profilePhoto }}
                                      style={{ width: 52, height: 52, borderRadius: 999 }}
                                      contentFit="cover"
                                      transition={120}
                                    />
                                  ) : (
                                    <View
                                      className="h-[52px] w-[52px] items-center justify-center rounded-full"
                                      style={{ backgroundColor: colors.primaryMuted }}>
                                      <Text className="text-sm font-semibold" style={{ color: colors.primaryDark }}>
                                        {initials}
                                      </Text>
                                    </View>
                                  )}

                                  <View className="flex-1">
                                    <Text className="text-base font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                                      {displayName}
                                    </Text>
                                    <Text className="mt-1 text-sm" style={{ color: colors.textSecondary }} numberOfLines={1}>
                                      @{profile.username}
                                    </Text>
                                    <Text className="mt-1 text-xs" style={{ color: colors.textTertiary }} numberOfLines={1}>
                                      {subtitle}
                                    </Text>
                                  </View>
                                </Pressable>
                              );
                            })
                          ) : (
                            <View
                              className="rounded-2xl p-4"
                              style={{
                                borderWidth: 1,
                                borderStyle: 'dashed',
                                borderColor: colors.border,
                                backgroundColor: colors.surfaceSecondary,
                              }}>
                              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                                Kullanıcı bulunamadı.
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View className="gap-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                            Etkinlikler
                          </Text>
                          <Text className="text-sm" style={{ color: colors.textSecondary }}>
                            {searchedEvents.length} sonuç
                          </Text>
                        </View>

                          {searchedEvents.length ? (
                            searchedEvents.map((event) => (
                              <EventRowCard
                                key={event.id}
                                event={event}
                                onPress={(eventId) => {
                                  closeSearchOverlay();
                                  router.push(`/event/${eventId}`);
                                }}
                              />
                            ))
                          ) : (
                            <View
                              className="rounded-2xl p-4"
                              style={{
                                borderWidth: 1,
                                borderStyle: 'dashed',
                                borderColor: colors.border,
                                backgroundColor: colors.surfaceSecondary,
                              }}>
                              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                                Etkinlik bulunamadı.
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <TagSelectionModal
        visible={isTagPickerVisible}
        onClose={() => setIsTagPickerVisible(false)}
        tags={tags ?? []}
        selectedTagIds={normalizedTagIds}
        onToggleTag={toggleTagFromPicker}
        title="Etiket seç"
        description="İlk etiketleri hızlı seçmeye devam edebilirsin. Diğer etiketler için arayıp filtreyi buradan güncelle."
        searchPlaceholder="Etiket ara"
        selectedSectionTitle="Seçilenler"
        allTagsSectionTitle="Tüm etiketler"
        emptyStateText="Aramana uyan etiket bulunamadı."
        primaryActionLabel="Uygula"
        presentation="popover"
        topOffset={insets.top + 108}
      />
    </View>
  );
}
