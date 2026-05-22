import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { createEvent } from '@/src/api/eventService';
import { CategorySelector } from '@/src/components/events/category-selector';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useToast } from '@/src/hooks/useToast';
import { useTags } from '@/src/hooks/useTags';
import type { CreateEventPayload } from '@/src/types/event';
import { getApiErrorMessage } from '@/src/utils/error';

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function CreateEventScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('120');
  const [capacity, setCapacity] = useState('20');
  const [price, setPrice] = useState('0');
  const [city, setCity] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>(['']);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: tags } = useTags();

  const categories = useMemo(
    () => (tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
    [tags]
  );

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  };

  const addPhotoInput = () => {
    setPhotoUrls((current) => {
      if (current.length >= 3) {
        return current;
      }
      return [...current, ''];
    });
  };

  const removePhotoInput = (index: number) => {
    setPhotoUrls((current) => {
      if (current.length <= 1) {
        return current;
      }
      return current.filter((_, i) => i !== index);
    });
  };

  const updatePhotoUrl = (index: number, value: string) => {
    setPhotoUrls((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const validate = (): ValidationResult => {
    if (!name.trim()) return { isValid: false, message: 'Etkinlik basligi zorunludur.' };
    if (!description.trim()) return { isValid: false, message: 'Etkinlik aciklamasi zorunludur.' };
    if (!isValidDate(date.trim())) return { isValid: false, message: 'Tarih formati YYYY-AA-GG olmali.' };
    if (!isValidTime(time.trim())) return { isValid: false, message: 'Saat formati SS:DD olmali.' };

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

    if (!city.trim()) return { isValid: false, message: 'Sehir zorunludur.' };
    if (!fullAddress.trim()) return { isValid: false, message: 'Acik adres zorunludur.' };

    const normalizedPhotos = photoUrls.map((item) => item.trim()).filter(Boolean);
    if (normalizedPhotos.length < 1 || normalizedPhotos.length > 3) {
      return { isValid: false, message: 'En az 1, en fazla 3 fotograf URL zorunludur.' };
    }

    const invalidPhoto = normalizedPhotos.find((item) => !isValidUrl(item));
    if (invalidPhoto) {
      return { isValid: false, message: 'Fotograf URLleri gecerli bir http/https adresi olmali.' };
    }

    if ((latitude.trim() && !longitude.trim()) || (!latitude.trim() && longitude.trim())) {
      return { isValid: false, message: 'Konum icin enlem ve boylam birlikte girilmeli.' };
    }

    if (latitude.trim() && longitude.trim()) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { isValid: false, message: 'Enlem ve boylam sayisal olmali.' };
      }
    }

    return { isValid: true };
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const normalizedPhotos = photoUrls.map((item) => item.trim()).filter(Boolean);
      const lat = latitude.trim() ? Number(latitude.trim()) : undefined;
      const lng = longitude.trim() ? Number(longitude.trim()) : undefined;

      const locationData = JSON.stringify({
        city: city.trim(),
        fullAddress: fullAddress.trim(),
        locationLabel: locationLabel.trim() || fullAddress.trim(),
        lat,
        lng,
        imageUrls: normalizedPhotos,
      });

      const payload: CreateEventPayload = {
        name: name.trim(),
        description: description.trim(),
        date: date.trim(),
        time: time.trim(),
        durationMinutes: Number(durationMinutes),
        capacity: Number(capacity),
        price: Number(price),
        locationData,
        primaryTagId: selectedTagIds[0],
        tagIds: selectedTagIds.length ? selectedTagIds : undefined,
      };

      return createEvent(payload);
    },
    onSuccess: async (event) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['recommended-events'] }),
        queryClient.invalidateQueries({ queryKey: ['my-events'] }),
      ]);

      toast.success('Etkinlik olusturuldu.');
      router.push(`/event/${event.id}`);
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
          Tum zorunlu alanlari doldurun. Fotograf sayisi min 1, max 3 olmalidir.
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
            <Input
              label="Tarih (YYYY-AA-GG)"
              value={date}
              onChangeText={setDate}
              placeholder="2026-06-15"
              containerClassName="flex-1"
            />
            <Input
              label="Saat (SS:DD)"
              value={time}
              onChangeText={setTime}
              placeholder="19:30"
              containerClassName="flex-1"
            />
          </View>

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

          <View className="flex-row gap-3">
            <Input
              label="Enlem (Opsiyonel)"
              value={latitude}
              onChangeText={setLatitude}
              placeholder="40.99"
              keyboardType="decimal-pad"
              containerClassName="flex-1"
            />
            <Input
              label="Boylam (Opsiyonel)"
              value={longitude}
              onChangeText={setLongitude}
              placeholder="29.03"
              keyboardType="decimal-pad"
              containerClassName="flex-1"
            />
          </View>

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
              <Text className="text-sm font-medium text-slate-700">Fotograflar (URL)</Text>
              <Text className="text-xs text-slate-500">{photoUrls.length}/3</Text>
            </View>

            {photoUrls.map((url, index) => (
              <View key={`photo-url-${index}`} className="flex-row items-end gap-2">
                <Input
                  label={`Fotograf URL ${index + 1}`}
                  value={url}
                  onChangeText={(value) => updatePhotoUrl(index, value)}
                  placeholder="https://..."
                  containerClassName="flex-1"
                />
                {photoUrls.length > 1 ? (
                  <Pressable
                    className="mb-2 h-12 items-center justify-center rounded-xl border border-slate-300 px-3"
                    onPress={() => removePhotoInput(index)}>
                    <Text className="text-sm font-semibold text-slate-700">Sil</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            <Button
              label="Fotograf Ekle"
              variant="secondary"
              onPress={addPhotoInput}
              disabled={photoUrls.length >= 3}
            />
          </View>

          <Button label="Etkinligi Olustur" isLoading={createMutation.isPending} onPress={onSubmit} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
