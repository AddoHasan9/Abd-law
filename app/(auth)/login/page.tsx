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
      <div id="login" className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-950">
        {/* Animated Background Mesh & Glowing Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Subtle Grid Texture */}
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* Golden/Warm Glow Orb */}
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-40 animate-pulse"
            style={{
              background: 'radial-gradient(circle, #D97706 0%, #B45309 60%, transparent 100%)',
              animationDuration: '8s',
            }}
          />

          {/* Blue/Navy Glow Orb */}
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-35 animate-pulse"
            style={{
              background: 'radial-gradient(circle, #3B82F6 0%, #1D4ED8 60%, transparent 100%)',
              animationDuration: '10s',
            }}
          />

          {/* Center Subtle Accent Orb */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl opacity-15 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #F59E0B 0%, #3B82F6 50%, transparent 100%)',
            }}
          />
        </div>

        {/* Login Form Container */}
        <LoginForm />
      </div>
    </>
  )
}
