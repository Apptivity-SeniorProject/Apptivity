import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = 'https://api.example.com';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isPrivateHost(hostname: string): boolean {
  if (isLoopbackHost(hostname)) {
    return true;
  }

  return (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

function extractExpoHostName(candidate?: string | null): string | null {
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = trimmed.includes('://') ? new URL(trimmed) : new URL(`http://${trimmed}`);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

function resolveExpoDevHostName(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.linkingUri,
  ];

  for (const candidate of candidates) {
    const hostName = extractExpoHostName(candidate);
    if (hostName) {
      return hostName;
    }
  }

  return null;
}

function resolveApiBaseUrl(rawValue: string): string {
  const normalized = normalizeBaseUrl(rawValue);

  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (!isPrivateHost(parsed.hostname)) {
      return normalized;
    }

    const expoHostName = resolveExpoDevHostName();
    if (!expoHostName || expoHostName === parsed.hostname) {
      return normalized;
    }

    parsed.hostname = expoHostName;
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return normalized;
  }
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
  resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL)
);

export const CHAT_HUB_URL = resolveChatHubUrl(
  API_BASE_URL,
  process.env.EXPO_PUBLIC_CHAT_HUB_URL
);
