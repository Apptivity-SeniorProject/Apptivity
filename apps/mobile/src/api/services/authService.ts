import { apiClient } from '@/src/api/apiClient';
import type {
  LoginRequestDto,
  LoginResponseDto,
  RefreshTokenRequestDto,
} from '@/src/types/auth';

export async function login(payload: LoginRequestDto): Promise<LoginResponseDto> {
  const response = await apiClient.post<LoginResponseDto>('/auth/login', payload);
  return response.data;
}

export async function refreshAccessToken(
  payload: RefreshTokenRequestDto
): Promise<LoginResponseDto> {
  const response = await apiClient.post<LoginResponseDto>('/auth/refresh', payload);
  return response.data;
}
