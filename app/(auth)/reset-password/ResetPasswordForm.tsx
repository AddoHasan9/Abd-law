'use client'

/**
 * نموذج تعيين كلمة مرور جديدة
 * ------------------------------------------------------------
 * Supabase يضع رمز الاستعادة في رابط الإيميل. عند فتح الرابط،
 * مكتبة العميل تكتشفه تلقائياً وتطلق حدث PASSWORD_RECOVERY —
 * من هذه اللحظة الجلسة مؤقتة تسمح فقط بتغيير كلمة المرور.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/Icon'

export default function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const recoveryToken = searchParams?.get('access_token')
  const recoveryType = searchParams?.get('type')
  const isRecoveryLink = recoveryType === 'recovery' && !!recoveryToken

  const [ready, setReady]       = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)
  const [loading, setLoading]   = useState(false)

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
    }).catch(() => {
      // تجاهل الأخطاء المحلية، نعرض رسالة عامة بعد المهلة
    })

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
      setError('تعذّر حفظ كلمة المرور. جرّب رابط الإيميل من جديد أو اطلب رابط جديد.')
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="login-card">
        <div className="login-mark" style={{ background: 'var(--ok)' }}><Icon name="check" /></div>
        <h1>تم تغيير كلمة المرور</h1>
        <p className="sub">تقدر الآن تسجّل الدخول بكلمة المرور الجديدة.</p>
        <Link href="/login" className="btn btn-primary btn-block" style={{ marginTop: 10 }}>
          الذهاب لتسجيل الدخول
        </Link>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="login-card">
        <div className="login-mark"><Icon name="scale" /></div>
        <h1>جارٍ التحقق من الرابط…</h1>
        <p className="sub">
          إذا فتحت هذه الصفحة مباشرة بلا رابط من الإيميل، ارجع لبريدك
          واضغط رابط إعادة تعيين كلمة المرور.
        </p>
      </div>
    )
  }

  return (
    <div className="login-card">
      <div className="login-mark"><Icon name="scale" /></div>
      <h1>تعيين كلمة مرور جديدة</h1>
      <p className="sub">اكتب كلمة مرور جديدة لحسابك.</p>

      {error && <div className="login-err">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-start w-full">
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="rp-pass" className="font-bold text-xs text-[var(--text-2)] text-right block">
            كلمة المرور الجديدة
          </label>
          <div className="relative flex items-center w-full">
            <input
              id="rp-pass"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              dir="ltr"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input !h-11 !pr-11 !pl-4 text-left font-medium focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
            />
            <span className="material-symbols-outlined absolute right-3.5 text-[20px] text-[var(--text-3)] pointer-events-none select-none">
              lock
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="rp-confirm" className="font-bold text-xs text-[var(--text-2)] text-right block">
            تأكيد كلمة المرور
          </label>
          <div className="relative flex items-center w-full">
            <input
              id="rp-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              dir="ltr"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="input !h-11 !pr-11 !pl-4 text-left font-medium focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
            />
            <span className="material-symbols-outlined absolute right-3.5 text-[20px] text-[var(--text-3)] pointer-events-none select-none">
              lock_reset
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block btn-animated shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 text-base font-bold py-3 mt-2 rounded-2xl"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>جارٍ الحفظ…</span>
            </span>
          ) : (
            'حفظ كلمة المرور'
          )}
        </button>
      </form>
    </div>
  )
}
