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
  phoneNumber: string;
}

export interface LoginResponseDto {
  success: boolean;
  verificationId?: string;
  resendAfterSeconds?: number;
}

export interface VerifyOtpRequestDto {
  phoneNumber: string;
  otpCode: string;
  verificationId?: string;
}

export interface VerifyOtpResponseDto {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
