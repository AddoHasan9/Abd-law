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

    if (password.length < 12) {
      setError('كلمة المرور يجب أن تكون 12 حرفاً على الأقل')
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
        <h1 className="hz-lf-title">تم تغيير كلمة المرور بنجاح</h1>
        <p className="hz-lf-sub">
          تم تحديث كلمة المرور لحسابك. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
        </p>
        <Link
          href="/login"
          className="hz-lf-btn"
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
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px] animate-pulse">lock_reset</span>
        </div>
        <h1 className="hz-lf-title">جارٍ التحقق من الرابط…</h1>
        <p className="hz-lf-sub">
          إذا فتحت هذه الصفحة مباشرة بلا رابط من البريد، يرجى مراجعة بريدك الإلكتروني والضغط على الرابط المرسل.
        </p>
        <Link href="/login" className="hz-lf-link pt-2">
          العودة لصفحة تسجيل الدخول
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-right">
        <h1 className="hz-lf-title">تعيين كلمة مرور جديدة</h1>
        <p className="hz-lf-sub">اكتب كلمة مرور جديدة وقوية لحسابك.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div className="space-y-1.5">
          <label htmlFor="new-password" className="hz-lf-label">كلمة المرور الجديدة</label>
          <div className="relative group">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              id="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: '48px', paddingLeft: '16px' }}
              className="auth-input hz-lf-input input-icon-right"
            />
            <span className="hz-lf-ic material-symbols-outlined text-[18px]">
              lock
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="hz-lf-label">تأكيد كلمة المرور</label>
          <div className="relative group">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              id="confirm-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{ paddingRight: '48px', paddingLeft: '16px' }}
              className="auth-input hz-lf-input input-icon-right"
            />
            <span className="hz-lf-ic material-symbols-outlined text-[18px]">
              lock_reset
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="hz-lf-btn"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>حفظ وتعيين كلمة المرور</span>
          )}
        </button>
      </form>
    </div>
  )
}
