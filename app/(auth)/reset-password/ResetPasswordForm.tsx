'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const recoveryToken = searchParams?.get('access_token')
  const recoveryType = searchParams?.get('type')
  const isRecoveryLink = recoveryType === 'recovery' && !!recoveryToken

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!isRecoveryLink) {
      setError('الرابط غير صالح. افتح رابط إعادة تعيين كلمة المرور من بريدك.')
      return
    }

    setError(null)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
        setError(null)
      }
    })

    const timeoutId = window.setTimeout(() => {
      if (!ready) {
        setError('تعذّر التحقق من الرابط. جرّب فتح الرابط مجدداً أو اطلب إعادة تعيين جديدة.')
      }
    }, 8000)

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !ready) {
        setReady(true)
      }
    }).catch(() => {})

    return () => {
      subscription.unsubscribe()
      window.clearTimeout(timeoutId)
    }
  }, [isRecoveryLink, ready, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }

    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      console.error('Reset password failed:', error)
      setError('تعذّر حفظ كلمة المرور. جرّب رابط الإيميل من جديد أو اطلب رابطاً جديداً.')
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <span className="material-symbols-outlined text-[32px]">check_circle</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display">تم تغيير كلمة المرور بنجاح</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm font-medium">
          تم تحديث كلمة المرور لحسابك. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
        </p>
        <Link
          href="/login"
          className="w-full h-12 mt-4 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-[1.01] transition-all border border-white/15"
        >
          <span>الذهاب لتسجيل الدخول</span>
          <span className="material-symbols-outlined text-[18px] rotate-180">arrow_right_alt</span>
        </Link>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#3B82F6] flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px] animate-pulse">lock_reset</span>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white font-display">جارٍ التحقق من الرابط…</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm font-medium">
          إذا فتحت هذه الصفحة مباشرة بلا رابط من البريد، يرجى مراجعة بريدك الإلكتروني والضغط على الرابط المرسل.
        </p>
        <Link href="/login" className="text-xs text-[#3B82F6] hover:underline pt-2 font-bold">
          العودة لصفحة تسجيل الدخول
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-right">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight">تعيين كلمة مرور جديدة</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">اكتب كلمة مرور جديدة وقوية لحسابك.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">كلمة المرور الجديدة</label>
          <div className="relative group">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: '48px', paddingLeft: '16px' }}
              className="w-full h-12 input-icon-right rounded-2xl bg-white dark:bg-[#151A24] border border-slate-300/80 dark:border-white/12 focus:border-[#3B82F6] text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none transition-all text-left dir-ltr font-medium focus:ring-4 focus:ring-blue-500/15"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3B82F6] material-symbols-outlined text-[20px] pointer-events-none transition-colors">
              lock
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">تأكيد كلمة المرور</label>
          <div className="relative group">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{ paddingRight: '48px', paddingLeft: '16px' }}
              className="w-full h-12 input-icon-right rounded-2xl bg-white dark:bg-[#151A24] border border-slate-300/80 dark:border-white/12 focus:border-[#3B82F6] text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none transition-all text-left dir-ltr font-medium focus:ring-4 focus:ring-blue-500/15"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3B82F6] material-symbols-outlined text-[20px] pointer-events-none transition-colors">
              lock_reset
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 mt-2 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] active:bg-[#1D4ED8] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:scale-[1.01] transition-all cursor-pointer border border-white/15 disabled:opacity-60"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>حفظ وتعيين كلمة المرور</span>
          )}
        </button>
      </form>
    </div>
  )
}
