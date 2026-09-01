import { Suspense } from 'react'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata = { title: 'تعيين كلمة مرور جديدة — مكتب المحامي عبد الحسن الخزرجي' }

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-[#EEF2F6] dark:bg-[#0F131A] overflow-hidden transition-colors duration-500">
      {/* Main Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-[480px] rounded-[28px] bg-white/70 dark:bg-[#151A24]/75 backdrop-blur-[36px] backdrop-saturate-[180%] border border-white/85 dark:border-white/10 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] p-8 md:p-10 animate-fade-in-up">
        <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm font-medium">جاري التحميل...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
