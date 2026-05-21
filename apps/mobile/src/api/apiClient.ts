import axios, {
  AxiosError,
  create as createAxios,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '@/src/constants/env';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { ApiEnvelope } from '@/src/types/api';
import type { VerifyOtpResponseDto } from '@/src/types/auth';
import { getOrCreateDeviceId } from '@/src/utils/device';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let pendingQueue: {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}[] = [];

async function persistAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  const raw = await AsyncStorage.getItem('auth-storage');
  const parsed = raw ? (JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }) : {};

  const next = {
    state: {
      ...(parsed.state ?? {}),
      accessToken,
      refreshToken,
    },
    version: parsed.version ?? 0,
  };

  await AsyncStorage.setItem('auth-storage', JSON.stringify(next));
}

function flushQueue(error: unknown, accessToken: string | null): void {
  pendingQueue.forEach((queueItem) => {
    if (error) {
      queueItem.reject(error);
      return;
    }

    if (accessToken) {
      queueItem.resolve(accessToken);
      return;
    }

    queueItem.reject(new Error('Access token alinamadi.'));
  });

  pendingQueue = [];
}

function shouldSkipRefresh(config?: AxiosRequestConfig): boolean {
  if (!config) {
    return false;
  }

  const skipHeader = config.headers?.['x-skip-auth-refresh'];
  return Boolean(skipHeader);
}

function isRefreshRequest(config?: AxiosRequestConfig): boolean {
  const url = config?.url ?? '';
  return url.includes('/api/auth/refresh');
}

async function refreshTokens(): Promise<VerifyOtpResponseDto> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    throw new Error('Refresh token yok.');
  }

  const deviceId = await getOrCreateDeviceId();
  const response = await axios.post<ApiEnvelope<VerifyOtpResponseDto>>(
    `${API_BASE_URL}/api/auth/refresh`,
    {
      refreshToken,
      deviceId,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-skip-auth-refresh': 'true',
      },
    }
  );

  if (response.data.isSuccess && response.data.data) {
    return response.data.data;
  }

  throw new Error(response.data.errors?.[0]?.message ?? 'Token yenileme basarisiz.');
}

export const apiClient = createAxios({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const shouldHandleRefresh =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest) &&
      !isRefreshRequest(originalRequest);

    if (!shouldHandleRefresh) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshed = await refreshTokens();
      useAuthStore.getState().setTokens(refreshed.accessToken, refreshed.refreshToken);
      await persistAuthTokens(refreshed.accessToken, refreshed.refreshToken);
      flushQueue(null, refreshed.accessToken);
      originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
