const DEFAULT_API_BASE_URL = 'https://api.example.com';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function resolveChatHubUrl(apiBaseUrl: string, explicitChatHubUrl?: string): string {
  const fallback = `${apiBaseUrl}/hubs/chat`;
  const normalizedChatHubUrl = explicitChatHubUrl ? normalizeBaseUrl(explicitChatHubUrl) : fallback;

  try {
    const apiUrl = new URL(apiBaseUrl);
    const chatUrl = new URL(normalizedChatHubUrl);

    // Mobile device/emulator often cannot reach backend when hub URL points to localhost.
    // In that case, use API host with chat path.
    if (isLoopbackHost(chatUrl.hostname) && !isLoopbackHost(apiUrl.hostname)) {
      return `${apiUrl.origin}${chatUrl.pathname || '/hubs/chat'}`;
    }

    return chatUrl.toString().replace(/\/+$/, '');
  } catch {
    return normalizedChatHubUrl;
  }
}

export const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL
);

export const CHAT_HUB_URL = resolveChatHubUrl(
  API_BASE_URL,
  process.env.EXPO_PUBLIC_CHAT_HUB_URL
);
