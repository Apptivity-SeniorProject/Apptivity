import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, SafeAreaView, Text, View } from 'react-native';

import { requestLoginOtp } from '@/src/api/authService';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getApiErrorMessage } from '@/src/utils/error';

interface CountryCodeOption {
  label: string;
  value: string;
}

const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { label: 'Türkiye (+90)', value: '+90' },
  { label: 'ABD (+1)', value: '+1' },
  { label: 'Almanya (+49)', value: '+49' },
  { label: 'İngiltere (+44)', value: '+44' },
];

function normalizePhoneNumber(countryCode: string, phoneInput: string): string {
  const digits = phoneInput.replace(/\D/g, '');
  return `${countryCode}${digits}`;
}

export function LoginScreen() {
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countryCode, setCountryCode] = useState('+90');
  const [phoneInput, setPhoneInput] = useState('');
  const [inputError, setInputError] = useState('');

  const phoneNumber = useMemo(
    () => normalizePhoneNumber(countryCode, phoneInput),
    [countryCode, phoneInput]
  );

  const loginMutation = useMutation({
    mutationFn: requestLoginOtp,
    onSuccess: (response) => {
      router.push({
        pathname: '/otp',
        params: {
          phoneNumber,
          verificationId: response.verificationId ?? '',
          resendAfterSeconds: String(response.resendAfterSeconds ?? 60),
        },
      });
    },
    onError: (error) => {
      Alert.alert('Doğrulama Gönderilemedi', getApiErrorMessage(error));
    },
  });

  const handleSendOtp = () => {
    const digitsOnly = phoneInput.replace(/\D/g, '');

    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setInputError('Geçerli bir telefon numarası girin.');
      Alert.alert('Hatalı Numara', 'Telefon numarası geçersiz.');
      return;
    }

    setInputError('');
    loginMutation.mutate({ phoneNumber });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-6 pt-20">
        <Text className="text-3xl font-bold text-slate-900">Giriş Yap</Text>
        <Text className="mt-2 text-base text-slate-500">
          Telefon numaranı gir, sana tek kullanımlık doğrulama kodu gönderelim.
        </Text>

        <View className="mt-10 flex-row gap-3">
          <Pressable
            className="h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4"
            onPress={() => setIsCountryModalOpen(true)}>
            <Text className="text-base font-semibold text-slate-900">{countryCode}</Text>
          </Pressable>

          <Input
            keyboardType="phone-pad"
            label="Telefon Numarası"
            placeholder="5XX XXX XX XX"
            value={phoneInput}
            onChangeText={setPhoneInput}
            error={inputError}
            containerClassName="flex-1"
          />
        </View>

        <Button
          className="mt-8"
          label="OTP Gönder"
          isLoading={loginMutation.isPending}
          onPress={handleSendOtp}
        />

        <Text className="mt-4 text-xs text-slate-400">
          Devam ederek kullanım şartlarını kabul etmiş olursun.
        </Text>
      </View>

      <Modal animationType="slide" transparent visible={isCountryModalOpen}>
        <Pressable className="flex-1 justify-end bg-black/30" onPress={() => setIsCountryModalOpen(false)}>
          <View className="max-h-72 rounded-t-3xl bg-white px-5 py-4">
            <Text className="mb-4 text-lg font-semibold text-slate-900">Ülke Kodu Seç</Text>
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
