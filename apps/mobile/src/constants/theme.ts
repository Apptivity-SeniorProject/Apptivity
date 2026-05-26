/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  Apptivity Design System — Theme Tokens                                    ║
 * ║                                                                            ║
 * ║  Primary: #77e349 (Vibrant Lime Green)                                     ║
 * ║  Base: Light / White                                                       ║
 * ║  Font: Inter (sans-serif)                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// 1. COLOR PALETTE
// ─────────────────────────────────────────────────────────────────────────────

export const palette = {
  // Primary — #77e349
  primary: {
    50: '#f0fce8',
    100: '#ddf8cc',
    200: '#bbf09e',
    300: '#95e56b',
    400: '#77e349',
    500: '#5bcc2a',
    600: '#44a31e',
    700: '#357c1c',
    800: '#2d621b',
    900: '#28531b',
    950: '#112e09',
  },

  // Neutral — Sıcak gri tonları
  neutral: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // Semantic
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 2. SEMANTIC COLORS
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // ── Brand ──
  primary: palette.primary[400],
  primaryDark: palette.primary[600],
  primaryLight: palette.primary[50],
  primaryMuted: palette.primary[100],
  primaryForeground: palette.white,

  // ── Backgrounds ──
  background: palette.neutral[0],
  surface: palette.neutral[0],
  surfaceSecondary: palette.neutral[50],
  surfaceTertiary: palette.neutral[100],

  // ── Text ──
  text: palette.neutral[900],
  textSecondary: palette.neutral[500],
  textTertiary: palette.neutral[400],
  textDisabled: palette.neutral[300],
  textInverse: palette.white,

  // ── Border ──
  border: palette.neutral[200],
  borderStrong: palette.neutral[300],
  borderFocus: palette.primary[400],
  divider: palette.neutral[100],

  // ── Icons ──
  icon: palette.neutral[500],
  iconSecondary: palette.neutral[400],
  iconActive: palette.primary[500],

  // ── Tab Bar ──
  tabActive: palette.primary[500],
  tabInactive: palette.neutral[400],

  // ── Input ──
  inputBackground: palette.neutral[50],
  inputBorder: palette.neutral[200],
  inputBorderFocus: palette.primary[400],
  inputPlaceholder: palette.neutral[400],
  inputText: palette.neutral[900],

  // ── Semantic ──
  success: palette.success[500],
  successLight: palette.success[50],
  successMuted: palette.success[100],
  warning: palette.warning[500],
  warningLight: palette.warning[50],
  warningMuted: palette.warning[100],
  error: palette.error[500],
  errorLight: palette.error[50],
  errorMuted: palette.error[100],
  info: palette.info[500],
  infoLight: palette.info[50],
  infoMuted: palette.info[100],

  // ── Overlay ──
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.15)',

  // ── Skeleton / Shimmer ──
  skeleton: palette.neutral[200],
  skeletonHighlight: palette.neutral[100],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 3. TYPOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Font ailesi: Inter
 *
 * expo-google-fonts veya expo-font ile yüklenmeli.
 * Yüklenmediyse sistem fontuna fallback yapar.
 *
 * Kullanım:
 *   import { fontFamily } from '@/src/constants/theme';
 *   <Text style={{ fontFamily: fontFamily.medium }}>Merhaba</Text>
 *
 * NativeWind class karşılıkları:
 *   font-normal  → fontFamily.regular
 *   font-medium  → fontFamily.medium
 *   font-semibold → fontFamily.semibold
 *   font-bold    → fontFamily.bold
 */
export const fontFamily = {
  /** 400 — Normal gövde metinleri */
  regular: 'Inter_400Regular',
  /** 500 — Vurgulu gövde, alt başlık */
  medium: 'Inter_500Medium',
  /** 600 — Buton, chip, badge metinleri */
  semibold: 'Inter_600SemiBold',
  /** 700 — Başlık, sayfa adı */
  bold: 'Inter_700Bold',
  /** 800 — Hero metin, büyük başlıklar */
  extrabold: 'Inter_800ExtraBold',
} as const;

