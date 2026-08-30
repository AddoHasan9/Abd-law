import type { Viewport } from 'next'

/**
 * تخطيط صفحات الدخول — يثبّت لون شريط المتصفح على نفس خلفية الصفحة
 * الداكنة حتى يبدو الأعلى والأسفل موحّدَين مع الصفحة على iOS/Safari.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B1220',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
