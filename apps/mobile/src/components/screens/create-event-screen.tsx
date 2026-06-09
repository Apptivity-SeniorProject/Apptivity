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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import { Calendar, Clock, MapPin, ImagePlus } from 'lucide-react-native';

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

const MIN_EVENT_TAGS = 1;
const MAX_EVENT_TAGS = 5;

function createInitialScheduledAt() {
  const now = new Date();
  now.setHours(now.getHours() + 2, 0, 0, 0);
  return now;
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
  const [scheduledAt, setScheduledAt] = useState(() => createInitialScheduledAt());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [durationMinutes, setDurationMinutes] = useState('120');
  const [capacity, setCapacity] = useState('20');
  const [price, setPrice] = useState('0');
  const [locationDescription, setLocationDescription] = useState('');
  const [resolvedCity, setResolvedCity] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
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
    setSelectedTagIds((current) => {
      if (current.includes(tagId)) {
        return current.filter((id) => id !== tagId);
      }

      if (current.length >= MAX_EVENT_TAGS) {
        toast.error(`En fazla ${MAX_EVENT_TAGS} kategori secebilirsiniz.`);
        return current;
      }

      return [...current, tagId];
    });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setScheduledAt(createInitialScheduledAt());
    setShowDatePicker(false);
    setShowTimePicker(false);
    setDurationMinutes('120');
    setCapacity('20');
    setPrice('0');
    setLocationDescription('');
    setResolvedCity('');
    setResolvedAddress('');
    setSelectedCoordinate(null);
    setIsMapModalOpen(false);
    setMapRegion(DEFAULT_REGION);
    setMapDraftCoordinate(null);
    setIsResolvingLocation(false);
    setSelectedImages([]);
    setSelectedTagIds([]);
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

      const derivedCity = geo.city ?? geo.subregion ?? geo.region;
      if (derivedCity) {
        setResolvedCity(derivedCity);
      }

      const address = [geo.street, geo.name, geo.district, geo.subregion, geo.city]
        .filter((part): part is string => Boolean(part))
        .join(', ');
      if (address) {
        setResolvedAddress(address);
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



    if (selectedTagIds.length < MIN_EVENT_TAGS || selectedTagIds.length > MAX_EVENT_TAGS) {
      return {
        isValid: false,
        message: `En az ${MIN_EVENT_TAGS}, en fazla ${MAX_EVENT_TAGS} kategori secmelisiniz.`,
      };
    }

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
        city: resolvedCity.trim(),
        fullAddress: resolvedAddress.trim(),
        locationLabel: locationDescription.trim() || resolvedAddress.trim(),
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

      resetForm();
      router.push({
        pathname: '/event/[id]',
        params: { id: eventId, returnToHome: '1' },
      });
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
        <Text className="text-xl font-sans-bold text-gray-900 tracking-tight">Yeni Etkinlik</Text>
        <Text className="mt-0.5 text-xs text-gray-400 font-sans">
          Tarih ve saat seçimi takvimden yapılır, konum haritadan işaretlenir.
        </Text>

        <View className="mt-6 gap-5">
          {/* Temel Bilgiler Section */}
          <View>
            <Text className="text-caption font-sans-bold uppercase tracking-widest text-gray-400 mb-2">
              Temel Bilgiler
            </Text>
            <View className="gap-2.5">
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Etkinlik başlığı"
                className="border-[1.5px] border-surface-tertiary rounded-button bg-surface-secondary text-base text-gray-900"
              />
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Açıklama — etkinliğin detaylarını girin..."
                multiline
                numberOfLines={4}
                className="border-[1.5px] border-surface-tertiary rounded-button bg-surface-secondary min-h-24 py-3 text-base text-gray-900"
              />
            </View>
          </View>

          {/* Zaman Section */}
          <View>
            <Text className="text-caption font-sans-bold uppercase tracking-widest text-gray-400 mb-2">
              Zaman
            </Text>
            <View className="flex-row gap-2.5">
              <Pressable
                className="flex-1 rounded-button border-[1.5px] border-surface-tertiary bg-surface-secondary px-3.5 py-3"
                onPress={() => setShowDatePicker(true)}>
                <Text className="text-caption font-sans text-gray-400 mb-1">Tarih</Text>
                <View className="flex-row items-center gap-1.5">
                  <Calendar size={16} color="#77e349" />
                  <Text className="text-base font-sans text-gray-900">{formattedDate}</Text>
                </View>
              </Pressable>

              <Pressable
                className="flex-1 rounded-button border-[1.5px] border-surface-tertiary bg-surface-secondary px-3.5 py-3"
                onPress={() => setShowTimePicker(true)}>
                <Text className="text-caption font-sans text-gray-400 mb-1">Saat</Text>
                <View className="flex-row items-center gap-1.5">
                  <Clock size={16} color="#77e349" />
                  <Text className="text-base font-sans text-gray-900">{formattedTime}</Text>
                </View>
              </Pressable>
            </View>
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

          {/* Kapasite Section */}
          <View>
            <Text className="text-caption font-sans-bold uppercase tracking-widest text-gray-400 mb-2">
              Kapasite
            </Text>
            <View className="flex-row gap-2.5">
              <View className="flex-1 rounded-button border-[1.5px] border-surface-tertiary bg-surface-secondary px-3.5 py-2">
                <Text className="text-caption font-sans-semibold text-gray-400 mb-1">Süre (dk)</Text>
                <TextInput
                  className="p-0 font-sans-bold text-base text-gray-900"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  keyboardType="numeric"
                />
              </View>

              <View className="flex-1 rounded-button border-[1.5px] border-surface-tertiary bg-surface-secondary px-3.5 py-2">
                <Text className="text-caption font-sans-semibold text-gray-400 mb-1">Kontenjan</Text>
                <TextInput
                  className="p-0 font-sans-bold text-base text-gray-900"
                  value={capacity}
                  onChangeText={setCapacity}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Ücret Section */}
          <View>
            <Text className="text-caption font-sans-bold uppercase tracking-widest text-gray-400 mb-2">
              Ücret
            </Text>
            <View className="flex-row items-center justify-between rounded-button border-[1.5px] border-surface-tertiary bg-surface-secondary px-3.5 py-3">
              <View className="flex-row items-center gap-1.5 flex-1">
                <Text className="font-sans-semibold text-base text-gray-400">₺</Text>
                <TextInput
                  className="p-0 font-sans-bold text-base text-gray-900 flex-1"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              {!price || Number(price) === 0 ? (
                <View className="rounded-full bg-primary-50 px-2.5 py-1">
                  <Text className="text-caption font-sans-bold text-primary-700">Ücretsiz</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Konum Section */}
          <View>
            <Text className="text-caption font-sans-bold uppercase tracking-widest text-gray-400 mb-2">
              Konum
            </Text>
            <View className="rounded-button border-[1.5px] border-surface-tertiary bg-surface-secondary p-3.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5 flex-1">
                  <View className="w-8 h-8 rounded-button bg-primary-50 items-center justify-center">
                    <MapPin size={16} color="#44a31e" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-bold text-sm text-gray-900">Harita Konumu</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {selectedCoordinate
                        ? resolvedAddress || `${selectedCoordinate.latitude.toFixed(6)}, ${selectedCoordinate.longitude.toFixed(6)}`
                        : 'Henüz seçilmedi'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  className="bg-primary px-3 py-2 rounded-button"
                  onPress={openMapPicker}>
                  <Text className="font-sans-bold text-xs text-primary-950">
                    {selectedCoordinate ? 'Konumu Güncelle' : 'Haritadan Seç'}
                  </Text>
                </Pressable>
              </View>

              {selectedCoordinate ? (
                <TextInput
                  className="mt-3 bg-white border-[1.5px] border-gray-200 rounded-button px-3 py-2.5 font-sans text-sm text-gray-900"
                  value={locationDescription}
                  onChangeText={setLocationDescription}
                  placeholder="Konum açıklaması (ör. Binanın arkası, 3. kat)"
                  placeholderTextColor="#C4C9D1"
                />
              ) : null}
            </View>
          </View>

          {/* Kategoriler Section */}
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-caption font-sans-bold uppercase tracking-widest text-gray-400">
                Kategoriler
              </Text>
              <Text className="text-xs text-gray-400 font-sans">
                {selectedTagIds.length} / {MAX_EVENT_TAGS} seçildi
              </Text>
            </View>
            {categories.length ? (
              <CategorySelector
                categories={categories}
                selectedIds={selectedTagIds}
                onToggle={(category) => toggleTag(category.id)}
              />
            ) : (
              <View className="rounded-button border-[1.5px] border-surface-tertiary bg-surface-secondary p-3.5">
                <Text className="text-sm text-gray-500 font-sans">Kategori listesi yükleniyor...</Text>
              </View>
            )}
          </View>

          {/* Fotoğraflar Section */}
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-caption font-sans-bold uppercase tracking-widest text-gray-400">
                Fotoğraflar
              </Text>
              <Text className="text-xs text-gray-400 font-sans">
                {selectedImages.length} / 3 seçildi
              </Text>
            </View>

            <Pressable
              className="border-dashed border-2 border-gray-200 bg-[#FAFAFA] rounded-card py-6 items-center justify-center gap-1.5"
              onPress={selectPhotos}>
              <ImagePlus size={24} color="#C4C9D1" />
              <Text className="text-sm font-sans-medium text-gray-400">Galeriden fotoğraf seç</Text>
              <Text className="text-caption text-gray-300 font-sans">PNG, JPG — maks. 3 fotoğraf</Text>
            </Pressable>

            {selectedImages.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 mt-3">
                {selectedImages.map((asset, index) => (
                  <View key={`${asset.assetId ?? asset.uri}-${index}`} className="relative rounded-button overflow-hidden">
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

          {/* Submit Button */}
          <Button
            label="Etkinliği Oluştur"
            isLoading={createMutation.isPending}
            onPress={onSubmit}
            className="bg-primary rounded-button h-14 mt-4"
            textClassName="text-primary-950 font-sans-extrabold"
          />
        </View>
      </ScrollView>

      <Modal visible={isMapModalOpen} transparent animationType="slide" onRequestClose={() => setIsMapModalOpen(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <View className="rounded-t-3xl bg-white px-4 pb-5 pt-4">
            <Text className="text-lg font-semibold text-slate-900">Haritadan Konum Seç</Text>
            <Text className="mt-1 text-sm text-slate-500">Haritada istediğin noktaya dokunup pin bırak.</Text>

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
                label="İptal"
                variant="secondary"
                className="flex-1 border-[1.5px] border-surface-tertiary bg-surface-secondary rounded-button"
                onPress={() => setIsMapModalOpen(false)}
              />
              <Button
                label="Konumu Kaydet"
                className="flex-1 bg-primary rounded-button"
                textClassName="text-primary-950 font-sans-bold"
                onPress={confirmMapSelection}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

