import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loginWithPhoneNumber } from '@/src/api/authService';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { hitSlop } from '@/src/constants/theme';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import { buildAuthUser } from '@/src/utils/auth';
import { getApiErrorMessage } from '@/src/utils/error';

interface CountryCodeOption {
  label: string;
  value: string;
}

const COUNTRY_CODES: CountryCodeOption[] = [
  { label: 'Türkiye (+90)', value: '+90' },
  { label: 'ABD (+1)', value: '+1' },
  { label: 'Almanya (+49)', value: '+49' },
  { label: 'İngiltere (+44)', value: '+44' },
];

function normalizePhone(countryCode: string, input: string): string {
  return `${countryCode}${input.replace(/\D/g, '')}`;
}

export function LoginScreen() {
  const [countryCode, setCountryCode] = useState('+90');
  const [phoneInput, setPhoneInput] = useState('');
  const [password, setPassword] = useState('');
  const [inputError, setInputError] = useState('');
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);


  const toast = useToast();

  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const phoneNumber = useMemo(
    () => normalizePhone(countryCode, phoneInput),
    [countryCode, phoneInput]
  );



  const loginMutation = useMutation({
    mutationFn: ({ identifier, pass }: { identifier: string; pass: string }) =>
      loginWithPhoneNumber(identifier, pass),
    onSuccess: (response) => {
      if (response.accessToken && response.refreshToken) {
        setTokens(response.accessToken, response.refreshToken);
        setUser(buildAuthUser(response.accessToken, phoneNumber));
        router.replace('/(tabs)');
        return;
      }

      toast.info('Doğrulama adımına yönlendiriliyorsun.');
      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber },
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Giriş başarısız.'));
    },
  });

  if (hasHydrated && accessToken) {
    return <Redirect href="/(tabs)" />;
  }

  const handleLogin = () => {
    Keyboard.dismiss();
    const digits = phoneInput.replace(/\D/g, '');

    if (digits.length < 7 || digits.length > 15) {
      setInputError('Geçerli bir telefon numarası girin.');
      return;
    }

    if (!password.trim()) {
      setInputError('Şifre giriniz.');
      return;
    }

    setInputError('');
    loginMutation.mutate({ identifier: phoneNumber, pass: password });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
        <Pressable
          className="absolute left-8 top-3 z-10 flex-row items-center gap-1"
          hitSlop={hitSlop.md}
          onPress={() => router.replace('/(auth)/landing')}>
          <Ionicons name="chevron-back" size={18} color="#44a31e" />
          <Text className="font-sans-medium text-sm text-primary-600">Geri Dön</Text>
        </Pressable>

        <View className="flex-1 justify-center px-8">
          <View className="flex-1 justify-center">
            <View className="items-center">
              <View className="mb-3 h-20 w-20 items-center justify-center rounded-3xl bg-primary-50">
                <Image
                  source={require('@/assets/apptivity/apptivity_logo.png')}
                  style={{ width: 52, height: 52 }}
                  resizeMode="contain"
                />
              </View>
              <Text
                style={{ fontSize: 26, lineHeight: 34, letterSpacing: -0.4 }}
                className="font-sans-extrabold text-gray-900">
                Giriş Yap
              </Text>
              <Text className="mt-1 font-sans text-sm text-gray-500">
                Telefon numaran ve şifrenle giriş yap.
              </Text>
            </View>

            <View className="mt-8 w-full">
              <Text className="mb-1.5 font-sans-medium text-xs text-gray-800">
                Telefon Numarası
              </Text>
              <View className="mb-3.5 flex-row gap-2">
                <Pressable
                  className="h-12 flex-row items-center justify-center gap-1 rounded-card border border-gray-200 bg-surface-secondary px-3.5"
                  hitSlop={hitSlop.sm}
                  onPress={() => setIsCountryModalOpen(true)}>
                  <Ionicons name="flag-outline" size={14} color="#44a31e" />
                  <Text className="font-sans-medium text-sm text-gray-900">{countryCode}</Text>
                </Pressable>

                <Input
                  keyboardType="phone-pad"
                  placeholder="Telefon numaranız"
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  containerClassName="flex-1"
                />
              </View>

              <Input
                label="Şifre"
                placeholder="Şifrenizi girin"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={inputError}
              />

              <Pressable
                className="mb-7 mt-2 self-end"
                hitSlop={hitSlop.sm}
                onPress={() => router.push('/(auth)/password-reset')}>
                <Text className="font-sans-medium text-xs text-primary-600">Şifremi Unuttum</Text>
              </Pressable>

              <Button
                label="Giriş Yap"
                size="lg"
                className="rounded-full"
                isLoading={loginMutation.isPending}
                onPress={handleLogin}
              />

              <View className="mt-4 flex-row items-center justify-center gap-1">
                <Text className="font-sans text-sm text-gray-500">Hesabın yok mu?</Text>
                <Pressable hitSlop={hitSlop.sm} onPress={() => router.replace('/(auth)/register')}>
                  <Text className="font-sans-semibold text-sm text-primary-600">Kayıt Ol</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

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
    </SafeAreaView>
  );
}
