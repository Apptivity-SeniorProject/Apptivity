import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, SafeAreaView, Text, View } from 'react-native';

import { login, sendOtp } from '@/src/api/authService';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useAuthStore } from '@/src/store/useAuthStore';
import { buildAuthUser } from '@/src/utils/auth';
import { getOrCreateDeviceId } from '@/src/utils/device';
import { getApiErrorMessage } from '@/src/utils/error';

interface CountryCodeOption {
  label: string;
  value: string;
}

const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { label: 'Turkiye (+90)', value: '+90' },
  { label: 'ABD (+1)', value: '+1' },
  { label: 'Almanya (+49)', value: '+49' },
  { label: 'Ingiltere (+44)', value: '+44' },
];

function normalizePhoneNumber(countryCode: string, phoneInput: string): string {
  const digits = phoneInput.replace(/\D/g, '');
  return `${countryCode}${digits}`;
}

export function LoginScreen() {
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countryCode, setCountryCode] = useState('+90');
  const [phoneInput, setPhoneInput] = useState('');
  const [password, setPassword] = useState('');
  const [inputError, setInputError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const phoneNumber = useMemo(
    () => normalizePhoneNumber(countryCode, phoneInput),
    [countryCode, phoneInput]
  );

  const loginMutation = useMutation({
    mutationFn: async (payload: { identifier: string; password: string }) => {
      const deviceId = await getOrCreateDeviceId();
      return login({
        identifier: payload.identifier,
        password: payload.password,
        deviceId,
      });
    },
    onSuccess: (response) => {
      if (!response.accessToken || !response.refreshToken) {
        Alert.alert('Giris Basarisiz', 'Token bilgisi alinamadi.');
        return;
      }

      setTokens(response.accessToken, response.refreshToken);
      setUser(buildAuthUser(response.accessToken, phoneNumber));
      router.replace('/(tabs)');
    },
    onError: (error) => {
      Alert.alert('Giris Basarisiz', getApiErrorMessage(error));
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (phone: string) => sendOtp({ phoneNumber: phone }),
    onSuccess: () => {
      Alert.alert('Kod Gonderildi', 'Dogrulama kodu gonderildi.');
      router.push({
        pathname: '/otp',
        params: {
          phoneNumber,
        },
      });
    },
    onError: (error) => {
      Alert.alert('Kod Gonderilemedi', getApiErrorMessage(error));
    },
  });

  const validatePhone = (): boolean => {
    const digitsOnly = phoneInput.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setInputError('Gecerli bir telefon numarasi girin.');
      Alert.alert('Hatali Numara', 'Telefon numarasi gecersiz.');
      return false;
    }

    setInputError('');
    return true;
  };

  const handleLogin = () => {
    if (!validatePhone()) {
      return;
    }

    if (!password.trim()) {
      setPasswordError('Sifre alani bos birakilamaz.');
      Alert.alert('Hatali Sifre', 'Lutfen sifrenizi girin.');
      return;
    }

    setPasswordError('');
    loginMutation.mutate({ identifier: phoneNumber, password: password.trim() });
  };

  const handleSendOtp = () => {
    if (!validatePhone()) {
      return;
    }

    sendOtpMutation.mutate(phoneNumber);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-6 pt-20">
        <Text className="text-3xl font-bold text-slate-900">Giris Yap</Text>
        <Text className="mt-2 text-base text-slate-500">
          Telefon numaran ve sifrenle giris yap. Istersen OTP ile de devam edebilirsin.
        </Text>

        <View className="mt-10 flex-row gap-3">
          <Pressable
            className="h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4"
            onPress={() => setIsCountryModalOpen(true)}>
            <Text className="text-base font-semibold text-slate-900">{countryCode}</Text>
          </Pressable>

          <Input
            keyboardType="phone-pad"
            label="Telefon Numarasi"
            placeholder="5XX XXX XX XX"
            value={phoneInput}
            onChangeText={setPhoneInput}
            error={inputError}
            containerClassName="flex-1"
          />
        </View>

        <Input
          label="Sifre"
          placeholder="Sifrenizi girin"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={passwordError}
          containerClassName="mt-4"
        />

        <Button
          className="mt-8"
          label="Giris Yap"
          isLoading={loginMutation.isPending}
          onPress={handleLogin}
        />

        <Button
          className="mt-3"
          variant="secondary"
          label="OTP Kodu Gonder"
          isLoading={sendOtpMutation.isPending}
          onPress={handleSendOtp}
        />
      </View>

      <Modal animationType="slide" transparent visible={isCountryModalOpen}>
        <Pressable
          className="flex-1 justify-end bg-black/30"
          onPress={() => setIsCountryModalOpen(false)}>
          <View className="max-h-72 rounded-t-3xl bg-white px-5 py-4">
            <Text className="mb-4 text-lg font-semibold text-slate-900">Ulke Kodu Sec</Text>
            <FlatList
              data={COUNTRY_CODE_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  className="rounded-xl px-3 py-3"
                  onPress={() => {
                    setCountryCode(item.value);
                    setIsCountryModalOpen(false);
                  }}>
                  <Text className="text-base text-slate-800">{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
