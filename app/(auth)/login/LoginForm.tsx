'use client'

/**
 * نموذج تسجيل الدخول — Supabase Auth بالبريد وكلمة المرور
 * ------------------------------------------------------------
 * عند النجاح: يحوّل إلى /dashboard.
 * عند الفشل: يعرض رسالة عربية واضحة بدل رسالة Supabase الإنجليزية.
 */
import { useState } from 'react'
import Image from 'next/image'
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

    // نجاح — إعادة تحميل حتى تكون جلسة الخادم محدّثة فورًا
    window.location.href = '/dashboard'
  }

  return (
    <div className="relative z-10 w-full max-w-[380px]">
      {/* الشعار والعنوان */}
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Image
            src="/logo.png"
            alt="شعار مكتب المحامي عبد الحسن الخزرجي"
            width={44}
            height={44}
            priority
            className="h-11 w-11 object-contain"
          />
        </div>
        <h1
          className="text-[17px] font-bold tracking-tight text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          مكتب المحامي عبدالحسن الخزرجي
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
          سجّل الدخول للوصول إلى المعاملات وقضايا الشركات
        </p>
      </div>

      {/* البطاقة */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111A2E] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-[12.5px] font-semibold text-rose-300">
            <span className="material-symbols-outlined flex-none text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* البريد */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lg-email" className="text-right text-[12.5px] font-semibold text-slate-300">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                id="lg-email"
                type="email"
                autoComplete="username"
                inputMode="email"
                dir="ltr"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-4 pr-10 text-left text-sm text-white transition-colors placeholder:text-slate-500 focus:border-[#D4AF37]/60 focus:bg-white/[0.05] focus:outline-none"
              />
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[19px] text-slate-500">
                alternate_email
              </span>
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lg-pass" className="text-right text-[12.5px] font-semibold text-slate-300">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="lg-pass"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-10 pr-10 text-left text-sm text-white transition-colors placeholder:text-slate-500 focus:border-[#D4AF37]/60 focus:bg-white/[0.05] focus:outline-none"
              />
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[19px] text-slate-500">
                lock
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition-colors hover:text-slate-300"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* زر الدخول */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D4AF37] text-sm font-bold text-[#1A1204] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A1204]/30 border-t-[#1A1204]" />
                <span>جارٍ الدخول…</span>
              </>
            ) : (
              <span>تسجيل الدخول</span>
            )}
          </button>
        </form>
      </div>

      {/* تذييل */}
      <p className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        النظام متصل وآمن — بإشراف إدارة المكتب
      </p>
    </div>
  )
}
