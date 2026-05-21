export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com';

function normalizeChatHubUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/hubs/chat')) {
    return trimmed;
  }
  if (trimmed.endsWith('/chatHub')) {
    return `${trimmed.slice(0, -8)}/hubs/chat`;
  }
  return `${trimmed}/hubs/chat`;
}

export const CHAT_HUB_URL = normalizeChatHubUrl(
  process.env.EXPO_PUBLIC_CHAT_HUB_URL ?? 'http://192.168.1.100:5000/hubs/chat'
);
export const DEFAULT_LOGIN_PASSWORD =
  process.env.EXPO_PUBLIC_DEFAULT_LOGIN_PASSWORD ?? 'DEFAULT_OR_USER_PASSWORD';
