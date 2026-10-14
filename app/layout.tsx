import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import { MATERIAL_ICONS_HREF } from '@/lib/icon-names'
import { Toaster } from '@/components/ui/Toaster'
import { ConfirmHost } from '@/components/ui/ConfirmDialog'
import { ModalManager } from '@/components/ui/ModalManager'
import { TableStacker } from '@/components/ui/TableStacker'
import { BoosthisScript } from '@/components/BoosthisScript'
import { QueryProvider } from '@/components/providers/QueryProvider'
import '@/styles/globals.css'

// IBM Plex Sans Arabic: أوضح للأرقام والنص العربي في الجداول (أوزانه حتى 700؛ الأثقل يُعرض 700)
const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'مكتب المحامي عبدالحسن الخزرجي | Legal ERP',
  description: 'نظام إدارة معاملات ومهام المكتب القانوني والمؤسسات',
  // الاسم الظاهر تحت الأيقونة عند الإضافة لشاشة آيفون الرئيسية — ويظهر أيضاً في سطر «from …» بإشعارات الآيفون
  appleWebApp: { capable: true, title: 'مكتب المحامي عبدالحسن الخزرجي', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" data-scroll-behavior="smooth" className={plex.variable} suppressHydrationWarning>
      <head>
        <meta id="theme-color-meta" name="theme-color" content="#EEF2F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Google Material Symbols — display=swap prevents render blocking */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href={MATERIAL_ICONS_HREF}
        />

        {/* Theme script to prevent flicker, set theme-color for iOS status bar, and initialize theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              if (localStorage.getItem('side-collapsed') === '1') document.documentElement.classList.add('side-collapsed');
              var t = localStorage.getItem('theme') || 'light';
              document.documentElement.dataset.theme = t;
              if (t === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
              var color = t === 'dark' ? '#0F131A' : '#EEF2F6';
              document.documentElement.style.colorScheme = t;
              var meta = document.getElementById('theme-color-meta');
              if (meta) { meta.setAttribute('content', color); }
              var allMetas = document.querySelectorAll('meta[name="theme-color"]');
              for (var i = 0; i < allMetas.length; i++) {
                allMetas[i].setAttribute('content', color);
              }
            } catch(e) {}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
        <QueryProvider>
          <Toaster />
          <ConfirmHost />
          <ModalManager />
            <TableStacker />
            <BoosthisScript />
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
