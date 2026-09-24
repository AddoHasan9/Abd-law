'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FadeInStagger } from '@/components/ui/FadeInStagger'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'يرجى إدخال البريد الإلكتروني')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z
    .string()
    .min(1, 'يرجى إدخال كلمة المرور'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: LoginValues) {
    try {
      const supabase = createClient()
      const { error: authError, data: authData } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      })

      if (authError) {
        const msg = authError.message.toLowerCase()
        let arError = 'تعذّر تسجيل الدخول. يرجى المحاولة مجدداً'
        if (msg.includes('invalid login credentials')) {
          arError = 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        } else if (msg.includes('email not confirmed')) {
          arError = 'لم يتم تفعيل هذا الحساب بعد — يرجى مراجعة إدارة المكتب'
        }
        toast.error(arError)
        return
      }

      const { data: profile, error: profileError } = await supabase.from('profiles')
        .select('active').eq('id', authData.user!.id).maybeSingle()
      if (profileError || profile?.active !== true) {
        await supabase.auth.signOut()
        toast.error('الحساب معطل أو غير مهيأ. يرجى مراجعة مدير النظام')
        return
      }

      // Success Feedback
      toast.success('تم التحقق بنجاح، جاري تهيئة لوحة التحكم...')
      setIsRedirecting(true)

      // Audit trail in background
      try {
        if (authData?.user) {
          fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authData.user.id,
              action: 'login',
              details: `تسجيل دخول ناجح للمستخدم ${authData.user.email}`,
            }),
          }).catch(() => {})
        }
      } catch {}

      window.location.href = '/'
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً')
    }
  }

  // Redirecting Screen
  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full max-w-[380px] mx-auto py-8 text-center text-right animate-in fade-in zoom-in-95 duration-300 select-none" dir="rtl">
        <span className="w-9 h-9 mb-5 rounded-full border-[3px] border-blue-500/20 border-t-blue-600 animate-spin" aria-hidden />

        <div className="flex flex-col gap-2 items-center">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm sm:text-base">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>تم التحقق من الحساب بنجاح</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mt-1">
            جارٍ تهيئة الجلسة وتحميل بيانات لوحة التحكم والمعاملات…
          </p>
        </div>

      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center h-full w-full max-w-[430px] mx-auto py-1">
      {/* Mobile Prominent Royal Emblem & Identity Header */}
      <div className="lg:hidden flex flex-col items-center text-center mb-6 pb-5 border-b border-slate-200/80 dark:border-white/10">
        {/* Centered Luxury Emblem Medallion */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-white/10 dark:to-white/[0.02] border border-amber-500/35 dark:border-amber-400/30 p-2.5 flex items-center justify-center shadow-xl shadow-blue-500/10 dark:shadow-black/50 backdrop-blur-xl mb-3 relative group">
          <Image
            src="/logo.png"
            alt="شعار مكتب المحامي عبدالحسن الخزرجي"
            width={72}
            height={72}
            className="object-contain w-full h-full drop-shadow-md"
            priority
          />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/25 dark:border-amber-400/30 text-amber-700 dark:text-amber-300 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          منظومة العمل القانوني والشركات
        </span>

        <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
          مكتب المحامي عبدالحسن الخزرجي
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
          للمحاماة والاستشارات القانونية وتأسيس الشركات
        </p>
      </div>

      {/* Form Content with GSAP Stagger Entrance */}
      <FadeInStagger className="space-y-5">
        <div className="text-right">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            تسجيل الدخول إلى حسابك
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">
            أدخل بيانات الاعتماد للمتابعة والوصول إلى لوحة العمل وإدارة المعاملات.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5 text-right">
            <label htmlFor="login-email" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              البريد الإلكتروني
            </label>
            <div className="relative group">
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="name@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                dir="ltr"
                style={{ paddingRight: '48px', paddingLeft: '16px' }}
                className="auth-input w-full h-12 rounded-2xl bg-white dark:bg-[#151A24] hover:bg-slate-50 dark:hover:bg-[#1A202C] focus:bg-white dark:focus:bg-[#151A24] border border-slate-300/80 dark:border-white/12 focus:border-[#3B82F6] dark:focus:border-[#3B82F6] text-slate-900 dark:text-white placeholder-slate-400 text-base sm:text-sm outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:ring-4 focus:ring-blue-500/15 dark:focus:ring-blue-500/20 text-left shadow-2xs font-medium aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:ring-rose-500/15"
                {...register('email')}
              />
              <Mail aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 group-focus-within:text-[#3B82F6] transition-colors pointer-events-none" />
            </div>
            {errors.email && (
              <p id="login-email-error" role="alert" className="text-xs font-bold text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 text-right">
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              كلمة المرور
            </label>
            <div className="relative group">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'login-password-error' : capsLock ? 'login-caps' : undefined}
                onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
                onKeyDown={e => setCapsLock(e.getModifierState('CapsLock'))}
                dir="ltr"
                style={{ paddingRight: '48px', paddingLeft: '48px' }}
                className="auth-input w-full h-12 rounded-2xl bg-white dark:bg-[#151A24] hover:bg-slate-50 dark:hover:bg-[#1A202C] focus:bg-white dark:focus:bg-[#151A24] border border-slate-300/80 dark:border-white/12 focus:border-[#3B82F6] dark:focus:border-[#3B82F6] text-slate-900 dark:text-white placeholder-slate-400 text-base sm:text-sm outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:ring-4 focus:ring-blue-500/15 dark:focus:ring-blue-500/20 text-left shadow-2xs font-medium aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:ring-rose-500/15"
                {...register('password')}
              />
              <Lock aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 group-focus-within:text-[#3B82F6] transition-colors pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-pressed={showPassword}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? (
                  <EyeOff aria-hidden className="h-[18px] w-[18px]" />
                ) : (
                  <Eye aria-hidden className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p id="login-password-error" role="alert" className="text-xs font-bold text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
                {errors.password.message}
              </p>
            ) : capsLock ? (
              <p id="login-caps" className="text-xs font-bold text-amber-600 dark:text-amber-400">
                زر الأحرف الكبيرة (Caps Lock) مفعّل
              </p>
            ) : null}
          </div>

          <div className="flex justify-end -mt-1">
            <Link
              href="/reset-password"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold py-1"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="group w-full h-12 mt-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 active:scale-[0.99] transition-[background-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 disabled:opacity-60 disabled:pointer-events-none cursor-pointer border border-white/15"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>جارٍ التحقق والدخول…</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>دخول إلى المنظومة</span>
                <ArrowLeft aria-hidden className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
              </div>
            )}
          </button>
        </form>

        {/* Security Trust Badge */}
        <div className="lg:hidden flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 select-none pt-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>نظام مشفر ومحمي بمعيار الأمان 256-bit SSL • إدارة المكتب</span>
        </div>
      </FadeInStagger>
    </div>
  )
}
