import type { MetadataRoute } from 'next'

/** بيانات التطبيق عند الإضافة للشاشة الرئيسية (أندرويد/كروم) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'مكتب المحامي عبدالحسن الخزرجي',
    short_name: 'مكتب الخزرجي',
    description: 'نظام إدارة معاملات ومهام المكتب القانوني',
    start_url: '/dashboard',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#FFFFFF',
    theme_color: '#1E2B4A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
