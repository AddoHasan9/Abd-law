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
  rememberMe: z.boolean(),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  })

  const rememberMe = watch('rememberMe')

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
      <div className="flex flex-col items-center justify-center h-full w-full max-w-[420px] mx-auto py-12 text-center text-right animate-in fade-in zoom-in-95 duration-300" dir="rtl">
        <div className="relative w-22 h-22 rounded-3xl bg-white/[0.08] border border-cyan-500/30 p-3 flex items-center justify-center shadow-2xl shadow-cyan-500/20 mb-6 backdrop-blur-2xl animate-pulse">
          <Image
            src="/logo.png"
            alt="شعار المكتب"
            width={72}
            height={72}
            className="object-contain w-full h-full drop-shadow-md"
            priority
          />
        </div>

        <div className="flex flex-col gap-2 items-center">
          <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-base">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>تم التحقق من الحساب بنجاح</span>
          </div>
          <p className="text-xs text-slate-300 max-w-xs leading-relaxed mt-1">
            جارٍ تهيئة الجلسة وتحميل بيانات لوحة التحكم والمعاملات…
          </p>
        </div>

        <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mt-6">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full animate-progress" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center h-full w-full max-w-[420px] mx-auto py-2">
      {/* Mobile Top Brand Header */}
      <div className="lg:hidden flex items-center gap-3.5 mb-6 pb-4 border-b border-white/10 text-right">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.08] border border-amber-500/30 p-1.5 flex items-center justify-center shadow-lg shadow-amber-500/10 backdrop-blur-md shrink-0">
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            منظومة العمل القانوني
          </span>
          <h2 className="text-sm font-extrabold text-white mt-1 truncate">
            مكتب المحامي عبدالحسن الخزرجي
          </h2>
        </div>
      </div>

      {/* Form Content with GSAP Stagger Entrance */}
      <FadeInStagger className="space-y-6">
        <div className="text-right">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            تسجيل الدخول
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            أهلاً بك مجدداً، أدخل بياناتك للوصول إلى لوحة العمل وإدارة المعاملات.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4.5">
          {/* Email Field */}
          <div className="space-y-1.5 text-right">
            <label htmlFor="login-email" className="block text-xs font-bold text-slate-200">
              البريد الإلكتروني
            </label>
            <div className="relative group">
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                dir="ltr"
                className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/15 focus:border-cyan-400 text-white placeholder-slate-400 text-sm outline-none transition-all duration-300 focus:ring-4 focus:ring-cyan-500/20 text-right backdrop-blur-md"
                {...register('email')}
              />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
            </div>
            {errors.email && (
              <p className="text-[11.5px] font-bold text-rose-400 animate-in fade-in duration-200">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 text-right">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-200">
                كلمة المرور
              </label>
              <Link
                href="/reset-password"
                className="text-[11.5px] text-cyan-400 hover:text-cyan-300 hover:underline font-semibold transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <div className="relative group">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                dir="ltr"
                className="w-full h-12 pr-11 pl-11 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/15 focus:border-cyan-400 text-white placeholder-slate-400 text-sm outline-none transition-all duration-300 focus:ring-4 focus:ring-cyan-500/20 text-right backdrop-blur-md"
                {...register('password')}
              />
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11.5px] font-bold text-rose-400 animate-in fade-in duration-200">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2.5 pt-1 text-xs text-slate-300">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={e => setValue('rememberMe', e.target.checked)}
              className="w-4 h-4 rounded-md border-white/20 bg-white/10 text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
            />
            <label
              htmlFor="remember-me"
              className="text-xs text-slate-300 hover:text-white font-medium cursor-pointer transition-colors"
            >
              تذكر تسجيل الدخول على هذا المتصفح
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 mt-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-blue-500/25 hover:shadow-cyan-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none cursor-pointer border border-white/20"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>جارٍ التحقق والدخول…</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>دخول إلى المنظومة</span>
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </div>
            )}
          </button>
        </form>

        {/* Security Trust Pill */}
        <div className="flex items-center justify-center gap-2 text-[11.5px] text-slate-400 select-none pt-1">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>النظام متصل ومشفر بمعيار الأمان 256-bit</span>
        </div>
      </FadeInStagger>
    </div>
  )
}
