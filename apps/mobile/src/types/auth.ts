export type AccountRole = 'Individual' | 'Organization' | 'Admin';

export interface AuthUser {
  id: string;
  phoneNumber: string;
  email?: string;
  fullName?: string;
  role?: AccountRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Login ───────────────────────────────────────────────────────────────────

export interface LoginRequestDto {
  identifier: string;
  password: string;
  deviceId: string;
}

export interface LoginResponseDto {
  accessToken?: string;
  refreshToken?: string;
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

export interface SendOtpRequestDto {
  phoneNumber: string;
}

export interface VerifyOtpRequestDto {
  code: string;
  deviceId: string;
}

export interface VerifyOtpResponseDto {
  accessToken: string;
  refreshToken: string;
}

// ─── Register ────────────────────────────────────────────────────────────────

export interface RegisterIndividualRequestDto {
  username: string;
  phone: string;
  email?: string;
  password: string;
  name: string;
  surname: string;
  birthdate?: string;
  gender?: string;
  bio?: string;
  deviceId: string;
}

export interface RegisterResponseDto {
  accessToken: string;
  refreshToken: string;
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

export interface RefreshTokenRequestDto {
  refreshToken: string;
  deviceId: string;
}
