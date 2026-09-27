import type { NextConfig } from 'next'

/**
 * سياسة أمان المحتوى (CSP): تحدد من أين يُسمح بتحميل السكربتات والصور والاتصالات.
 * أي سكربت محقون من مصدر خارجي يُرفض تلقائياً حتى لو وُجدت ثغرة في مكان ما.
 * 'unsafe-inline' مطلوب لسكربتات Next.js المضمّنة؛ 'unsafe-eval' في وضع التطوير فقط.
 */
const isDev = process.env.NODE_ENV !== 'production'
const supabase = 'https://*.supabase.co'
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://vercel.live`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${supabase}`,
  `connect-src 'self' ${supabase} wss://*.supabase.co https://vercel.live wss://ws-us3.pusher.com`,
  "worker-src 'self' blob:",
  // معاينة ملفات الباركود (PDF محفوظ كـ data:) وشريط معاينة Vercel
  "frame-src 'self' data: blob: https://vercel.live",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ')

const config: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // لا تكشف إصدار الإطار في ترويسة الاستجابة
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // يفرض HTTPS لمدة سنتين على المتصفح (بما في ذلك النطاقات الفرعية)
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        // يمنع الوصول لواجهات الجهاز الحسّاسة من صفحات المكتب
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Content-Security-Policy', value: csp },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ],
    }]
  },
}

export default config
