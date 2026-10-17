import { Suspense } from 'react'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata = { title: 'تعيين كلمة مرور جديدة — مكتب المحامي عبد الحسن الخزرجي' }

export default function ResetPasswordPage() {
  return (
    <main className="login-page hz-login">
      <div className="hz-login-sky" aria-hidden />
      {/* Main Glassmorphic Container */}
      <div className="hz-login-shell hz-login-shell-sm">
        <Suspense fallback={<div className="p-8 text-center text-[var(--text-3)] text-sm font-medium">جاري التحميل...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
