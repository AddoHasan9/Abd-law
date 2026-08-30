'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني')
      return
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setLoading(false)
      const msg = error.message.toLowerCase()
      if (msg.includes('invalid login credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (msg.includes('email not confirmed')) {
        setError('لم يتم تفعيل هذا الحساب بعد — يرجى مراجعة إدارة المكتب')
      } else {
        setError('تعذّر تسجيل الدخول. يرجى المحاولة مجدداً')
      }
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="flex flex-col justify-center h-full w-full max-w-[420px] mx-auto py-1 sm:py-2">
      {/* Mobile Top Brand Header (Compact & Clean on Mobile Screens) */}
      <div className="lg:hidden flex items-center gap-3 mb-5 pb-3.5 border-b border-white/10 text-right">
        <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-amber-500/30 p-1.5 flex items-center justify-center shadow-md shadow-amber-500/10 shrink-0">
          <Image
            src="/logo.png"
            alt="شعار المكتب"
            width={48}
            height={48}
            className="object-contain w-full h-full"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            منظومة العمل القانوني
          </span>
          <h2 className="text-sm font-extrabold text-white mt-0.5 truncate">
            مكتب المحامي عبدالحسن الخزرجي
          </h2>
        </div>
      </div>

      {/* Form Header */}
      <div className="mb-5 sm:mb-7 text-right">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          تسجيل الدخول
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
          أهلاً بك مجدداً، أدخل بياناتك للوصول إلى لوحة العمل.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold animate-shake"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0 text-rose-400">
            error
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} noValidate className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="lg-email"
            className="block text-xs font-bold text-slate-300 tracking-wide"
          >
            البريد الإلكتروني
          </label>
          <div className="relative group">
            <input
              id="lg-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-12 pr-11 pl-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border border-white/10 focus:border-amber-500/70 text-white placeholder-slate-500 text-sm outline-none transition-all duration-200 focus:ring-4 focus:ring-amber-500/10 text-right dir-ltr"
              style={{ direction: 'ltr', textAlign: 'right' }}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-400 transition-colors material-symbols-outlined text-[20px] pointer-events-none">
              mail
            </span>
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="lg-pass"
            className="block text-xs font-bold text-slate-300 tracking-wide"
          >
            كلمة المرور
          </label>
          <div className="relative group">
            <input
              id="lg-pass"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 pr-11 pl-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border border-white/10 focus:border-amber-500/70 text-white placeholder-slate-500 text-sm outline-none transition-all duration-200 focus:ring-4 focus:ring-amber-500/10 text-right dir-ltr"
              style={{ direction: 'ltr', textAlign: 'right' }}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-400 transition-colors material-symbols-outlined text-[20px] pointer-events-none">
              lock
            </span>
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* Remember me & Forgot password */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
            />
            <span>تذكر تسجيل الدخول</span>
          </label>

          <Link
            href="/reset-password"
            className="text-amber-400/90 hover:text-amber-300 transition-colors font-medium hover:underline"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>جارٍ التحقق والدخول…</span>
            </>
          ) : (
            <>
              <span>دخول إلى المنظومة</span>
              <span className="material-symbols-outlined text-[18px] rotate-180">
                arrow_right_alt
              </span>
            </>
          )}
        </button>
      </form>

      {/* System Status Pill */}
      <div className="mt-8 flex items-center justify-center gap-2 text-[11.5px] text-slate-400 select-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
        <span>النظام متصل ومشفر بمعيار الأمان 256-bit</span>
      </div>
    </div>
  )
}
