import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategorySelector } from '@/src/components/events/category-selector';
import { EventCard } from '@/src/components/events/event-card';
import { EventCardSkeleton } from '@/src/components/events/event-card-skeleton';
import { EventRowCard } from '@/src/components/events/event-row-card';
import { SearchBar } from '@/src/components/events/search-bar';
import { Button } from '@/src/components/ui/button';
import { CITY_OPTIONS } from '@/src/constants/events';
import { colors, palette } from '@/src/constants/theme';
import { useDailyRecommendedNext, useEvents, useRecommendedEvents } from '@/src/hooks/useEvents';
import { useProfileSearch } from '@/src/hooks/useProfile';
import { useTags } from '@/src/hooks/useTags';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { EventListItem } from '@/src/types/event';
import type { ProfileDto } from '@/src/types/profile';
import { parseAuthToken } from '@/src/utils/auth';
import { cn } from '@/src/utils/cn';

type PriceFilter = 'all' | 'free' | 'paid';
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

  const fullName = [profile.userProfile?.name, profile.userProfile?.surname]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || profile.username;
}

function getProfileSubtitle(profile: ProfileDto): string {
  if (normalizeAccountType(profile.type) === 'organization') {
    return profile.clubProfile?.city?.trim() || 'Organizasyon';
  }

  return profile.userProfile?.bio?.trim() || 'Kullanici';
}

function getProfileInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function HomeScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('profiles');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([ALL_CATEGORY_ID]);
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [matchAllTags, setMatchAllTags] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSearchOverlayVisible, setIsSearchOverlayVisible] = useState(false);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);
  const [suggestedEvent, setSuggestedEvent] = useState<EventListItem | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isSuggestRequestInFlightRef = useRef(false);

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

    return [{ id: ALL_CATEGORY_ID, name: 'Tumu' }, ...dynamicCategories];
  }, [tags]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchInput.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const isPaid = useMemo(() => {
    if (priceFilter === 'free') {
      return false;
    }
    if (priceFilter === 'paid') {
      return true;
    }
    return undefined;
  }, [priceFilter]);

  const normalizedTagIds = useMemo(
    () => selectedTagIds.filter((id) => id !== ALL_CATEGORY_ID),
    [selectedTagIds]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCity) count += 1;
    if (priceFilter !== 'all') count += 1;
    if (normalizedTagIds.length > 0) count += 1;
    return count;
  }, [normalizedTagIds.length, priceFilter, selectedCity]);

  const {
    events,
    isPending,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refresh,
  } = useEvents(
    {
      city: selectedCity,
      tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
      isPaid,
      matchAllTags,
      pageSize: 10,
    },
    {
      enabled: canLoadEvents,
    }
  );

  const shouldRunSearch = isSearchOverlayVisible && debouncedSearchTerm.length > 0;
  const shouldRunEventSearch = shouldRunSearch && searchMode === 'events';
  const shouldRunProfileSearch = shouldRunSearch && searchMode === 'profiles';

  const {
    events: searchedEvents,
    isPending: isSearchEventsPending,
  } = useEvents(
    {
      searchTerm: debouncedSearchTerm || undefined,
      city: selectedCity,
      tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
      isPaid,
      matchAllTags,
      pageSize: 8,
    },
    {
      enabled: canLoadEvents && shouldRunEventSearch,
    }
  );

  const profileSearchQuery = useProfileSearch(
    {
      query: debouncedSearchTerm,
      pageNumber: 1,
      pageSize: 5,
    },
    shouldRunProfileSearch
  );

  const recommendedQuery = useRecommendedEvents(8, { enabled: canLoadRecommended });
  const dailyRecommendationMutation = useDailyRecommendedNext();
  const profileResults = profileSearchQuery.data?.items ?? [];
  const hasSearchText = searchInput.trim().length > 0;
  const searchPlaceholder =
    searchMode === 'events' ? 'Etkinlik ara...' : 'Kullanici ara...';
  const isSearchLoading =
    hasSearchText &&
    (debouncedSearchTerm !== searchInput.trim() ||
      (searchMode === 'events' ? isSearchEventsPending : profileSearchQuery.isPending));

  const closeSearchOverlay = () => {
    setIsSearchOverlayVisible(false);
    setSearchInput('');
    setDebouncedSearchTerm('');
  };

  const handleSuggestEventsPress = async () => {
    if (dailyRecommendationMutation.isPending || isSuggestRequestInFlightRef.current) {
      return;
    }

    if (!canLoadRecommended) {
      toast.info('Etkinlik onerileri icin bireysel hesapla giris yapmalisin.');
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
        toast.info(
          result.message ??
            'Bugunluk buralardaki tum paslari tukettin kral. Yeni etkinlikler eklendiginde ilk senin haberin olacak!'
        );
        return;
      }

      toast.error(
        result.message ?? 'Su anda oneri servisi kullanilamiyor. Lutfen daha sonra tekrar dene.'
      );
    } catch {
      toast.error('Etkinlik onerileri alinamadi. Lutfen tekrar dene.');
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

  const resetFilters = () => {
    setSelectedCity(undefined);
    setPriceFilter('all');
    setMatchAllTags(false);
    setSelectedTagIds([ALL_CATEGORY_ID]);
    setIsFilterModalOpen(false);
  };

  const renderHeader = () => (
    <View className="gap-4 pb-5">
      <CategorySelector
        categories={categories}
        selectedIds={selectedTagIds}
        onToggle={toggleCategory}
      />

      <View className="mt-2 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-slate-900">Senin Icin</Text>
        </View>

        {canLoadRecommended && recommendedQuery.isPending ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <View key={`recommended-skeleton-${index}`} className="w-72">
                <EventCardSkeleton />
              </View>
            ))}
          </ScrollView>
        ) : recommendedQuery.data?.items?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
            {recommendedQuery.data.items.map((event) => (
              <View key={event.id} className="w-72">
                <EventCard
                  compact
                  event={event}
                  onPress={(eventId) => router.push(`/event/${eventId}`)}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-sm text-slate-500">
              Sana ozel oneriler yakinda burada gorunecek.
            </Text>
          </View>
        )}
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-slate-900">Genel Akis</Text>
        <Text className="text-sm text-slate-500">{events.length} sonuc</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar
        style="dark"
        backgroundColor={isSearchOverlayVisible ? colors.surfaceSecondary : colors.background}
      />

      <View className="px-4 pb-3 pt-6">
        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          editable={false}
          placeholder={searchPlaceholder}
          onPress={() => {
            if (!isSearchOverlayVisible) {
              setIsSearchOverlayVisible(true);
            }
          }}
          onFilterPress={() => setIsFilterModalOpen(true)}
        />
      </View>

      <FlatList
        contentContainerClassName="px-4 pb-8"
        data={events}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View className="mb-4">
            <EventRowCard event={item} onPress={(eventId) => router.push(`/event/${eventId}`)} />
          </View>
        )}
        ListEmptyComponent={
          isPending ? (
            <View className="gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <EventCardSkeleton key={`skeleton-${index}`} />
              ))}
            </View>
          ) : (
            <View className="mt-16 items-center justify-center">
              <Text className="text-base text-slate-500">Etkinlik bulunamadi</Text>
            </View>
          )
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="mt-2">
              <EventCardSkeleton />
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}
      />

      {isSearchOverlayVisible ? (
        <View className="absolute inset-0 z-50" style={{ backgroundColor: colors.surfaceSecondary }}>
          <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceSecondary }} edges={['top']}>
            <Pressable className="absolute inset-0" onPress={closeSearchOverlay} />

            <View className="flex-1 px-4 pb-4 pt-4">
              <View
                className="overflow-hidden rounded-[32px] shadow-2xl"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  shadowColor: palette.black,
                  shadowOpacity: 0.18,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 12 },
                  elevation: 24,
                  maxHeight: '78%',
                }}>
                <View
                  className="px-4 pb-4 pt-4"
                  style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text
                      className="text-xs font-semibold uppercase tracking-[1.5px]"
                      style={{ color: colors.textTertiary }}>
                      Kesfet
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
                        Kullanici
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
                        {searchMode === 'events' ? 'Etkinlik ara' : 'Kullanici ara'}
                      </Text>
                      <Text
                        className="mt-2 text-center text-sm leading-6"
                        style={{ color: colors.textSecondary }}>
                        {searchMode === 'events'
                          ? 'Secilen filtrelere gore etkinlik sonuclari bu panelde listelenir.'
                          : 'Kullanici sonuclari burada tek bir akista gorunur.'}
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
                            Kullanicilar
                          </Text>
                          <Text className="text-sm" style={{ color: colors.textSecondary }}>
                            {profileResults.length} sonuc
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
                                    router.push(`/profile/${profile.accountId}`);
                                  }}>
                                  {profile.profilePhoto ? (
                                    <Image
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
                                Kullanici bulunamadi.
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
                            {searchedEvents.length} sonuc
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
                                Etkinlik bulunamadi.
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
          </SafeAreaView>
        </View>
      ) : null}

      <Modal animationType="slide" transparent visible={isFilterModalOpen}>
        <Pressable className="flex-1 justify-end bg-black/35" onPress={() => setIsFilterModalOpen(false)}>
          <View className="rounded-t-3xl bg-white px-5 py-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">Gelismis Filtreler</Text>
              <View className="rounded-full bg-slate-100 px-3 py-1">
                <Text className="text-xs font-semibold text-slate-700">{activeFilterCount} aktif</Text>
              </View>
            </View>

            <Text className="mb-2 text-sm font-medium text-slate-700">Sehir</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-4">
              {CITY_OPTIONS.map((city) => {
                const isSelected = selectedCity === city;
                return (
                  <Pressable
                    key={city}
                    className={cn(
                      'rounded-full border px-4 py-2',
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-white'
                    )}
                    onPress={() => setSelectedCity(isSelected ? undefined : city)}>
                    <Text className={cn('text-sm', isSelected ? 'text-white' : 'text-slate-700')}>
                      {city}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text className="mb-2 text-sm font-medium text-slate-700">Ucret Durumu</Text>
            <View className="mb-4 flex-row gap-2">
              {(['all', 'free', 'paid'] as PriceFilter[]).map((price) => {
                const isSelected = priceFilter === price;
                const label = price === 'all' ? 'Tumu' : price === 'free' ? 'Ucretsiz' : 'Ucretli';

                return (
                  <Pressable
                    key={price}
                    className={cn(
                      'rounded-full border px-4 py-2',
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-white'
                    )}
                    onPress={() => setPriceFilter(price)}>
                    <Text className={cn('text-sm', isSelected ? 'text-white' : 'text-slate-700')}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-2 text-sm font-medium text-slate-700">Coklu Etiket Eslesmesi</Text>
            <Pressable
              className={cn(
                'mb-5 rounded-xl border px-4 py-3',
                matchAllTags ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
              )}
              onPress={() => setMatchAllTags((current) => !current)}>
              <Text className="text-sm text-slate-700">
                {matchAllTags
                  ? 'Secilen tum etiketler eslessin'
                  : 'Secilen etiketlerden herhangi biri eslessin'}
              </Text>
            </Pressable>

            <View className="flex-row gap-3">
              <Button
                className="flex-1"
                variant="secondary"
                label="Temizle"
                onPress={resetFilters}
              />
              <Button
                className="flex-1"
                label="Uygula"
                onPress={() => setIsFilterModalOpen(false)}
              />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={isRecommendationModalOpen}
        onRequestClose={() => setIsRecommendationModalOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/35" onPress={() => setIsRecommendationModalOpen(false)}>
          <View className="max-h-[78%] rounded-t-3xl bg-white px-5 py-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">Sana Ozel Oneri</Text>
            </View>

            {suggestedEvent ? (
              <View className="pb-4">
                <EventRowCard
                  event={suggestedEvent}
                  onPress={(eventId) => {
                    setIsRecommendationModalOpen(false);
                    router.push(`/event/${eventId}`);
                  }}
                />
              </View>
            ) : (
              <View className="pb-4">
                <Text className="text-sm text-slate-500">Su an icin bir oneri bulunamadi.</Text>
              </View>
            )}

            <Button label="Kapat" variant="secondary" onPress={() => setIsRecommendationModalOpen(false)} />
          </View>
        </Pressable>
      </Modal>

      <View className="pointer-events-box-none absolute bottom-24 left-4 right-4 z-40">
        <View className="pointer-events-box-none flex-row justify-start">
          <Pressable
            className={cn(
              'rounded-full bg-blue-600 px-5 py-3 shadow-sm',
              (dailyRecommendationMutation.isPending || !canLoadRecommended) && 'bg-blue-400'
            )}
            onPress={handleSuggestEventsPress}
            disabled={dailyRecommendationMutation.isPending || !canLoadRecommended}>
            <Text className="text-sm font-semibold text-white">
              {dailyRecommendationMutation.isPending ? 'Oneriler hazirlaniyor...' : 'Bana Etkinlik Oner'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
