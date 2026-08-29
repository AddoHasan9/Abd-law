'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App Runtime Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)] text-[var(--text)] font-sans antialiased text-right" dir="rtl">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[var(--surface)] border border-red-500/30 shadow-2xl text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 text-3xl shadow-inner animate-pulse">
          <span className="material-symbols-outlined text-[36px]">error_outline</span>
        </div>

        <div>
          <h1 className="text-2xl font-black text-[var(--text)] mb-2">حدث خطأ غير متوقع</h1>
          <p className="text-sm text-[var(--text-3)] leading-relaxed">
            واجه النظام مشكلة أثناء معالجة طلبك. تم تسجيل تفاصيل الخطأ للمراجعة.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent)] text-slate-950 font-bold text-sm hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>إعادة المحاولة</span>
          </button>
          <Link
            href="/dashboard"
            className="py-3 px-4 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-[var(--text)] font-bold text-sm hover:bg-[var(--surface-3)] transition-all flex items-center justify-center gap-2"
          >
            <span>الرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
