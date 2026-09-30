'use client'

import Script from 'next/script'

/**
 * قياس الأداء عبر Boosthis (سرعة الصفحات، الأخطاء، الطلبات).
 * - يعمل على Vercel فقط (معطّل في التطوير المحلي).
 * - الزر العائم مخفي (data-bubble="off") — القياس يعمل دون أن يراه المستخدمون.
 * - مفتاح المشروع مصمّم ليكون ظاهراً في الصفحة؛ مفتاح القراءة لا يوضع هنا أبداً.
 * - معرّف التثبيت ثابت: تغييره يسجّل «جهازاً» جديداً مكرراً في لوحة Boosthis.
 */
const PROJECT_KEY = 'bk_2f92d77cfdb4dfc0a52158c9804ac3f220c823ca286353d1e720d78304f4ccd8'
const INSTALL_ID = '7ee3aa6b-7223-4954-99dd-b074f85a5e85'

export function BoosthisScript() {
  if (process.env.NODE_ENV !== 'production') return null
  return (
    <Script
      id="boosthis-kit"
      src="https://www.boosthis.com/kit.js"
      strategy="afterInteractive"
      data-key={PROJECT_KEY}
      data-install={INSTALL_ID}
      data-project="lawyer-office"
      data-bubble="off"
      onError={() => console.error('[boosthis] Boosthis did not load: https://www.boosthis.com/kit.js never arrived, so nothing is measuring. Check the address, the network, and any Content-Security-Policy.')}
    />
  )
}
