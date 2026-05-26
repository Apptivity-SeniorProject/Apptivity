import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sendOtp, verifyOtpCode } from '@/src/api/authService';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useAuthStore } from '@/src/store/useAuthStore';
import { buildAuthUser } from '@/src/utils/auth';
import { getApiErrorMessage } from '@/src/utils/error';
import { useToast } from '@/src/hooks/useToast';

const DEFAULT_RESEND_SECONDS = 60;

export function OtpScreen() {
  const params = useLocalSearchParams<{
    phoneNumber?: string;
  }>();

  const toast = useToast();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const phoneNumber = useMemo(() => params.phoneNumber?.trim() ?? '', [params.phoneNumber]);

  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_RESEND_SECONDS);

  useEffect(() => {
    if (!phoneNumber) {
      toast.error('Telefon numarasi bulunamadi. Lutfen tekrar giris yapin.');
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
  }, [phoneNumber, remainingSeconds, toast]);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => verifyOtpCode(code),
    onSuccess: (response) => {
      setTokens(response.accessToken, response.refreshToken);
      setUser(buildAuthUser(response.accessToken, phoneNumber));
      // router.replace kaldırıldı — auth guard (useAuthGuard) yönlendirmeyi halleder
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'OTP kodu dogrulanamadi.'));
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => sendOtp({ phoneNumber }),
    onSuccess: () => {
      setRemainingSeconds(DEFAULT_RESEND_SECONDS);
      toast.success('Yeni dogrulama kodu gonderildi.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const handleVerify = () => {
    const normalizedOtp = otpCode.replace(/\D/g, '');
    if (normalizedOtp.length !== 6) {
      setOtpError('OTP kodu 6 haneli olmali.');
      toast.error('Lutfen 6 haneli OTP kodu girin.');
      return;
    }

    setOtpError('');
    verifyMutation.mutate(normalizedOtp);
  };

  const handleResend = () => {
    if (remainingSeconds > 0 || resendMutation.isPending) {
      return;
    }

    resendMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-6 pt-20">
        <Text className="text-3xl font-bold text-slate-900">OTP Dogrula</Text>
        <Text className="mt-2 text-base text-slate-500">
          {phoneNumber} numarasina gonderilen 6 haneli kodu gir.
        </Text>

        <Input
          label="Dogrulama Kodu"
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
          label="Dogrula"
          isLoading={verifyMutation.isPending}
          onPress={handleVerify}
        />

        <View className="mt-5 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-slate-500">Kod gelmedi mi?</Text>
          {remainingSeconds > 0 ? (
            <Text className="text-sm font-semibold text-slate-700">
              Tekrar gonder ({remainingSeconds}s)
            </Text>
          ) : (
            <Text className="text-sm font-semibold text-blue-600" onPress={handleResend}>
              Kodu tekrar gonder
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
