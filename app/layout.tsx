import type { Metadata, Viewport } from 'next'
import { Tajawal, Cairo } from 'next/font/google'
import '@/styles/globals.css'

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
})

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['600', '700', '800'],
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F6FA' },
    { media: '(prefers-color-scheme: dark)', color: '#091117' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" className={`${tajawal.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head>
        {/* Google Material Symbols & Modern Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap"
        />
        {/* Theme script to prevent flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');
              if(t)document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
        {children}
      </body>
    </html>
  )
}
