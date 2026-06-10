export const ERROR_CODE_MESSAGES: Record<string, string> = {
  INVALID_PHONE_NUMBER: 'Telefon numarası geçersiz.',
  OTP_INVALID: 'Doğrulama kodu hatalı.',
  OTP_EXPIRED: 'Doğrulama kodunun süresi doldu.',
  OTP_TOO_MANY_ATTEMPTS: 'Çok fazla hatalı deneme yaptınız.',
  OTP_REQUIRED: 'Doğrulama kodu gerekli.',
  UNAUTHORIZED: 'Oturum doğrulanamadı.',
  REPORT_400_SELF: 'Kendi hesabını veya kendi etkinliğini raporlayamazsın.',
  IMG_CONFIG_MISSING: 'Görsel servisi şu an hazır değil. Etkinlik oluştu ama fotoğraf yüklenemedi.',
  EVENT_400_FULL: 'Etkinliğin kontenjanı dolu.',
  EVENT_404: 'Etkinlik bulunamadı.',
};
