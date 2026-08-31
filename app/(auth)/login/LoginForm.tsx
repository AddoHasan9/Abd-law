'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

      // Success
      toast.success('تم التحقق من الحساب بنجاح، جاري الدخول...')
      setIsRedirecting(true)

      // Audit log in background
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
      toast.error('حدث خطأ غير متوقع في الاتصال بالخادم')
    }
  }

  // Visual Redirecting Screen
  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full max-w-[420px] mx-auto py-12 text-center text-right animate-in fade-in zoom-in-95 duration-300" dir="rtl">
        <div className="relative w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 p-2.5 flex items-center justify-center shadow-xl shadow-primary/10 mb-6 animate-pulse">
          <Image
            src="/logo.png"
            alt="شعار المكتب"
            width={64}
            height={64}
            className="object-contain w-full h-full"
            priority
          />
        </div>

        <div className="flex flex-col gap-2 items-center">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>تم التحقق من الحساب بنجاح</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed mt-1">
            جارٍ تهيئة الجلسة وتحميل بيانات لوحة التحكم والمعاملات…
          </p>
        </div>

        <div className="w-48 h-1.5 bg-secondary rounded-full overflow-hidden mt-6">
          <div className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full animate-progress" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center h-full w-full max-w-[420px] mx-auto py-2">
      {/* Mobile Top Brand Header */}
      <div className="lg:hidden flex items-center gap-3 mb-6 pb-4 border-b border-border/80 text-right">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 p-1.5 flex items-center justify-center shadow-sm shrink-0">
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-primary/10 border border-primary/20 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            منظومة العمل القانوني
          </span>
          <h2 className="text-sm font-extrabold text-foreground mt-1 truncate">
            مكتب المحامي عبدالحسن الخزرجي
          </h2>
        </div>
      </div>

      {/* Form Header with GSAP Stagger */}
      <FadeInStagger className="space-y-6">
        <div className="text-right">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-display">
            تسجيل الدخول
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
            أهلاً بك مجدداً، أدخل بياناتك للوصول إلى لوحة العمل.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5 text-right">
            <Label htmlFor="login-email" className="text-xs font-bold text-foreground">
              البريد الإلكتروني
            </Label>
            <div className="relative">
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                dir="ltr"
                className="h-11 pr-10 pl-3 text-right bg-background/80 border-border/80 focus-visible:ring-primary focus-visible:border-primary text-foreground"
                {...register('email')}
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {errors.email && (
              <p className="text-[11.5px] font-bold text-destructive animate-in fade-in duration-200">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 text-right">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-xs font-bold text-foreground">
                كلمة المرور
              </Label>
              <Link
                href="/reset-password"
                className="text-[11.5px] text-primary hover:underline font-semibold"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                dir="ltr"
                className="h-11 pr-10 pl-10 text-right bg-background/80 border-border/80 focus-visible:ring-primary focus-visible:border-primary text-foreground"
                {...register('password')}
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
              <p className="text-[11.5px] font-bold text-destructive animate-in fade-in duration-200">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2 pt-1 text-xs">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={checked => setValue('rememberMe', Boolean(checked))}
            />
            <Label
              htmlFor="remember-me"
              className="text-xs text-muted-foreground font-medium cursor-pointer"
            >
              تذكر تسجيل الدخول على هذا الجهاز
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 mt-2 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جارٍ التحقق والدخول…</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>دخول إلى المنظومة</span>
                <ArrowLeft className="h-4 w-4" />
              </div>
            )}
          </Button>
        </form>

        {/* Security Trust Pill */}
        <div className="flex items-center justify-center gap-2 text-[11.5px] text-muted-foreground select-none pt-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>النظام متصل ومشفر بمعيار الأمان 256-bit</span>
        </div>
      </FadeInStagger>
    </div>
  )
}
