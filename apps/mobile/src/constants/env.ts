const DEFAULT_API_BASE_URL = 'https://api.example.com';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL
);

export const CHAT_HUB_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_CHAT_HUB_URL ?? `${API_BASE_URL}/hubs/chat`
);
