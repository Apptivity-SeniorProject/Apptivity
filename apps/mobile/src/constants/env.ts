export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com';
export const CHAT_HUB_URL = `${API_BASE_URL.replace(/\/+$/, '')}/hubs/chat`;
export const DEFAULT_LOGIN_PASSWORD =
  process.env.EXPO_PUBLIC_DEFAULT_LOGIN_PASSWORD ?? 'DEFAULT_OR_USER_PASSWORD';
