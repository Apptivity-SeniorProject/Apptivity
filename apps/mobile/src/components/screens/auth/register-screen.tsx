import { useMutation } from '@tanstack/react-query';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'lucide-react-native';

import { registerIndividual } from '@/src/api/authService';
import { TagSelectionModal } from '@/src/components/tags/tag-selection-modal';
import { Input } from '@/src/components/ui/input';
import { hitSlop } from '@/src/constants/theme';
import { useSetMyInterests, useUploadProfilePhoto } from '@/src/hooks/useProfile';
import { useTags } from '@/src/hooks/useTags';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { TagDto } from '@/src/types/lookup';
import { buildAuthUser } from '@/src/utils/auth';
import { getApiErrorMessage } from '@/src/utils/error';

interface FormData {
  username: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

interface CountryCodeOption {
  label: string;
  value: string;
}

interface GenderOption {
  label: string;
  value: string;
}

interface SelectedProfilePhoto {
  uri: string;
  mimeType: string;
}

const INITIAL_FORM: FormData = {
  username: '',
  name: '',
  surname: '',
  phone: '',
  email: '',
  password: '',
  passwordConfirm: '',
};

const COUNTRY_CODES: CountryCodeOption[] = [
  { label: 'Türkiye (+90)', value: '+90' },
  { label: 'ABD (+1)', value: '+1' },
  { label: 'Almanya (+49)', value: '+49' },
  { label: 'İngiltere (+44)', value: '+44' },
];

const GENDER_OPTIONS: GenderOption[] = [
  { label: 'Erkek', value: 'Erkek' },
  { label: 'Kadın', value: 'Kadın' },
  { label: 'Belirtmek istemiyorum', value: 'Belirtmek istemiyorum' },
];

function normalizePhone(countryCode: string, input: string): string {
  return `${countryCode}${input.replace(/\D/g, '')}`;
}

export function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [countryCode, setCountryCode] = useState('+90');
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [gender, setGender] = useState('');
  const [showBirthdatePicker, setShowBirthdatePicker] = useState(false);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isInterestsModalOpen, setIsInterestsModalOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedProfilePhoto, setSelectedProfilePhoto] = useState<SelectedProfilePhoto | null>(null);
  const [isFinalizingRegistration, setIsFinalizingRegistration] = useState(false);

  const toast = useToast();
  const authenticate = useAuthStore((state) => state.authenticate);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const tagsQuery = useTags();
  const setInterestsMutation = useSetMyInterests();
  const uploadPhotoMutation = useUploadProfilePhoto();

  const phoneNumber = useMemo(
    () => normalizePhone(countryCode, form.phone),
    [countryCode, form.phone]
  );
  const formattedBirthdate = useMemo(
    () => (birthdate ? format(birthdate, 'dd.MM.yyyy') : ''),
    [birthdate]
  );
  const selectedTagsPreview = useMemo<TagDto[]>(
    () => (tagsQuery.data ?? []).filter((tag) => selectedTagIds.includes(tag.id)).slice(0, 4),
    [selectedTagIds, tagsQuery.data]
  );
  const sheetBottomPadding = Math.max(insets.bottom, 16);
  const initials = useMemo(() => {
    const words = [form.name.trim(), form.surname.trim()].filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    const fallback = form.name.trim() || form.username.trim();
    return fallback ? fallback.slice(0, 2).toUpperCase() : '?';
  }, [form.name, form.surname, form.username]);

  const updateField = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof FormData, string>> = {};
    const phoneDigits = form.phone.replace(/\D/g, '');
    const email = form.email.trim();

    if (form.username.trim().length < 3) {
      nextErrors.username = 'Kullanıcı adı en az 3 karakter olmalı.';
    }

    if (!form.name.trim()) {
      nextErrors.name = 'Ad zorunlu.';
    }

    if (!form.surname.trim()) {
      nextErrors.surname = 'Soyad zorunlu.';
    }

    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      nextErrors.phone = 'Geçerli bir telefon numarası girin.';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Geçerli bir e-posta girin.';
    }

    if (selectedTagIds.length < 1) {
      toast.error('Kayıt olmak için en az 1 ilgi alanı seçmelisiniz.');
      return false;
    }

    if (!form.password || form.password.length < 6) {
      nextErrors.password = 'Şifre en az 6 karakter olmalı.';
    }

    if (form.password !== form.passwordConfirm) {
      nextErrors.passwordConfirm = 'Şifreler eşleşmiyor.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleBirthdateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowBirthdatePicker(false);

    if (event.type !== 'set' || !selectedDate) {
      return;
    }

    setBirthdate(selectedDate);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  };

  const handleProfilePhotoPress = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      toast.error('Galeri erisimi reddedildi.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (pickerResult.canceled || !pickerResult.assets?.[0]) {
      return;
    }

    const asset = pickerResult.assets[0];
    const mimeType = asset.mimeType ?? (asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg');

    setSelectedProfilePhoto({
      uri: asset.uri,
      mimeType,
    });
  };

  const registerMutation = useMutation({
    mutationFn: () =>
      registerIndividual({
        username: form.username.trim(),
        name: form.name.trim(),
        surname: form.surname.trim(),
        phone: phoneNumber,
        email: form.email.trim() || undefined,
        birthdate: birthdate ? format(birthdate, 'yyyy-MM-dd') : undefined,
        gender: gender || undefined,
        password: form.password,
      }),
    onSuccess: async (response) => {
      setIsFinalizingRegistration(true);
      authenticate({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: buildAuthUser(response.accessToken, phoneNumber),
      });

      if (selectedProfilePhoto) {
        try {
          await uploadPhotoMutation.mutateAsync(selectedProfilePhoto);
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Hesap acildi ama profil fotografi yuklenemedi.'));
        }
      }

      if (selectedTagIds.length > 0) {
        try {
          await setInterestsMutation.mutateAsync(selectedTagIds);
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Hesap açıldı ama ilgi alanları kaydedilemedi.'));
        }
      }

      toast.success('Hesabın başarıyla oluşturuldu.');
      setIsFinalizingRegistration(false);
      router.replace('/(tabs)');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Kayıt başarısız.'));
    },
  });

  if (hasHydrated && accessToken && !isFinalizingRegistration) {
    return <Redirect href="/(tabs)" />;
  }

  const handleRegister = () => {
    Keyboard.dismiss();

    if (!validate()) {
      return;
    }

    registerMutation.mutate();
  };

  const isRegistering =
    registerMutation.isPending ||
    uploadPhotoMutation.isPending ||
    setInterestsMutation.isPending ||
    isFinalizingRegistration;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-5 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Geri */}
        <Pressable
          className="flex-row items-center gap-1 pt-3"
          hitSlop={hitSlop.md}
          onPress={() => router.replace('/(auth)/landing')}>
          <Ionicons name="chevron-back" size={18} color="#44a31e" />
          <Text className="text-[13px] font-sans-medium text-[#44a31e]">Geri Dön</Text>
        </Pressable>

        {/* Başlık */}
        <View className="mb-7 items-center mt-5">
          <Text className="text-[26px] font-bold text-gray-900 tracking-tight mb-1.5 text-center">
            Hesap Oluştur
          </Text>
          <Text className="text-[13.5px] text-gray-400 leading-5 text-center">
            Birkaç adımda kaydını tamamla,{'\n'}hemen giriş yap.
          </Text>
        </View>

        <View className="gap-3.5">
          {/* Kullanıcı Adı */}
          <View>
            <Text className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              Kullanıcı Adı
            </Text>
            <Input
              placeholder="kullanıcı_adınız"
              autoCapitalize="none"
              value={form.username}
              onChangeText={(value) => updateField('username', value)}
              error={errors.username}
            />
          </View>

          {/* Ad & Soyad */}
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Text className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Ad
              </Text>
              <Input
                placeholder="Adınız"
                value={form.name}
                onChangeText={(value) => updateField('name', value)}
                error={errors.name}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Soyad
              </Text>
              <Input
                placeholder="Soyadınız"
                value={form.surname}
                onChangeText={(value) => updateField('surname', value)}
                error={errors.surname}
              />
            </View>
          </View>

          {/* Telefon */}
          <View>
            <Text className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              Telefon
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                className="h-12 flex-row items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-[#F7F8FA] px-3.5 gap-1.5"
                hitSlop={hitSlop.sm}
                onPress={() => setIsCountryModalOpen(true)}>
                <Text className="text-sm font-semibold text-gray-900">🇹🇷 {countryCode}</Text>
              </Pressable>

              <Input
                placeholder="555 000 00 00"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(value) => updateField('phone', value)}
                error={errors.phone}
                containerClassName="flex-1"
              />
            </View>
          </View>

          {/* E-posta */}
          <View>
            <View className="flex-row items-baseline gap-1.5 mb-1.5">
              <Text className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-widest">
                E-posta
              </Text>
              <Text className="text-[11px] text-gray-300">(opsiyonel)</Text>
            </View>
            <Input
              placeholder="ornek@eposta.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(value) => updateField('email', value)}
              error={errors.email}
            />
          </View>

          {/* Doğum Tarihi & Cinsiyet yan yana */}
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Text className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Doğum Tarihi
              </Text>
              <Pressable
                className="h-12 flex-row items-center rounded-xl border-[1.5px] border-gray-200 bg-[#F7F8FA] px-3.5 gap-2"
                onPress={() => setShowBirthdatePicker(true)}>
                <Text
                  className={
                    formattedBirthdate
                      ? 'text-sm text-gray-900'
                      : 'text-[13px] text-gray-300'
                  }>
                  {formattedBirthdate || 'GG / AA / YYYY'}
                </Text>
              </Pressable>
            </View>
            <View className="flex-1">
              <Text className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Cinsiyet
              </Text>
              <Pressable
                className="h-12 flex-row items-center justify-between rounded-xl border-[1.5px] border-gray-200 bg-[#F7F8FA] px-3.5"
                onPress={() => setIsGenderModalOpen(true)}>
                <Text
                  className={
                    gender ? 'text-sm text-gray-900' : 'text-sm text-gray-300'
                  }>
                  {gender || 'Seçin'}
                </Text>
                <Text className="text-sm text-gray-300">▾</Text>
              </Pressable>
            </View>
          </View>

          {/* İlgi Alanları - Yeşil temalı kart */}
          <View className="rounded-[14px] border-[1.5px] border-slate-200 bg-slate-50 px-3.5 py-3.5">
            <Text className="text-[13px] font-bold text-slate-800">Profil Fotografi</Text>
            <Text className="mt-1 text-[12.5px] text-slate-500 leading-[18px]">
              Istersen kayit olurken profil fotografini da ekleyebilirsin.
            </Text>

            <View className="mt-4 items-center">
              <Pressable
                onPress={handleProfilePhotoPress}
                disabled={isRegistering}
                className="h-24 w-24 rounded-full border-2 border-slate-200 bg-white items-center justify-center overflow-hidden">
                {selectedProfilePhoto ? (
                  <Image
                    source={{ uri: selectedProfilePhoto.uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Text className="text-3xl font-semibold text-slate-400">{initials}</Text>
                )}

                {uploadPhotoMutation.isPending ? (
                  <View className="absolute inset-0 rounded-full bg-black/40 items-center justify-center">
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : (
                  <View className="absolute bottom-0 w-full bg-black/40 py-1 items-center">
                    <Camera size={14} color="#fff" />
                  </View>
                )}
              </Pressable>

              <Text className="mt-3 text-[12.5px] font-medium text-[#44a31e]">
                {selectedProfilePhoto ? 'Profil fotografini degistir' : 'Profil fotografi ekle'}
              </Text>
            </View>
          </View>

          <View className="rounded-[14px] border-[1.5px] border-[#BBEFAA] bg-[#F0FCE8] px-3.5 py-3.5">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Text className="text-[13px] font-bold text-[#357c1c]">İlgi Alanları</Text>
            </View>
            <Text className="text-[12.5px] text-[#3a8a1a] leading-[18px] mb-2.5">
              Sana uygun etkinlikleri önerebilmemiz için ilgi alanlarını seç.
            </Text>

            {selectedTagsPreview.length > 0 ? (
              <View className="flex-row flex-wrap gap-2 mb-2.5">
                {selectedTagsPreview.map((tag) => (
                  <View
                    key={tag.id}
                    className="rounded-full border border-[#5bcc2a] bg-[#5bcc2a] px-3 py-1.5">
                    <Text className="text-xs font-semibold text-white">{tag.name}</Text>
                  </View>
                ))}
                {selectedTagIds.length > selectedTagsPreview.length ? (
                  <View className="rounded-full border border-[#BBEFAA] bg-white px-3 py-1.5">
                    <Text className="text-xs font-semibold text-[#3a8a1a]">
                      +{selectedTagIds.length - selectedTagsPreview.length}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Pressable
              className="rounded-[10px] border-[1.5px] border-[#BBEFAA] bg-white py-2.5 items-center justify-center flex-row gap-1.5"
              disabled={tagsQuery.isPending}
              onPress={() => setIsInterestsModalOpen(true)}>
              <Text className="text-[13.5px] font-semibold text-[#44a31e]">
                {selectedTagIds.length > 0 ? 'İlgi Alanlarını Düzenle' : '+ İlgi Alanı Seç'}
              </Text>
            </Pressable>
          </View>

          {/* Şifre */}
          <View>
            <Text className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              Şifre
            </Text>
            <Input
              placeholder="En az 6 karakter"
              secureTextEntry
              value={form.password}
              onChangeText={(value) => updateField('password', value)}
              error={errors.password}
            />
          </View>

          {/* Şifre Tekrar */}
          <View>
            <Text className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              Şifre Tekrar
            </Text>
            <Input
              placeholder="Şifrenizi tekrar girin"
              secureTextEntry
              value={form.passwordConfirm}
              onChangeText={(value) => updateField('passwordConfirm', value)}
              error={errors.passwordConfirm}
            />
          </View>
        </View>

        {showBirthdatePicker ? (
          <DateTimePicker
            value={birthdate ?? new Date(2000, 0, 1)}
            mode="date"
            maximumDate={new Date()}
            onChange={handleBirthdateChange}
          />
        ) : null}

        {/* Kayıt Ol Butonu */}
        <Pressable
          className="mt-6 h-[52px] rounded-[14px] items-center justify-center"
          style={{
            backgroundColor: isRegistering ? '#a3e88a' : undefined,
          }}
          disabled={isRegistering}
          onPress={handleRegister}>
          <View
            className="w-full h-full rounded-[14px] items-center justify-center"
            style={{
              backgroundColor: isRegistering ? '#a3e88a' : '#5bcc2a',
            }}>
            {isRegistering ? (
              <Text className="text-[15.5px] font-bold text-white/60">Kayıt Ol...</Text>
            ) : (
              <Text className="text-[15.5px] font-bold text-white tracking-wide">Kayıt Ol</Text>
            )}
          </View>
        </Pressable>

        {/* Alt link */}
        <View className="mt-5 flex-row items-center justify-center gap-1 pb-7">
          <Text className="text-[13.5px] text-gray-400">Zaten hesabın var mı?</Text>
          <Pressable hitSlop={hitSlop.sm} onPress={() => router.replace('/(auth)/login')}>
            <Text className="text-[13.5px] font-bold text-[#5bcc2a]">Giriş Yap</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isCountryModalOpen}
        onRequestClose={() => setIsCountryModalOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" onPress={() => setIsCountryModalOpen(false)} />
          <View
            className="max-h-72 rounded-t-sheet bg-white px-5 pt-4"
            style={{ paddingBottom: sheetBottomPadding }}>
            <Text className="mb-4 font-sans-semibold text-lg text-gray-900">Ülke Kodu Seç</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.value}
              contentContainerStyle={{ paddingBottom: 4 }}
              renderItem={({ item }) => (
                <Pressable
                  className="rounded-card px-3 py-3"
                  onPress={() => {
                    setCountryCode(item.value);
                    setIsCountryModalOpen(false);
                  }}>
                  <Text className="font-sans text-base text-gray-800">{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={isGenderModalOpen}
        onRequestClose={() => setIsGenderModalOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" onPress={() => setIsGenderModalOpen(false)} />
          <View
            className="rounded-t-sheet bg-white px-5 pt-4"
            style={{ paddingBottom: sheetBottomPadding }}>
            <Text className="mb-4 font-sans-semibold text-lg text-gray-900">Cinsiyet Seç</Text>
            <FlatList
              data={GENDER_OPTIONS}
              keyExtractor={(item) => item.value}
              contentContainerStyle={{ paddingBottom: 4 }}
              renderItem={({ item }) => (
                <Pressable
                  className="rounded-card px-3 py-3"
                  onPress={() => {
                    setGender(item.value);
                    setIsGenderModalOpen(false);
                  }}>
                  <Text className="font-sans text-base text-gray-800">{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <TagSelectionModal
        visible={isInterestsModalOpen}
        onClose={() => setIsInterestsModalOpen(false)}
        tags={tagsQuery.data ?? []}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTag}
        title="İlgi Alanlarını Seç"
        description="Hepsini bir anda doldurmak zorunda değilsin. Beğendiğin etkinlik türlerini seç, önerileri buna göre düzenleyelim."
      />
    </SafeAreaView>
  );
}