/**
 * Platform bazlı sistem fontu fallback.
 * Inter yüklenemezse kullanılır.
 */
export const systemFont = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'sans-serif',
    medium: 'sans-serif-medium',
    semibold: 'sans-serif-medium',
    bold: 'sans-serif-bold',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
});

/**
 * Tipografi ölçeği.
 *
 * Her seviye fontSize, lineHeight ve letterSpacing içerir.
 * lineHeight = fontSize × oran (genellikle 1.4 – 1.6).
 * letterSpacing negatif değerler büyük başlıkları sıkıştırır.
 */
export const typography = {
  /** Küçük etiket, caption — 11px */
  caption: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  /** Yardımcı metin, dipnot — 12px */
  xs: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  /** Küçük gövde, badge — 13px */
  sm: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.05,
  },
  /** Normal gövde metin — 15px */
  base: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  /** Büyük gövde, liste başlığı — 17px */
  lg: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  /** Section başlığı — 20px */
  xl: {
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  /** Sayfa başlığı — 24px */
  '2xl': {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  /** Hero / büyük başlık — 30px */
  '3xl': {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  /** Jumbo başlık — 36px */
  '4xl': {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.6,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 4. SPACING
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  /** 2px — ince ayar */
  '2xs': 2,
  /** 4px — iç boşluk minimum */
  xs: 4,
  /** 6px — ikon-metin arası */
  sm: 6,
  /** 8px — chip iç boşluk */
  md: 8,
  /** 12px — kart iç boşluk */
  lg: 12,
  /** 16px — standart padding */
  xl: 16,
  /** 20px — section padding */
  '2xl': 20,
  /** 24px — bölüm arası boşluk */
  '3xl': 24,
  /** 32px — büyük boşluk */
  '4xl': 32,
  /** 40px — sayfa üst boşluk */
  '5xl': 40,
  /** 48px — hero boşluk */
  '6xl': 48,
  /** 64px — ekstra büyük boşluk */
  '7xl': 64,

  /** Sayfa yatay padding (her iki taraf) */
  screenHorizontal: 16,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 5. BORDER RADIUS
// ─────────────────────────────────────────────────────────────────────────────

export const radius = {
  /** 4px — küçük chip */
  xs: 4,
  /** 6px — input, küçük kart */
  sm: 6,
  /** 10px — buton */
  md: 10,
  /** 14px — kart */
  lg: 14,
  /** 18px — modal, bottom sheet */
  xl: 18,
  /** 24px — büyük kart */
  '2xl': 24,
  /** Tam yuvarlak */
  full: 9999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 6. SHADOWS (iOS + Android)
// ─────────────────────────────────────────────────────────────────────────────

export const shadows = {
  /** Hafif — kart kenarları, liste öğeleri */
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  /** Orta — yüzen kart, dropdown */
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  /** Belirgin — modal, bottom sheet */
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  /** Ağır — FAB, floating element */
  xl: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 7. ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

export const animation = {
  /** Süreler (ms) */
  duration: {
    /** 100ms — micro interaction (press feedback) */
    instant: 100,
    /** 200ms — fade, scale */
    fast: 200,
    /** 300ms — slide, modal açılış */
    normal: 300,
    /** 450ms — sayfa geçişi */
    slow: 450,
    /** 700ms — splash, onboarding */
    slower: 700,
  },

  /** Easing değerleri (Reanimated / Animated API uyumlu) */
  easing: {
    /** Standart giriş-çıkış */
    default: [0.25, 0.1, 0.25, 1.0] as const,
    /** Yumuşak yavaşlama */
    easeOut: [0.0, 0.0, 0.2, 1.0] as const,
    /** Hızlı başlayıp yavaşlayan */
    easeIn: [0.4, 0.0, 1.0, 1.0] as const,
    /** Zıplama efekti */
    spring: [0.34, 1.56, 0.64, 1.0] as const,
  },

  /** Spring konfigürasyonu (Reanimated withSpring) */
  spring: {
    /** Hızlı, az zıplama — buton press */
    snappy: { damping: 20, stiffness: 300, mass: 0.8 },
    /** Orta hız — kart animasyonu */
    gentle: { damping: 15, stiffness: 150, mass: 1 },
    /** Yavaş, belirgin zıplama — modal / bottom sheet */
    bouncy: { damping: 12, stiffness: 100, mass: 1.2 },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 8. Z-INDEX LAYERS
// ─────────────────────────────────────────────────────────────────────────────

export const zIndex = {
  /** Gömülü (dropdown arkası) */
  behind: -1,
  /** Varsayılan */
  base: 0,
  /** Yapışkan header */
  sticky: 10,
  /** Dropdown, tooltip */
  dropdown: 20,
  /** Floating action button */
  fab: 30,
  /** Modal overlay */
  modal: 40,
  /** Toast bildirim */
  toast: 50,
  /** Splash / tam ekran üst katman */
  splash: 60,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 9. LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const layout = {
  /** Tab bar yüksekliği (safe area hariç) */
  tabBarHeight: 56,
  /** Header yüksekliği */
  headerHeight: 56,
  /** Bottom sheet handle yüksekliği */
  sheetHandleHeight: 24,
  /** Minimum dokunma hedefi (Apple HIG: 44pt, Material: 48dp) */
  minTouchTarget: 44,
  /** Maksimum içerik genişliği (tablet'te ortala) */
  maxContentWidth: 480,
  /** Kart yüksekliği (compact) */
  cardHeightCompact: 80,
  /** Kart yüksekliği (normal) */
  cardHeightNormal: 120,
  /** Avatar boyutları */
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
  },
  /** İkon boyutları */
  iconSize: {
    xs: 14,
    sm: 18,
    md: 22,
    lg: 26,
    xl: 30,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 10. OPACITY
// ─────────────────────────────────────────────────────────────────────────────

export const opacity = {
  /** Devre dışı bileşen */
  disabled: 0.4,
  /** Basılı durum feedback */
  pressed: 0.7,
  /** Hover / focus */
  hover: 0.85,
  /** Tam görünür */
  full: 1,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 11. GRADIENTS (renk dizileri — LinearGradient ile kullanılır)
// ─────────────────────────────────────────────────────────────────────────────

export const gradients = {
  /** Marka gradient — primary tonları */
  primary: [palette.primary[300], palette.primary[500]] as const,
  /** Marka gradient genişletilmiş */
  primaryWide: [palette.primary[200], palette.primary[400], palette.primary[600]] as const,
  /** Hafif kart üst overlay */
  cardFade: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)'] as const,
  /** Sayfa alt fade */
  bottomFade: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'] as const,
  /** Skeleton shimmer */
  shimmer: [palette.neutral[200], palette.neutral[100], palette.neutral[200]] as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 12. HIT SLOP (dokunma toleransı)
// ─────────────────────────────────────────────────────────────────────────────

export const hitSlop = {
  /** Küçük ikonlar / kapatma butonları */
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  /** Normal butonlar */
  md: { top: 12, bottom: 12, left: 12, right: 12 },
  /** Geniş dokunma alanı (geri butonu vb.) */
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY — Tab Layout + RootNavigator uyumluluğu
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    icon: colors.icon,
    tabIconDefault: colors.tabInactive,
    tabIconSelected: colors.tabActive,
  },
  dark: {
    text: '#ECEDEE',
    background: '#0F1115',
    tint: palette.primary[300],
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: palette.primary[300],
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const theme = {
  colors,
  palette,
  fontFamily,
  typography,
  spacing,
  radius,
  shadows,
  animation,
  zIndex,
  layout,
  opacity,
  gradients,
  hitSlop,
} as const;

export type Theme = typeof theme;

export default theme;
