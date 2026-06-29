import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        base: 'var(--base)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        gold: 'var(--gold)',
        emerald: {
          DEFAULT: 'var(--emerald)',
          400: 'var(--emerald)',
        },
        red: {
          DEFAULT: 'var(--red)',
          400: 'var(--red)',
          500: 'var(--red)',
        },
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        border: 'var(--border)',
        'border-2': 'var(--border-2)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      boxShadow: {
        md: '0 4px 12px rgba(0, 0, 0, 0.15)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.6875rem', { lineHeight: '1.15' }],
        sm: ['0.875rem', { lineHeight: '1.65' }],
        base: ['1rem', { lineHeight: '1.65' }],
        lg: ['1.0625rem', { lineHeight: '1.72' }],
        xl: ['1.25rem', { lineHeight: '1.25' }],
        '2xl': ['1.625rem', { lineHeight: '1.15' }],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      spacing: {
        'safe-inset-t': 'max(0px, env(safe-area-inset-top))',
        'safe-inset-b': 'max(0px, env(safe-area-inset-bottom))',
      },
      zIndex: {
        100: '100',
      },
    },
  },
  plugins: [],
} satisfies Config;
