import type { Config } from 'tailwindcss'

const config: Config = {
  // الـ hover يشتغل فقط على الأجهزة اللي بيها ماوس — يمنع بقاء الصف ملوّن بعد اللمس على الموبايل
  future: { hoverOnlyWhenSupported: true },
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Standard Semantic Tokens (Linear / Vercel design standards)
        background: 'var(--bg)',
        foreground: 'var(--text)',
        card: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--text)',
        },
        popover: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--text)',
        },
        primary: {
          DEFAULT: 'var(--accent)',
          foreground: '#FFFFFF',
          soft: 'var(--accent-soft)',
        },
        secondary: {
          DEFAULT: 'var(--surface-2)',
          foreground: 'var(--text)',
          soft: 'var(--surface-3)',
        },
        muted: {
          DEFAULT: 'var(--surface-2)',
          foreground: 'var(--text-3)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: '#FFFFFF',
          soft: 'var(--accent-soft)',
        },
        destructive: {
          DEFAULT: 'var(--bad)',
          foreground: '#FFFFFF',
          soft: 'var(--bad-soft)',
        },
        success: {
          DEFAULT: 'var(--ok)',
          foreground: '#FFFFFF',
          soft: 'var(--ok-soft)',
        },
        warning: {
          DEFAULT: 'var(--warn)',
          foreground: '#0F172A',
          soft: 'var(--warn-soft)',
        },
        border: 'var(--line)',
        'border-soft': 'var(--line-soft)',
        'border-glass': 'var(--glass-border)',
        input: 'var(--line)',
        ring: 'var(--accent)',

        // Backwards-Compatible Tokens
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        surface3: 'var(--surface-3)',
        line: 'var(--line)',
        lineSoft: 'var(--line-soft)',
        text: 'var(--text)',
        text2: 'var(--text-2)',
        text3: 'var(--text-3)',
        ok: 'var(--ok)',
        okSoft: 'var(--ok-soft)',
        warn: 'var(--warn)',
        warnSoft: 'var(--warn-soft)',
        bad: 'var(--bad)',
        badSoft: 'var(--bad-soft)',
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
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.32,.72,0,1)',
      },
    },
  },
  plugins: [],
}

export default config
