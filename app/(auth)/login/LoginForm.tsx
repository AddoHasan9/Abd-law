'use client'

/**
 * نموذج تسجيل الدخول — Supabase Auth بالبريد وكلمة المرور
 * ------------------------------------------------------------
 * عند النجاح: يحوّل إلى /dashboard.
 * عند الفشل: يعرض رسالة عربية واضحة بدل رسالة Supabase الإنجليزية.
 */
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) { setError('يرجى إدخال البريد الإلكتروني'); return }
    if (!password)     { setError('يرجى إدخال كلمة المرور'); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setLoading(false)
      const msg = error.message.toLowerCase()
      if (msg.includes('invalid login credentials'))
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      else if (msg.includes('email not confirmed'))
        setError('لم يتم تفعيل هذا الحساب بعد — يرجى مراجعة إدارة المكتب')
      else
        setError('تعذّر تسجيل الدخول. يرجى المحاولة مجدداً')
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <>
      <div className="lx-form-head">
        <h1>تسجيل الدخول</h1>
        <p>ادخل بياناتك للوصول إلى لوحة العمل.</p>
      </div>

      {error && (
        <div className="lx-error" role="alert">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} noValidate>
        <div className="lx-field">
          <label htmlFor="lg-email" className="lx-label">البريد الإلكتروني</label>
          <div className="lx-input-wrap">
            <input
              id="lg-email"
              className="lx-input"
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <span className="lx-input-ico material-symbols-outlined">alternate_email</span>
          </div>
        </div>

        <div className="lx-field">
          <label htmlFor="lg-pass" className="lx-label">كلمة المرور</label>
          <div className="lx-input-wrap">
            <input
              id="lg-pass"
              className="lx-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <span className="lx-input-ico material-symbols-outlined">lock</span>
            <button
              type="button"
              className="lx-eye"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <button type="submit" className="lx-submit" disabled={loading}>
          {loading ? (
            <>
              <span className="lx-spin" />
              <span>جارٍ الدخول…</span>
            </>
          ) : (
            <>
              <span>دخول آمن</span>
              <span className="material-symbols-outlined">arrow_back</span>
            </>
          )}
        </button>
      </form>

      <div className="lx-form-foot">
        <span className="lx-status-dot" />
        <span>النظام متصل وآمن</span>
      </div>
    </>
  )
}
