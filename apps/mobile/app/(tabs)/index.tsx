import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CategorySelector } from '@/src/components/events/category-selector';
import { EventCard } from '@/src/components/events/event-card';
import { EventCardSkeleton } from '@/src/components/events/event-card-skeleton';
import { SearchBar } from '@/src/components/events/search-bar';
import { Button } from '@/src/components/ui/button';
import { CITY_OPTIONS } from '@/src/constants/events';
import { cn } from '@/src/utils/cn';
import { useEvents } from '@/src/hooks/useEvents';
import { useTags } from '@/src/hooks/useTags';

type PriceFilter = 'all' | 'free' | 'paid';
type CategoryOption = { id: string; name: string };

export default function HomeScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(undefined);
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

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

  const { events, isPending, isRefetching, hasNextPage, fetchNextPage, isFetchingNextPage, refresh } =
    useEvents({
      searchTerm: debouncedSearchTerm || undefined,
      city: selectedCity,
      tagId: selectedTagId,
      isPaid,
      pageSize: 10,
    });

  const handleCategorySelect = (category: CategoryOption) => {
    setSelectedCategoryId(category.id);
    setSelectedTagId(category.id === 'all' ? undefined : category.id);
  };

  const renderHeader = () => {
    return (
      <View className="gap-4 pb-4">
        <Text className="text-3xl font-bold text-slate-900">Etkinlikleri Keşfet</Text>

        <SearchBar value={searchInput} onChangeText={setSearchInput} />

        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="rounded-xl border border-slate-200 bg-white px-4 py-2"
            onPress={() => setIsCityModalOpen(true)}>
            <Text className="text-sm font-medium text-slate-700">
              {selectedCity ? `Şehir: ${selectedCity}` : 'Şehir Seç'}
            </Text>
          </TouchableOpacity>

          {selectedCity ? (
            <Pressable onPress={() => setSelectedCity(undefined)}>
              <Text className="text-sm font-medium text-red-500">Temizle</Text>
            </Pressable>
          ) : null}
        </View>

        <CategorySelector
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={handleCategorySelect}
        />

        <View className="flex-row gap-2">
          <Pressable
            className={cn(
              'rounded-full border px-4 py-2',
              priceFilter === 'all' ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-white'
            )}
            onPress={() => setPriceFilter('all')}>
            <Text className={cn('text-sm', priceFilter === 'all' ? 'text-white' : 'text-slate-700')}>Tümü</Text>
          </Pressable>
          <Pressable
            className={cn(
              'rounded-full border px-4 py-2',
              priceFilter === 'free' ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-white'
            )}
            onPress={() => setPriceFilter('free')}>
            <Text className={cn('text-sm', priceFilter === 'free' ? 'text-white' : 'text-slate-700')}>Ücretsiz</Text>
          </Pressable>
          <Pressable
            className={cn(
              'rounded-full border px-4 py-2',
              priceFilter === 'paid' ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-white'
            )}
            onPress={() => setPriceFilter('paid')}>
            <Text className={cn('text-sm', priceFilter === 'paid' ? 'text-white' : 'text-slate-700')}>Ücretli</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {isPending ? (
        <View className="gap-4 px-4 pt-6">
          {renderHeader()}
          {Array.from({ length: 4 }).map((_, index) => (
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
              <Text className="text-base text-slate-500">Etkinlik bulunamadı</Text>
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

      <Modal animationType="slide" transparent visible={isCityModalOpen}>
        <Pressable className="flex-1 justify-end bg-black/30" onPress={() => setIsCityModalOpen(false)}>
          <View className="rounded-t-3xl bg-white px-5 py-5">
            <Text className="mb-4 text-lg font-semibold text-slate-900">Şehir Seç</Text>
            <View className="gap-2">
              {CITY_OPTIONS.map((city) => (
                <Button
                  key={city}
                  label={city}
                  className={cn('bg-slate-100', selectedCity === city && 'bg-blue-600')}
                  textClassName={cn('text-slate-800', selectedCity === city && 'text-white')}
                  onPress={() => {
                    setSelectedCity(city);
                    setIsCityModalOpen(false);
                  }}
                />
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
  const { data: tags } = useTags();

  const categories = useMemo<CategoryOption[]>(() => {
    const dynamicCategories = (tags ?? []).map((tag) => ({
      id: tag.id,
      name: tag.name,
    }));

    return [{ id: 'all', name: 'Tumu' }, ...dynamicCategories];
  }, [tags]);
