/**
 * صفحة تسجيل الدخول
 * ------------------------------------------------------------
 * مكوّن خادمي بسيط يعرض النموذج. المصادقة نفسها تجري في
 * مكوّن العميل LoginForm عبر Supabase Auth.
 */
import LoginForm from './LoginForm'
import { IconSprite } from '@/components/ui/Icon'

export const metadata = { title: 'تسجيل الدخول — مكتب المحامي عبد الحسن الخزرجي' }

export default function LoginPage() {
  return (
    <>
      <IconSprite />
      <main id="login">
        {/* توهّج ذهبي خافت جدًا أعلى الشاشة — بلا حركة */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72"
          style={{
            background:
              'radial-gradient(65% 100% at 50% 0%, rgba(212,175,55,0.10), transparent 72%)',
          }}
        />
        <LoginForm />
      </main>
    </>
  )
}
