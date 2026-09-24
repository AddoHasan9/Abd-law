import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import { Toaster } from '@/components/ui/Toaster'
import { ConfirmHost } from '@/components/ui/ConfirmDialog'
import { QueryProvider } from '@/components/providers/QueryProvider'
import '@/styles/globals.css'

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'مكتب المحامي عبدالحسن الخزرجي | Legal ERP',
  description: 'نظام إدارة معاملات ومهام المكتب القانوني والمؤسسات',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" data-scroll-behavior="smooth" className={cairo.variable} suppressHydrationWarning>
      <head>
        <meta id="theme-color-meta" name="theme-color" content="#FFFFFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Google Material Symbols — display=swap prevents render blocking */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />

        {/* Theme script to prevent flicker, set theme-color for iOS status bar, and initialize theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              var t = localStorage.getItem('theme') || 'light';
              document.documentElement.dataset.theme = t;
              if (t === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
              var color = t === 'dark' ? '#0F131A' : '#FFFFFF';
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
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
