import { apiClient } from '@/src/api/apiClient';
import type {
  LoginRequestDto,
  LoginResponseDto,
  VerifyOtpRequestDto,
  VerifyOtpResponseDto,
} from '@/src/types/auth';

export async function requestLoginOtp(payload: LoginRequestDto): Promise<LoginResponseDto> {
  const response = await apiClient.post<LoginResponseDto>('/api/auth/login', payload);
  return response.data;
}

export async function verifyOtp(payload: VerifyOtpRequestDto): Promise<VerifyOtpResponseDto> {
  const response = await apiClient.post<VerifyOtpResponseDto>('/api/auth/verify-otp', payload);
  return response.data;
}
