import { apiClient } from '@/src/api/apiClient';
import { DEFAULT_LOGIN_PASSWORD } from '@/src/constants/env';
import type { ApiEnvelope } from '@/src/types/api';
import type {
  LoginRequestDto,
  LoginResponseDto,
  SendOtpRequestDto,
  VerifyOtpRequestDto,
  VerifyOtpResponseDto,
} from '@/src/types/auth';
import { getOrCreateDeviceId } from '@/src/utils/device';

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'Istek basarisiz.');
}

export async function login(payload: LoginRequestDto): Promise<LoginResponseDto> {
  const response = await apiClient.post<ApiEnvelope<LoginResponseDto>>('/api/auth/login', payload, {
    headers: {
      'x-skip-auth-refresh': 'true',
    },
  });
  return unwrapEnvelope(response.data);
}

export async function loginWithPhoneNumber(phoneNumber: string): Promise<LoginResponseDto> {
  const deviceId = await getOrCreateDeviceId();
  return login({
    identifier: phoneNumber,
    password: DEFAULT_LOGIN_PASSWORD,
    deviceId,
  });
}

export async function sendOtp(payload: SendOtpRequestDto): Promise<void> {
  const response = await apiClient.post<ApiEnvelope<null>>('/api/auth/send-otp', payload, {
    headers: {
      'x-skip-auth-refresh': 'true',
    },
  });

  if (!response.data.isSuccess) {
    throw new Error(response.data.errors?.[0]?.message ?? 'OTP gonderimi basarisiz.');
  }
}

export async function verifyOtp(payload: VerifyOtpRequestDto): Promise<VerifyOtpResponseDto> {
  const response = await apiClient.post<ApiEnvelope<VerifyOtpResponseDto>>(
    '/api/auth/verify-otp',
    payload,
    {
      headers: {
        'x-skip-auth-refresh': 'true',
      },
    }
  );
  return unwrapEnvelope(response.data);
}

export async function verifyOtpCode(code: string): Promise<VerifyOtpResponseDto> {
  const deviceId = await getOrCreateDeviceId();
  return verifyOtp({
    code,
    deviceId,
  });
}
