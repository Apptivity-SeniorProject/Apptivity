import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';

import { createEvent, uploadEventPhoto } from '@/src/api/eventService';
import { CategorySelector } from '@/src/components/events/category-selector';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useToast } from '@/src/hooks/useToast';
import { useTags } from '@/src/hooks/useTags';
import type { CreateEventPayload } from '@/src/types/event';
import { getApiErrorMessage } from '@/src/utils/error';

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

interface CreateEventMutationResult {
  eventId: string;
  bannerUploadErrorMessage?: string;
}

const DEFAULT_REGION: Region = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export function CreateEventScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 2, 0, 0, 0);
    return now;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [durationMinutes, setDurationMinutes] = useState('120');
  const [capacity, setCapacity] = useState('20');
  const [price, setPrice] = useState('0');
  const [city, setCity] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [selectedCoordinate, setSelectedCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [mapDraftCoordinate, setMapDraftCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: tags } = useTags();

  const categories = useMemo(
    () => (tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
    [tags]
  );

  const formattedDate = useMemo(() => format(scheduledAt, 'dd.MM.yyyy'), [scheduledAt]);
  const formattedTime = useMemo(() => format(scheduledAt, 'HH:mm'), [scheduledAt]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  };

  const selectPhotos = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      toast.error('Fotograf secimi icin galeri izni vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 3,
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    const nextAssets = result.assets.slice(0, 3);
    setSelectedImages(nextAssets);
  };

  const removePhoto = (index: number) => {
    setSelectedImages((current) => current.filter((_, i) => i !== index));
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (event.type !== 'set' || !selectedDate) {
      return;
    }

    setScheduledAt((previous) => {
      const next = new Date(previous);
      next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      return next;
    });
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(false);

    if (event.type !== 'set' || !selectedTime) {
      return;
    }

    setScheduledAt((previous) => {
      const next = new Date(previous);
      next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      return next;
    });
  };

  const openMapPicker = async () => {
    setIsMapModalOpen(true);

    if (selectedCoordinate) {
      setMapDraftCoordinate(selectedCoordinate);
      setMapRegion({
        latitude: selectedCoordinate.latitude,
        longitude: selectedCoordinate.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
      return;
    }

    setIsResolvingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        toast.error('Haritadan konum secmek icin konum izni vermelisiniz.');
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinate = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      };

      setMapDraftCoordinate(coordinate);
      setMapRegion({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    } catch {
      toast.error('Konum bilgisi alinamadi. Haritadan manuel isaretleyebilirsiniz.');
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    setMapDraftCoordinate(event.nativeEvent.coordinate);
  };

  const confirmMapSelection = async () => {
    if (!mapDraftCoordinate) {
      toast.error('Lutfen haritadan bir konum secin.');
      return;
    }

    setSelectedCoordinate(mapDraftCoordinate);
    setIsMapModalOpen(false);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        return;
      }

      const reverseResult = await Location.reverseGeocodeAsync(mapDraftCoordinate);
      const geo = reverseResult[0];

      if (!geo) {
        return;
      }

      if (!city.trim()) {
        const derivedCity = geo.city ?? geo.subregion ?? geo.region;
        if (derivedCity) {
          setCity(derivedCity);
        }
      }

      if (!fullAddress.trim()) {
        const address = [geo.street, geo.name, geo.district, geo.subregion, geo.city]
          .filter((part): part is string => Boolean(part))
          .join(', ');

        if (address) {
          setFullAddress(address);
        }
      }

      if (!locationLabel.trim()) {
        const label = geo.name ?? geo.street ?? geo.city;
        if (label) {
          setLocationLabel(label);
        }
      }
    } catch {
      // Reverse geocode basarisiz olsa da koordinat secimi gecerli.
    }
  };

  const validate = (): ValidationResult => {
    if (!name.trim()) return { isValid: false, message: 'Etkinlik basligi zorunludur.' };
    if (!description.trim()) return { isValid: false, message: 'Etkinlik aciklamasi zorunludur.' };

    if (scheduledAt.getTime() <= Date.now()) {
      return { isValid: false, message: 'Etkinlik tarihi ve saati gelecekte olmalidir.' };
    }

    const duration = Number(durationMinutes);
    if (!Number.isInteger(duration) || duration <= 0) {
      return { isValid: false, message: 'Sure dakikasi 0dan buyuk olmali.' };
    }

    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap <= 0) {
      return { isValid: false, message: 'Kontenjan 0dan buyuk olmali.' };
    }

    const priceValue = Number(price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      return { isValid: false, message: 'Ucret 0 veya daha buyuk olmali.' };
    }

    if (!selectedCoordinate) {
      return { isValid: false, message: 'Konumu harita uzerinden secmelisiniz.' };
    }

    if (!city.trim()) return { isValid: false, message: 'Sehir zorunludur.' };
    if (!fullAddress.trim()) return { isValid: false, message: 'Acik adres zorunludur.' };

    if (selectedImages.length < 1 || selectedImages.length > 3) {
      return { isValid: false, message: 'En az 1, en fazla 3 fotograf secmelisiniz.' };
    }

    return { isValid: true };
  };

  const createMutation = useMutation({
    mutationFn: async (): Promise<CreateEventMutationResult> => {
      if (!selectedCoordinate) {
        throw new Error('Konum secilmedi.');
      }

      const locationData = JSON.stringify({
        city: city.trim(),
        fullAddress: fullAddress.trim(),
        locationLabel: locationLabel.trim() || fullAddress.trim(),
        lat: selectedCoordinate.latitude,
        lng: selectedCoordinate.longitude,
      });

      const payload: CreateEventPayload = {
        name: name.trim(),
        description: description.trim(),
        date: format(scheduledAt, 'yyyy-MM-dd'),
        time: format(scheduledAt, 'HH:mm'),
        durationMinutes: Number(durationMinutes),
        capacity: Number(capacity),
        price: Number(price),
        locationData,
        primaryTagId: selectedTagIds[0],
        tagIds: selectedTagIds.length ? selectedTagIds : undefined,
      };

      const event = await createEvent(payload);

      if (selectedImages.length === 0) {
        throw new Error('Fotograf secimi zorunludur.');
      }

      try {
        await Promise.all(
          selectedImages.map((image, index) =>
            uploadEventPhoto(event.id, index + 1, {
              uri: image.uri,
              fileName: image.fileName,
              mimeType: image.mimeType,
            })
          )
        );
        return { eventId: event.id };
      } catch (error) {
        return {
          eventId: event.id,
          bannerUploadErrorMessage: getApiErrorMessage(
            error,
            'Etkinlik olusturuldu fakat bazi fotograflar yuklenemedi.'
          ),
        };
      }
    },
    onSuccess: async ({ eventId, bannerUploadErrorMessage }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['recommended-events'] }),
        queryClient.invalidateQueries({ queryKey: ['my-events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] }),
      ]);

      if (bannerUploadErrorMessage) {
        toast.info(bannerUploadErrorMessage);
      } else {
        toast.success('Etkinlik olusturuldu.');
      }

      router.push(`/event/${eventId}`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Etkinlik olusturulamadi.'));
    },
  });

  const onSubmit = () => {
    const result = validate();
    if (!result.isValid) {
      toast.error(result.message ?? 'Lutfen formu kontrol edin.');
      return;
    }

    createMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="px-4 pb-16 pt-6">
        <Text className="text-2xl font-bold text-slate-900">Yeni Etkinlik</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Tarih ve saat secimi takvimden yapilir, konum haritadan isaretlenir.
        </Text>

        <View className="mt-6 gap-4">
          <Input
            label="Etkinlik Basligi"
            value={name}
            onChangeText={setName}
            placeholder="Ornek: Hafta Sonu Kampi"
          />

          <Input
            label="Aciklama"
            value={description}
            onChangeText={setDescription}
            placeholder="Etkinligin detaylarini girin"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="h-28 py-3"
          />

          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3"
              onPress={() => setShowDatePicker(true)}>
              <Text className="mb-1 text-xs font-medium text-slate-500">Tarih</Text>
              <Text className="text-base font-semibold text-slate-900">{formattedDate}</Text>
            </Pressable>

            <Pressable
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3"
              onPress={() => setShowTimePicker(true)}>
              <Text className="mb-1 text-xs font-medium text-slate-500">Saat</Text>
              <Text className="text-base font-semibold text-slate-900">{formattedTime}</Text>
            </Pressable>
          </View>

          {showDatePicker ? (
            <DateTimePicker
              value={scheduledAt}
              mode="date"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          ) : null}

          {showTimePicker ? (
            <DateTimePicker
              value={scheduledAt}
              mode="time"
              is24Hour
              onChange={handleTimeChange}
            />
          ) : null}

          <View className="flex-row gap-3">
            <Input
              label="Sure (Dakika)"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="numeric"
              containerClassName="flex-1"
            />
            <Input
              label="Kontenjan"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
              containerClassName="flex-1"
            />
          </View>

          <Input
            label="Ucret"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          <View className="rounded-2xl border border-slate-200 bg-white p-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-slate-700">Harita Konumu</Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {selectedCoordinate
                    ? `${selectedCoordinate.latitude.toFixed(6)}, ${selectedCoordinate.longitude.toFixed(6)}`
                    : 'Henüz secilmedi'}
                </Text>
              </View>
              <Button
                label={selectedCoordinate ? 'Konumu Guncelle' : 'Haritadan Sec'}
                variant="secondary"
                className="h-10 px-4"
                onPress={openMapPicker}
              />
            </View>
          </View>

          <Input
            label="Sehir"
            value={city}
            onChangeText={setCity}
            placeholder="Istanbul"
          />

          <Input
            label="Acik Adres"
            value={fullAddress}
            onChangeText={setFullAddress}
            placeholder="Mahalle, cadde, bina no"
          />

          <Input
            label="Konum Etiketi (Opsiyonel)"
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Ornek: Kadikoy Iskele"
          />

          <View>
            <Text className="mb-2 text-sm font-medium text-slate-700">Kategoriler (Opsiyonel)</Text>
            {categories.length ? (
              <CategorySelector
                categories={categories}
                selectedIds={selectedTagIds}
                onToggle={(category) => toggleTag(category.id)}
              />
            ) : (
              <View className="rounded-2xl border border-slate-200 bg-white p-3">
                <Text className="text-sm text-slate-500">Kategori listesi yukleniyor.</Text>
              </View>
            )}
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-slate-700">Fotograflar</Text>
              <Text className="text-xs text-slate-500">{selectedImages.length}/3 secildi</Text>
            </View>

            <Button label="Galeriden Fotograf Sec" variant="secondary" onPress={selectPhotos} />

            {selectedImages.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
                {selectedImages.map((asset, index) => (
                  <View key={`${asset.assetId ?? asset.uri}-${index}`} className="relative">
                    <Image
                      source={{ uri: asset.uri }}
                      style={{ width: 110, height: 110 }}
                      contentFit="cover"
                      transition={120}
                    />
                    <Pressable
                      className="absolute right-1 top-1 rounded-full bg-black/65 px-2 py-1"
                      onPress={() => removePhoto(index)}>
                      <Text className="text-xs font-semibold text-white">Sil</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <Button label="Etkinligi Olustur" isLoading={createMutation.isPending} onPress={onSubmit} />
        </View>
      </ScrollView>

      <Modal visible={isMapModalOpen} transparent animationType="slide" onRequestClose={() => setIsMapModalOpen(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <View className="rounded-t-3xl bg-white px-4 pb-5 pt-4">
            <Text className="text-lg font-semibold text-slate-900">Haritadan Konum Sec</Text>
            <Text className="mt-1 text-sm text-slate-500">Haritada istedigin noktaya dokunup pin birak.</Text>

            <View className="mt-3 overflow-hidden rounded-2xl border border-slate-200" style={{ height: 320 }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={mapRegion}
                region={mapRegion}
                onRegionChangeComplete={setMapRegion}
                onPress={handleMapPress}
                showsUserLocation>
                {mapDraftCoordinate ? <Marker coordinate={mapDraftCoordinate} /> : null}
              </MapView>

              {isResolvingLocation ? (
                <View className="absolute inset-0 items-center justify-center bg-white/70">
                  <ActivityIndicator color="#0f172a" />
                </View>
              ) : null}
            </View>

            <View className="mt-3 flex-row gap-3">
              <Button
                label="Iptal"
                variant="secondary"
                className="flex-1"
                onPress={() => setIsMapModalOpen(false)}
              />
              <Button label="Konumu Kaydet" className="flex-1" onPress={confirmMapSelection} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

