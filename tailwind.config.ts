import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', surface: 'var(--surface)', surface2: 'var(--surface-2)',
        surface3: 'var(--surface-3)', line: 'var(--line)', lineSoft: 'var(--line-soft)',
        text: 'var(--text)', text2: 'var(--text-2)', text3: 'var(--text-3)',
        accent: 'var(--accent)', accentSoft: 'var(--accent-soft)',
        ok: 'var(--ok)', okSoft: 'var(--ok-soft)', warn: 'var(--warn)', warnSoft: 'var(--warn-soft)',
        bad: 'var(--bad)', badSoft: 'var(--bad-soft)',
      },
      fontFamily: { ui: ['var(--font-ui)'], display: ['var(--font-display)'] },
      borderRadius: { sm: 'var(--r-sm)', md: 'var(--r-md)', lg: 'var(--r-lg)', xl: 'var(--r-xl)', full: 'var(--r-full)' },
      boxShadow: { 1: 'var(--shadow-1)', 2: 'var(--shadow-2)', 3: 'var(--shadow-3)' },
      transitionTimingFunction: { smooth: 'cubic-bezier(.32,.72,0,1)' },
    },
  },
  plugins: [],
}
export default config
