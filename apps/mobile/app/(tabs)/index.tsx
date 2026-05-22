import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { EventCard } from '@/src/components/events/event-card';
import { EventCardSkeleton } from '@/src/components/events/event-card-skeleton';
import { SearchBar } from '@/src/components/events/search-bar';
import { CategorySelector } from '@/src/components/events/category-selector';
import { Button } from '@/src/components/ui/button';
import { CITY_OPTIONS } from '@/src/constants/events';
import { useEvents, useRecommendedEvents } from '@/src/hooks/useEvents';
import { useTags } from '@/src/hooks/useTags';
import { cn } from '@/src/utils/cn';

type PriceFilter = 'all' | 'free' | 'paid';
type CategoryOption = { id: string; name: string };

const ALL_CATEGORY_ID = 'all';

export default function HomeScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([ALL_CATEGORY_ID]);
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [matchAllTags, setMatchAllTags] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const { data: tags } = useTags();

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
    }, 350);

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
  } = useEvents({
    searchTerm: debouncedSearchTerm || undefined,
    city: selectedCity,
    tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
    isPaid,
    matchAllTags,
    pageSize: 10,
  });

  const recommendedQuery = useRecommendedEvents(8);

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

  const renderHeader = () => {
    return (
      <View className="gap-4 pb-5">
        <Text className="text-3xl font-bold text-slate-900">Etkinlikleri Kesfet</Text>

        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          onFilterPress={() => setIsFilterModalOpen(true)}
        />

        <CategorySelector
          categories={categories}
          selectedIds={selectedTagIds}
          onToggle={toggleCategory}
        />

        <View className="mt-2 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-slate-900">Senin Icin</Text>
          </View>

          {recommendedQuery.isPending ? (
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
              <Text className="text-sm text-slate-500">Sana ozel oneriler yakinda burada gorunecek.</Text>
            </View>
          )}
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-slate-900">Genel Akis</Text>
          <Text className="text-sm text-slate-500">{events.length} sonuc</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {isPending ? (
        <View className="gap-4 px-4 pt-6">
          {renderHeader()}
          {Array.from({ length: 3 }).map((_, index) => (
            <EventCardSkeleton key={`skeleton-${index}`} />
          ))}
        </View>
      ) : (
        <FlatList
          contentContainerClassName="px-4 pb-8 pt-6"
          data={events}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <View className="mb-4">
              <EventCard event={item} onPress={(eventId) => router.push(`/event/${eventId}`)} />
            </View>
          )}
          ListEmptyComponent={
            <View className="mt-16 items-center justify-center">
              <Text className="text-base text-slate-500">Etkinlik bulunamadi</Text>
            </View>
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
      )}

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
                    <Text className={cn('text-sm', isSelected ? 'text-white' : 'text-slate-700')}>{city}</Text>
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
                    <Text className={cn('text-sm', isSelected ? 'text-white' : 'text-slate-700')}>{label}</Text>
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
    </SafeAreaView>
  );
}
