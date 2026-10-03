'use client'

/**
 * المصدر الوحيد لتبديل الوضع الليلي/النهاري في كل النظام.
 * يطبّق الوضع على الصفحة، وعناصر المتصفح الأصلية (الحقول وأشرطة التمرير)،
 * ولون شريط الحالة في الهاتف — ويُبلغ كل أزرار التبديل حتى تبقى متطابقة.
 */
export type Theme = 'light' | 'dark'

/** لون شريط الحالة = لون خلفية الصفحة في كل وضع */
export const THEME_BAR_COLOR: Record<Theme, string> = { light: '#EEF2F6', dark: '#0F131A' }

export function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  const html = document.documentElement
  html.dataset.theme = theme
  html.classList.toggle('dark', theme === 'dark')
  html.style.colorScheme = theme
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', THEME_BAR_COLOR[theme]))
  try { localStorage.setItem('theme', theme) } catch { /* وضع التصفح الخاص */ }
  window.dispatchEvent(new CustomEvent<Theme>('theme-change', { detail: theme }))
}

/** يتابع تغيّر الوضع من أي زر آخر في الصفحة */
export function onThemeChange(cb: (t: Theme) => void): () => void {
  const h = (e: Event) => cb((e as CustomEvent<Theme>).detail)
  window.addEventListener('theme-change', h)
  return () => window.removeEventListener('theme-change', h)
}
