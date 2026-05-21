import type { AuthUser } from '@/src/types/auth';

interface TokenPayload {
  sub?: string;
  phone_number?: string;
  phoneNumber?: string;
}

function parseJwtPayload(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as TokenPayload;
  } catch {
    return null;
  }
}

export function buildAuthUser(accessToken: string, fallbackPhoneNumber?: string): AuthUser {
  const payload = parseJwtPayload(accessToken);

  return {
    id: payload?.sub ?? 'unknown-user',
    phoneNumber: payload?.phone_number ?? payload?.phoneNumber ?? fallbackPhoneNumber ?? '',
  };
}
