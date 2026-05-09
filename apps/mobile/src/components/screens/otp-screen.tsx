import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, Text, View } from 'react-native';

import { requestLoginOtp, verifyOtp } from '@/src/api/authService';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useAuthStore } from '@/src/store/useAuthStore';
import { getApiErrorMessage } from '@/src/utils/error';

const DEFAULT_RESEND_SECONDS = 60;

export function OtpScreen() {
  const params = useLocalSearchParams<{
    phoneNumber?: string;
    verificationId?: string;
    resendAfterSeconds?: string;
  }>();

  const authenticate = useAuthStore((state) => state.authenticate);

  const phoneNumber = useMemo(() => params.phoneNumber?.trim() ?? '', [params.phoneNumber]);
  const [verificationId, setVerificationId] = useState(params.verificationId ?? '');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const parsed = Number(params.resendAfterSeconds);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return DEFAULT_RESEND_SECONDS;
  });

  useEffect(() => {
    if (!phoneNumber) {
      Alert.alert('Eksik Bilgi', 'Telefon numarası bulunamadı. Lütfen tekrar giriş yapın.');
      router.replace('/login');
      return;
    }
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phoneNumber, remainingSeconds]);

  const verifyMutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (response) => {
      authenticate({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
      router.replace('/(tabs)');
    },
    onError: (error) => {
      Alert.alert('Doğrulama Başarısız', getApiErrorMessage(error, 'OTP kodu doğrulanamadı.'));
    },
  });

  const resendMutation = useMutation({
    mutationFn: requestLoginOtp,
    onSuccess: (response) => {
      setVerificationId(response.verificationId ?? '');
      setRemainingSeconds(response.resendAfterSeconds ?? DEFAULT_RESEND_SECONDS);
      Alert.alert('Kod Gönderildi', 'Yeni doğrulama kodu gönderildi.');
    },
    onError: (error) => {
      Alert.alert('Kod Gönderilemedi', getApiErrorMessage(error));
    },
  });

  const handleVerify = () => {
    const normalizedOtp = otpCode.replace(/\D/g, '');
    if (normalizedOtp.length !== 6) {
      setOtpError('OTP kodu 6 haneli olmalı.');
      Alert.alert('Geçersiz OTP', 'Lütfen 6 haneli OTP kodu girin.');
      return;
    }

    setOtpError('');
    verifyMutation.mutate({
      phoneNumber,
      otpCode: normalizedOtp,
      verificationId: verificationId || undefined,
    });
  };

  const handleResend = () => {
    if (remainingSeconds > 0 || resendMutation.isPending) {
      return;
    }
    resendMutation.mutate({ phoneNumber });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-6 pt-20">
        <Text className="text-3xl font-bold text-slate-900">OTP Doğrula</Text>
        <Text className="mt-2 text-base text-slate-500">
          {phoneNumber} numarasına gönderilen 6 haneli kodu gir.
        </Text>

        <Input
          label="Doğrulama Kodu"
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          value={otpCode}
          onChangeText={(value) => setOtpCode(value.replace(/\D/g, ''))}
          error={otpError}
          containerClassName="mt-10"
          className="text-center tracking-[10px]"
        />

        <Button
          className="mt-8"
          label="Doğrula"
          isLoading={verifyMutation.isPending}
          onPress={handleVerify}
        />

        <View className="mt-5 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-slate-500">Kod gelmedi mi?</Text>
          {remainingSeconds > 0 ? (
            <Text className="text-sm font-semibold text-slate-700">
              Tekrar gönder ({remainingSeconds}s)
            </Text>
          ) : (
            <Text className="text-sm font-semibold text-blue-600" onPress={handleResend}>
              Kodu tekrar gönder
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
