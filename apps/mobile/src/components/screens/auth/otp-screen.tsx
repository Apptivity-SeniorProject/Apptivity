import { useMutation } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sendOtp, verifyOtpCode } from '@/src/api/authService';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { hitSlop } from '@/src/constants/theme';
import { useToast } from '@/src/hooks/useToast';
import { useAuthStore } from '@/src/store/useAuthStore';
import { buildAuthUser } from '@/src/utils/auth';
import { getApiErrorMessage } from '@/src/utils/error';

const RESEND_COUNTDOWN = 60;

export function OtpScreen() {
  const params = useLocalSearchParams<{ phoneNumber?: string }>();
  const phoneNumber = useMemo(() => params.phoneNumber?.trim() ?? '', [params.phoneNumber]);

  const toast = useToast();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);

  // Geri sayım
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyOtpCode(code),
    onSuccess: (response) => {
      setTokens(response.accessToken, response.refreshToken);
      setUser(buildAuthUser(response.accessToken, phoneNumber));
      router.replace('/(tabs)');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Doğrulama kodu doğrulanamadı.'));
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => sendOtp({ phoneNumber }),
    onSuccess: () => {
      setCountdown(RESEND_COUNTDOWN);
      toast.success('Yeni doğrulama kodu gönderildi.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  // ── Early returns AFTER all hooks ──
  if (hasHydrated && accessToken) {
    return <Redirect href="/(tabs)" />;
  }

  if (hasHydrated && !phoneNumber) {
    return <Redirect href="/(auth)/login" />;
  }

  const handleVerify = () => {
    Keyboard.dismiss();
    const digits = otpCode.replace(/\D/g, '');

    if (digits.length !== 6) {
      setOtpError('Doğrulama kodu 6 haneli olmalı.');
      return;
    }

    setOtpError('');
    verifyMutation.mutate(digits);
  };

  const handleResend = () => {
    if (countdown > 0 || resendMutation.isPending) return;
    resendMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-16">
        {/* ── Back ── */}
        <Pressable hitSlop={hitSlop.md} onPress={() => router.back()}>
          <Text className="font-sans-medium text-sm text-gray-500">← Geri</Text>
        </Pressable>

        {/* ── Header ── */}
        <Text className="mt-4 font-sans-bold text-3xl text-gray-900">Doğrulama</Text>
        <Text className="mt-2 font-sans text-base text-gray-500">
          <Text className="font-sans-semibold text-gray-700">{phoneNumber}</Text> numarasına
          gönderilen 6 haneli kodu gir.
        </Text>

        {/* ── OTP Input ── */}
        <Input
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          value={otpCode}
          onChangeText={(v) => setOtpCode(v.replace(/\D/g, ''))}
          error={otpError}
          containerClassName="mt-10"
          className="text-center tracking-[10px] font-sans-bold text-xl"
        />

        {/* ── Verify Button ── */}
        <Button
          className="mt-8"
          label="Doğrula"
          size="lg"
          isLoading={verifyMutation.isPending}
          onPress={handleVerify}
        />

        {/* ── Resend ── */}
        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="font-sans text-sm text-gray-500">Kod gelmedi mi?</Text>
          {countdown > 0 ? (
            <Text className="font-sans-semibold text-sm text-gray-400">
              Tekrar gönder ({countdown}s)
            </Text>
          ) : (
            <Pressable hitSlop={hitSlop.sm} onPress={handleResend}>
              <Text className="font-sans-semibold text-sm text-primary-600">
                Kodu tekrar gönder
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
