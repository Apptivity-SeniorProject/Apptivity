/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // ── Colors ──
      colors: {
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
          DEFAULT: '#77e349',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F9FAFB',
          tertiary: '#F3F4F6',
        },
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          DEFAULT: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          DEFAULT: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          DEFAULT: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          DEFAULT: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
      },

      // ── Font Family ──
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
        'sans-extrabold': ['Inter_800ExtraBold'],
      },

      // ── Font Size (tipografi ölçeği) ──
      fontSize: {
        'caption': ['11px', { lineHeight: '16px', letterSpacing: '0.2px' }],
        'xs': ['12px', { lineHeight: '16px', letterSpacing: '0.1px' }],
        'sm': ['13px', { lineHeight: '18px', letterSpacing: '0.05px' }],
        'base': ['15px', { lineHeight: '22px', letterSpacing: '0px' }],
        'lg': ['17px', { lineHeight: '24px', letterSpacing: '-0.1px' }],
        'xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.2px' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.3px' }],
        '3xl': ['30px', { lineHeight: '38px', letterSpacing: '-0.5px' }],
        '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.6px' }],
      },

      // ── Border Radius ──
      borderRadius: {
        'xs': '4px',
        'card': '14px',
        'button': '10px',
        'sheet': '18px',
        'badge': '6px',
      },

      // ── Spacing ──
      spacing: {
        'screen-x': '16px',
      },
    },
  },
  plugins: [],
};
