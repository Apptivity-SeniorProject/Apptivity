import { apiClient } from '@/src/api/apiClient';
import type { ApiEnvelope } from '@/src/types/api';
import type {
  LoginRequestDto,
  LoginResponseDto,
  VerifyOtpRequestDto,
  VerifyOtpResponseDto,
} from '@/src/types/auth';

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'Istek basarisiz.');
}

export async function requestLoginOtp(payload: LoginRequestDto): Promise<LoginResponseDto> {
  const response = await apiClient.post<ApiEnvelope<LoginResponseDto>>('/api/auth/login', payload, {
    headers: {
      'x-skip-auth-refresh': 'true',
    },
  });
  return unwrapEnvelope(response.data);
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
