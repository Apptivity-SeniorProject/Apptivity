export interface AuthUser {
  id: string;
  phoneNumber: string;
  email?: string;
  fullName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequestDto {
  identifier: string;
  password: string;
  deviceId: string;
}

export interface LoginResponseDto {
  accessToken?: string;
  refreshToken?: string;
}

export interface VerifyOtpRequestDto {
  phoneNumber: string;
  code: string;
  deviceId: string;
}

export interface VerifyOtpResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
  deviceId: string;
}
