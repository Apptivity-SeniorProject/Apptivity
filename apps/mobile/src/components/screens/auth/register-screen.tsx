import { useMutation } from '@tanstack/react-query';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { registerIndividual } from '@/src/api/authService';
import { RegisterInterestsModal } from '@/src/components/auth/register-interests-modal';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { hitSlop } from '@/src/constants/theme';
import { useSetMyInterests } from '@/src/hooks/useProfile';
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

  const toast = useToast();
  const authenticate = useAuthStore((state) => state.authenticate);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const tagsQuery = useTags();
  const setInterestsMutation = useSetMyInterests();

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
      authenticate({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: buildAuthUser(response.accessToken, phoneNumber),
      });

      if (selectedTagIds.length > 0) {
        try {
          await setInterestsMutation.mutateAsync(selectedTagIds);
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Hesap açıldı ama ilgi alanları kaydedilemedi.'));
        }
      }

      toast.success('Hesabın başarıyla oluşturuldu.');
      router.replace('/(tabs)');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Kayıt başarısız.'));
    },
  });

  if (hasHydrated && accessToken) {
    return <Redirect href="/(tabs)" />;
  }

  const handleRegister = () => {
    Keyboard.dismiss();

    if (!validate()) {
      return;
    }

    registerMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-12 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Pressable hitSlop={hitSlop.md} onPress={() => router.replace('/(auth)/landing')}>
          <Text className="font-sans-medium text-sm text-gray-500">{'<'} Geri</Text>
        </Pressable>

        <Text className="mt-4 font-sans-bold text-3xl text-gray-900">Hesap Oluştur</Text>
        <Text className="mt-2 font-sans text-base text-gray-500">
          Gerekli bilgilerini gir, kaydını tamamla ve direkt uygulamaya giriş yap.
        </Text>

        <View className="mt-8 gap-4">
          <Input
            label="Kullanıcı Adı"
            placeholder="Kullanıcı adınız"
            autoCapitalize="none"
            value={form.username}
            onChangeText={(value) => updateField('username', value)}
            error={errors.username}
          />

          <View className="flex-row gap-3">
            <Input
              label="Ad"
              placeholder="Adınız"
              value={form.name}
              onChangeText={(value) => updateField('name', value)}
              error={errors.name}
              containerClassName="flex-1"
            />
            <Input
              label="Soyad"
              placeholder="Soyadınız"
              value={form.surname}
              onChangeText={(value) => updateField('surname', value)}
              error={errors.surname}
              containerClassName="flex-1"
            />
          </View>

          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-gray-700">Telefon Numarası</Text>
            <View className="flex-row gap-3">
              <Pressable
                className="h-12 items-center justify-center rounded-button border border-gray-200 bg-surface-secondary px-4"
                hitSlop={hitSlop.sm}
                onPress={() => setIsCountryModalOpen(true)}>
                <Text className="font-sans-semibold text-base text-gray-900">{countryCode}</Text>
              </Pressable>

              <Input
                placeholder="Telefon numaranız"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(value) => updateField('phone', value)}
                error={errors.phone}
                containerClassName="flex-1"
              />
            </View>
          </View>

          <Input
            label="E-posta"
            placeholder="E-posta adresiniz"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            error={errors.email}
            hint="Opsiyonel"
          />

          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-gray-700">Doğum Tarihi</Text>
            <Pressable
              className="h-12 justify-center rounded-button border border-gray-200 bg-surface-secondary px-4"
              onPress={() => setShowBirthdatePicker(true)}>
              <Text
                className={
                  formattedBirthdate
                    ? 'font-sans text-base text-gray-900'
                    : 'font-sans text-base text-gray-400'
                }>
                {formattedBirthdate || 'Gün / Ay / Yıl seçin'}
              </Text>
            </Pressable>
          </View>

          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-gray-700">Cinsiyet</Text>
            <Pressable
              className="h-12 justify-center rounded-button border border-gray-200 bg-surface-secondary px-4"
              onPress={() => setIsGenderModalOpen(true)}>
              <Text
                className={
                  gender ? 'font-sans text-base text-gray-900' : 'font-sans text-base text-gray-400'
                }>
                {gender || 'Cinsiyet seçin'}
              </Text>
            </Pressable>
          </View>

          <View className="rounded-2xl border border-gray-200 bg-surface-secondary px-4 py-4">
            <Text className="text-sm font-medium text-gray-900">İlgi Alanları</Text>
            <Text className="mt-1 text-sm text-gray-500">
              Kayıt sırasında sevdiğin tagları seç. Böylece sana uygun etkinlikleri daha iyi öneririz.
            </Text>

            {selectedTagsPreview.length > 0 ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {selectedTagsPreview.map((tag) => (
                  <View
                    key={tag.id}
                    className="rounded-full border border-blue-600 bg-blue-600 px-3 py-2">
                    <Text className="text-xs font-semibold text-white">{tag.name}</Text>
                  </View>
                ))}
                {selectedTagIds.length > selectedTagsPreview.length ? (
                  <View className="rounded-full border border-slate-300 bg-white px-3 py-2">
                    <Text className="text-xs font-semibold text-slate-600">
                      +{selectedTagIds.length - selectedTagsPreview.length}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text className="mt-3 text-sm text-gray-500">Henüz tag seçmedin.</Text>
            )}

            <Button
              className="mt-4"
              label={selectedTagIds.length > 0 ? 'Tagları Düzenle' : 'Tag Seç'}
              variant="secondary"
              disabled={tagsQuery.isPending}
              onPress={() => setIsInterestsModalOpen(true)}
            />
          </View>

          <Input
            label="Şifre"
            placeholder="En az 6 karakter"
            secureTextEntry
            value={form.password}
            onChangeText={(value) => updateField('password', value)}
            error={errors.password}
          />

          <Input
            label="Şifre Tekrar"
            placeholder="Şifrenizi tekrar girin"
            secureTextEntry
            value={form.passwordConfirm}
            onChangeText={(value) => updateField('passwordConfirm', value)}
            error={errors.passwordConfirm}
          />
        </View>

        {showBirthdatePicker ? (
          <DateTimePicker
            value={birthdate ?? new Date(2000, 0, 1)}
            mode="date"
            maximumDate={new Date()}
            onChange={handleBirthdateChange}
          />
        ) : null}

        <Button
          className="mt-8"
          label="Kayıt Ol"
          size="lg"
          isLoading={registerMutation.isPending}
          onPress={handleRegister}
        />

        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="font-sans text-sm text-gray-500">Zaten hesabın var mı?</Text>
          <Pressable hitSlop={hitSlop.sm} onPress={() => router.replace('/(auth)/login')}>
            <Text className="font-sans-semibold text-sm text-primary-600">Giriş Yap</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={isCountryModalOpen}>
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setIsCountryModalOpen(false)}>
          <View className="max-h-72 rounded-t-sheet bg-white px-5 py-4">
            <Text className="mb-4 font-sans-semibold text-lg text-gray-900">Ülke Kodu Seç</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.value}
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
        </Pressable>
      </Modal>

      <Modal animationType="slide" transparent visible={isGenderModalOpen}>
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setIsGenderModalOpen(false)}>
          <View className="rounded-t-sheet bg-white px-5 py-4">
            <Text className="mb-4 font-sans-semibold text-lg text-gray-900">Cinsiyet Seç</Text>
            <FlatList
              data={GENDER_OPTIONS}
              keyExtractor={(item) => item.value}
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
        </Pressable>
      </Modal>

      <RegisterInterestsModal
        visible={isInterestsModalOpen}
        onClose={() => setIsInterestsModalOpen(false)}
        tags={tagsQuery.data ?? []}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTag}
      />
    </SafeAreaView>
  );
}
