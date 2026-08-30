import { Suspense } from 'react'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata = { title: 'تعيين كلمة مرور جديدة — مكتب المحامي عبد الحسن الخزرجي' }

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-[#090D16] overflow-hidden">
      {/* Dynamic Ambient Background Glow Orbs */}
      <div
        className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[130px] pointer-events-none"
        aria-hidden
      />

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-[480px] rounded-[28px] bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 p-8 md:p-10 animate-fade-in-up">
        <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">جاري التحميل...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
