import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

/** لون من متغير CSS يدعم الشفافية (bg-primary/90 ...). بدونه Tailwind يتجاهل /NN بصمت */
const v = (name: string) => `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`

const config: Config = {
  // الـ hover يشتغل فقط على الأجهزة اللي بيها ماوس — يمنع بقاء الصف ملوّن بعد اللمس على الموبايل
  future: { hoverOnlyWhenSupported: true },
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Standard Semantic Tokens (Linear / Vercel design standards)
        background: v('--bg'),
        foreground: v('--text'),
        card: {
          DEFAULT: v('--surface'),
          foreground: v('--text'),
        },
        popover: {
          DEFAULT: v('--surface'),
          foreground: v('--text'),
        },
        primary: {
          DEFAULT: v('--accent'),
          foreground: '#FFFFFF',
          soft: v('--accent-soft'),
        },
        secondary: {
          DEFAULT: v('--surface-2'),
          foreground: v('--text'),
          soft: v('--surface-3'),
        },
        muted: {
          DEFAULT: v('--surface-2'),
          foreground: v('--text-3'),
        },
        accent: {
          DEFAULT: v('--accent'),
          foreground: '#FFFFFF',
          soft: v('--accent-soft'),
        },
        destructive: {
          DEFAULT: v('--bad'),
          foreground: '#FFFFFF',
          soft: v('--bad-soft'),
        },
        success: {
          DEFAULT: v('--ok'),
          foreground: '#FFFFFF',
          soft: v('--ok-soft'),
        },
        warning: {
          DEFAULT: v('--warn'),
          foreground: '#0F172A',
          soft: v('--warn-soft'),
        },
        border: v('--line'),
        'border-soft': v('--line-soft'),
        'border-glass': v('--glass-border'),
        input: v('--line'),
        ring: v('--accent'),

        // Backwards-Compatible Tokens
        bg: v('--bg'),
        surface: v('--surface'),
        surface2: v('--surface-2'),
        surface3: v('--surface-3'),
        line: v('--line'),
        lineSoft: v('--line-soft'),
        text: {
          DEFAULT: v('--text'),
          2: v('--text-2'),
          3: v('--text-3'),
        },
        'surface-2': v('--surface-2'),
        'surface-3': v('--surface-3'),
        'line-soft': v('--line-soft'),
        text2: v('--text-2'),
        text3: v('--text-3'),
        ok: v('--ok'),
        okSoft: v('--ok-soft'),
        warn: v('--warn'),
        warnSoft: v('--warn-soft'),
        bad: v('--bad'),
        badSoft: v('--bad-soft'),
      },
      fontFamily: {
        ui: ['var(--font-ui)'],
        display: ['var(--font-display)'],
        sans: ['var(--font-ui)'],
      },
      borderRadius: {
        sm: 'var(--r-sm)', // 6px
        md: 'var(--r-md)', // 10px
        lg: 'var(--r-lg)', // 14px
        xl: 'var(--r-xl)', // 18px
        '2xl': '22px',
        '3xl': '28px',
        full: '9999px',
      },
      boxShadow: {
        '2xs': '0 1px 1px 0 rgba(0, 0, 0, 0.04)',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        popover: 'var(--shadow-3)',
        glass: 'var(--glass-shadow)',
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
      },
      spacing: { 4.5: '1.125rem', 5.5: '1.375rem' },
      borderWidth: { 1.5: '1.5px', 3: '3px' },
      scale: { 98: '.98' },
      opacity: { 12: '.12' },
      dropShadow: { '2xs': '0 1px 1px rgba(0,0,0,.05)' },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-4px)' },
          '40%,80%': { transform: 'translateX(4px)' },
        },
      },
      animation: { shake: 'shake .4s ease-in-out' },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.32,.72,0,1)',
      },
    },
  },
  plugins: [animate],
}

export default config
