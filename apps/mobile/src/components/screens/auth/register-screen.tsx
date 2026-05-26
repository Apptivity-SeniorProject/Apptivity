import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { registerIndividual } from '@/src/api/authService';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { hitSlop } from '@/src/constants/theme';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
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

const INITIAL_FORM: FormData = {
  username: '',
  name: '',
  surname: '',
  phone: '',
  email: '',
  password: '',
  passwordConfirm: '',
};

export function RegisterScreen() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const toast = useToast();
  const authenticate = useAuthStore((s) => s.authenticate);

  const updateField = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!form.username.trim()) newErrors.username = 'Kullanıcı adı zorunlu.';
    if (!form.name.trim()) newErrors.name = 'Ad zorunlu.';
    if (!form.surname.trim()) newErrors.surname = 'Soyad zorunlu.';

    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) newErrors.phone = 'Geçerli bir telefon numarası girin.';

    if (!form.password || form.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalı.';
    }
    if (form.password !== form.passwordConfirm) {
      newErrors.passwordConfirm = 'Şifreler eşleşmiyor.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const registerMutation = useMutation({
    mutationFn: () => {
      const phoneDigits = form.phone.replace(/\D/g, '');
      const fullPhone = `+90${phoneDigits}`;

      return registerIndividual({
        username: form.username.trim(),
        name: form.name.trim(),
        surname: form.surname.trim(),
        phone: fullPhone,
        email: form.email.trim() || undefined,
        password: form.password,
      });
    },
    onSuccess: (response) => {
      const phoneDigits = form.phone.replace(/\D/g, '');
      const fullPhone = `+90${phoneDigits}`;

      authenticate({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: buildAuthUser(response.accessToken, fullPhone),
      });

      toast.success('Hesabın başarıyla oluşturuldu!');
      router.replace('/(tabs)');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Kayıt başarısız.'));
    },
  });

  const handleRegister = () => {
    Keyboard.dismiss();
    if (!validate()) return;
    registerMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-12 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Pressable hitSlop={hitSlop.md} onPress={() => router.back()}>
          <Text className="font-sans-medium text-sm text-gray-500">← Geri</Text>
        </Pressable>

        <Text className="mt-4 font-sans-bold text-3xl text-gray-900">Hesap Oluştur</Text>
        <Text className="mt-2 font-sans text-base text-gray-500">
          Bilgilerini girerek hızlıca kayıt ol.
        </Text>

        {/* ── Form ── */}
        <View className="mt-8 gap-4">
          <Input
            label="Kullanıcı Adı"
            placeholder="ornek_kullanici"
            autoCapitalize="none"
            value={form.username}
            onChangeText={(v) => updateField('username', v)}
            error={errors.username}
          />

          <View className="flex-row gap-3">
            <Input
              label="Ad"
              placeholder="Adınız"
              value={form.name}
              onChangeText={(v) => updateField('name', v)}
              error={errors.name}
              containerClassName="flex-1"
            />
            <Input
              label="Soyad"
              placeholder="Soyadınız"
              value={form.surname}
              onChangeText={(v) => updateField('surname', v)}
              error={errors.surname}
              containerClassName="flex-1"
            />
          </View>

          <Input
            label="Telefon Numarası"
            placeholder="5XX XXX XX XX"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(v) => updateField('phone', v)}
            error={errors.phone}
            hint="Başına +90 otomatik eklenir"
          />

          <Input
            label="E-posta (Opsiyonel)"
            placeholder="ornek@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
          />

          <Input
            label="Şifre"
            placeholder="En az 6 karakter"
            secureTextEntry
            value={form.password}
            onChangeText={(v) => updateField('password', v)}
            error={errors.password}
          />

          <Input
            label="Şifre Tekrar"
            placeholder="Şifrenizi tekrar girin"
            secureTextEntry
            value={form.passwordConfirm}
            onChangeText={(v) => updateField('passwordConfirm', v)}
            error={errors.passwordConfirm}
          />
        </View>

        {/* ── Register Button ── */}
        <Button
          className="mt-8"
          label="Kayıt Ol"
          size="lg"
          isLoading={registerMutation.isPending}
          onPress={handleRegister}
        />

        {/* ── Login Link ── */}
        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="font-sans text-sm text-gray-500">Zaten hesabın var mı?</Text>
          <Pressable hitSlop={hitSlop.sm} onPress={() => router.push('/(auth)/login')}>
            <Text className="font-sans-semibold text-sm text-primary-600">Giriş Yap</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
