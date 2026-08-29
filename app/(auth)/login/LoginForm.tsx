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

    if (!email.trim())    { setError('يرجى إدخال البريد الإلكتروني'); return }
    if (!password)        { setError('يرجى إدخال كلمة المرور'); return }

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

    // Success — reload so server session is immediately fresh
    window.location.href = '/dashboard'
  }

  return (
    <div className="relative z-10 w-full max-w-[420px] rounded-[28px] bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-7 sm:p-8 shadow-2xl shadow-black/60 transition-all duration-300 animate-scale-in">
      
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center justify-center text-center mb-6">
        <div className="relative w-28 h-28 mb-3 p-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group transition-transform duration-300 hover:scale-105">
          <Image
            src="/logo.png"
            alt="شعار مكتب المحامي عبد الحسن الخزرجي"
            width={100}
            height={100}
            priority
            className="w-full h-full object-contain filter drop-shadow"
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>منظومة العمل القانوني الموحدة</span>
        </div>

        <h1 className="text-xl font-extrabold text-white tracking-tight">
          مكتب المحامي عبدالحسن الخزرجي
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          سجّل الدخول للوصول إلى المعاملات وقضايا الشركات
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold mb-5 animate-shake">
          <span className="material-symbols-outlined text-[18px] text-rose-400 flex-none">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4 text-start w-full">
        {/* Email Field */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="lg-email" className="font-bold text-xs text-slate-300 text-right block">
            البريد الإلكتروني
          </label>
          <div className="relative flex items-center w-full">
            <input
              id="lg-email"
              type="email"
              autoComplete="username"
              placeholder="name@example.com"
              dir="ltr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-11 pr-11 pl-4 text-left font-medium text-white bg-slate-800/80 border border-slate-700/80 rounded-xl placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-sm"
            />
            <span className="material-symbols-outlined absolute right-3.5 text-[20px] text-slate-400 pointer-events-none select-none">
              alternate_email
            </span>
          </div>
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="lg-pass" className="font-bold text-xs text-slate-300 text-right block">
            كلمة المرور
          </label>
          <div className="relative flex items-center w-full">
            <input
              id="lg-pass"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              dir="ltr"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-11 pr-11 pl-11 text-left font-medium text-white bg-slate-800/80 border border-slate-700/80 rounded-xl placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-sm"
            />
            <span className="material-symbols-outlined absolute right-3.5 text-[20px] text-slate-400 pointer-events-none select-none">
              lock
            </span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-2.5 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center justify-center"
              tabIndex={-1}
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              <span>جارٍ التحقق والدخول…</span>
            </span>
          ) : (
            <>
              <span>تسجيل الدخول</span>
              <span className="material-symbols-outlined text-[18px]">login</span>
            </>
          )}
        </button>
      </form>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>النظام متصل وآمن</span>
        </span>
        <span>بإشراف إدارة المكتب</span>
      </div>
    </div>
  )
}
