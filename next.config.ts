import type { NextConfig } from 'next'

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
      ],
    }]
  },
}

export default config
