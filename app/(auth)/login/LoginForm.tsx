'use client'

import { useState } from 'react'
import { showError } from '@/components/ui/ConfirmDialog'
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
        void showError(arError, 'تسجيل الدخول')
        return
      }

      const { data: profile, error: profileError } = await supabase.from('profiles')
        .select('active').eq('id', authData.user!.id).maybeSingle()
      if (profileError || profile?.active !== true) {
        await supabase.auth.signOut()
        void showError('الحساب معطل أو غير مهيأ. يرجى مراجعة مدير النظام', 'تسجيل الدخول')
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
      void showError('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً', 'تسجيل الدخول')
    }
  }

  // Redirecting Screen
  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full max-w-[380px] mx-auto py-8 text-center text-right animate-in fade-in zoom-in-95 duration-300 select-none" dir="rtl">
        <span className="w-9 h-9 mb-5 rounded-full border-[3px] border-[color:color-mix(in_srgb,var(--coral)_25%,transparent)] border-t-[var(--coral)] animate-spin" aria-hidden />

        <div className="flex flex-col gap-2 items-center">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm sm:text-base">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>تم التحقق من الحساب بنجاح</span>
          </div>
          <p className="text-xs text-[var(--text-3)] max-w-xs leading-relaxed mt-1">
            جارٍ تهيئة الجلسة وتحميل بيانات لوحة التحكم والمعاملات…
          </p>
        </div>

      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center h-full w-full max-w-[430px] mx-auto py-1">
      {/* Mobile Prominent Royal Emblem & Identity Header */}
      <div className="hz-lf-mhead">
        {/* Centered Luxury Emblem Medallion */}
        <div className="hz-login-logo hz-login-logo-sm">
          <Image
            src="/logo.png"
            alt="شعار مكتب المحامي عبدالحسن الخزرجي"
            width={72}
            height={72}
            className="object-contain w-full h-full drop-shadow-md"
            priority
          />
        </div>

        <span className="hz-login-badge">
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          منظومة العمل القانوني والشركات
        </span>

        <p className="hz-login-name">
          مكتب المحامي عبدالحسن الخزرجي
        </p>
        <p className="hz-login-tag">
          للمحاماة والاستشارات القانونية وتأسيس الشركات
        </p>
      </div>

      {/* Form Content with GSAP Stagger Entrance */}
      <FadeInStagger className="space-y-5">
        <div className="text-right">
          <h1 className="hz-lf-title">
            تسجيل الدخول إلى حسابك
          </h1>
          <p className="hz-lf-sub">
            أدخل بيانات الاعتماد للمتابعة والوصول إلى لوحة العمل وإدارة المعاملات.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5 text-right">
            <label htmlFor="login-email" className="hz-lf-label">
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
                className="auth-input hz-lf-input"
                {...register('email')}
              />
              <Mail aria-hidden className="hz-lf-ic" />
            </div>
            {errors.email && (
              <p id="login-email-error" role="alert" className="hz-lf-err">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 text-right">
            <label htmlFor="login-password" className="hz-lf-label">
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
                className="auth-input hz-lf-input"
                {...register('password')}
              />
              <Lock aria-hidden className="hz-lf-ic" />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-pressed={showPassword}
                className="hz-lf-eye"
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
              <p id="login-password-error" role="alert" className="hz-lf-err">
                {errors.password.message}
              </p>
            ) : capsLock ? (
              <p id="login-caps" className="hz-lf-caps">
                زر الأحرف الكبيرة (Caps Lock) مفعّل
              </p>
            ) : null}
          </div>

          <div className="flex justify-end -mt-1">
            <Link
              href="/reset-password"
              className="hz-lf-link"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="group hz-lf-btn"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
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
        <div className="hz-lf-mfoot">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          <span>اتصال مشفّر ومحمي • إدارة المكتب</span>
        </div>
      </FadeInStagger>
    </div>
  )
}
