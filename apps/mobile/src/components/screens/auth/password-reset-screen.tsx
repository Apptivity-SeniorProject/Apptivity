import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sendOtp } from '@/src/api/authService';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { hitSlop } from '@/src/constants/theme';
import { useToast } from '@/src/hooks/useToast';
import { getApiErrorMessage } from '@/src/utils/error';

export function PasswordResetScreen() {
  const [phoneInput, setPhoneInput] = useState('');
  const [inputError, setInputError] = useState('');

  const toast = useToast();

  const sendOtpMutation = useMutation({
    mutationFn: () => {
      const digits = phoneInput.replace(/\D/g, '');
      return sendOtp({ phoneNumber: `+90${digits}` });
    },
    onSuccess: () => {
      const digits = phoneInput.replace(/\D/g, '');
      const fullPhone = `+90${digits}`;
      toast.success('Doğrulama kodu gönderildi.');
      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber: fullPhone },
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Kod gönderilemedi.'));
    },
  });

  const handleSendCode = () => {
    Keyboard.dismiss();
    const digits = phoneInput.replace(/\D/g, '');

    if (digits.length < 10) {
      setInputError('Geçerli bir telefon numarası girin.');
      return;
    }

    setInputError('');
    sendOtpMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-16">
        {/* ── Back ── */}
        <Pressable hitSlop={hitSlop.md} onPress={() => router.back()}>
          <Text className="font-sans-medium text-sm text-gray-500">← Geri</Text>
        </Pressable>

        {/* ── Header ── */}
        <Text className="mt-4 font-sans-bold text-3xl text-gray-900">Şifre Sıfırla</Text>
        <Text className="mt-2 font-sans text-base text-gray-500">
          Telefon numaranı gir, doğrulama kodu gönderelim.
        </Text>

        {/* ── Phone Input ── */}
        <Input
          label="Telefon Numarası"
          placeholder="5XX XXX XX XX"
          keyboardType="phone-pad"
          value={phoneInput}
          onChangeText={setPhoneInput}
          error={inputError}
          hint="Başına +90 otomatik eklenir"
          containerClassName="mt-10"
        />

        {/* ── Send Code Button ── */}
        <Button
          className="mt-8"
          label="Kod Gönder"
          size="lg"
          isLoading={sendOtpMutation.isPending}
          onPress={handleSendCode}
        />

        {/* ── Login Link ── */}
        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="font-sans text-sm text-gray-500">Şifreni hatırladın mı?</Text>
          <Pressable hitSlop={hitSlop.sm} onPress={() => router.push('/(auth)/login')}>
            <Text className="font-sans-semibold text-sm text-primary-600">Giriş Yap</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
