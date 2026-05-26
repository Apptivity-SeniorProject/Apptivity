import type { AccountRole, AuthUser } from '@/src/types/auth';

interface TokenPayload {
  [key: string]: unknown;
  sub?: string;
  phone_number?: string;
  phoneNumber?: string;
  role?: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string;
}

export interface ParsedAuthToken {
  userId?: string;
  phoneNumber?: string;
  role?: AccountRole;
}

function normalizeRole(value: unknown): AccountRole | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (normalized === 'individual') return 'Individual';
  if (normalized === 'organization') return 'Organization';
  if (normalized === 'admin') return 'Admin';
  return undefined;
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

export function parseAuthToken(accessToken: string): ParsedAuthToken | null {
  const payload = parseJwtPayload(accessToken);
  if (!payload) {
    return null;
  }

  return {
    userId: payload.sub,
    phoneNumber:
      (typeof payload.phone_number === 'string' ? payload.phone_number : undefined) ??
      (typeof payload.phoneNumber === 'string' ? payload.phoneNumber : undefined),
    role: normalizeRole(
      payload.role ?? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
    ),
  };
}

export function buildAuthUser(accessToken: string, fallbackPhoneNumber?: string): AuthUser {
  const parsed = parseAuthToken(accessToken);

  return {
    id: parsed?.userId ?? 'unknown-user',
    phoneNumber: parsed?.phoneNumber ?? fallbackPhoneNumber ?? '',
    role: parsed?.role,
  };
}
