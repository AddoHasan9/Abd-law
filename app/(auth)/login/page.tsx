import Image from 'next/image'
import LoginForm from './LoginForm'
import { ThemeToggle } from '@/components/auth/ThemeToggle'
import { Building2, Receipt, BadgeCheck, ShieldCheck, Sparkles, Scale } from 'lucide-react'
import { FadeInStagger } from '@/components/ui/FadeInStagger'

export const metadata = { title: 'تسجيل الدخول — مكتب المحامي عبدالحسن الخزرجي' }

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 md:p-10 bg-[#EEF2F6] dark:bg-[#0B0E14] text-slate-900 dark:text-white overflow-hidden transition-colors duration-500 selection:bg-blue-600 selection:text-white">
      
      {/* Ambient Atmospheric Glow Orbs */}
      <div className="pointer-events-none absolute -top-44 -right-44 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-44 -left-44 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/[0.03] dark:bg-amber-400/[0.04] rounded-full blur-[140px]" />

      {/* Top Floating Theme Switcher Button with Safe Area Inset Support */}
      <div className="absolute top-[max(16px,env(safe-area-inset-top))] left-4 sm:left-6 z-50">
        <ThemeToggle />
      </div>

      {/* Main Container with Apple Frosted Glass & Precision Specular Border */}
      <div className="relative z-10 w-full max-w-[1040px] rounded-[32px] sm:rounded-[40px] bg-white/80 dark:bg-[#121722]/85 backdrop-blur-[40px] backdrop-saturate-[190%] border border-white/90 dark:border-white/10 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.65)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 ring-1 ring-black/5 dark:ring-white/5 transition-all duration-500">
        
        {/* ============ Brand Presentation Panel (Desktop) ============ */}
        <aside className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-white/60 to-white/30 dark:from-white/[0.03] dark:to-transparent p-8 md:p-10 flex-col justify-between border-l border-slate-200/80 dark:border-white/10 relative overflow-hidden text-right transition-colors duration-500">
          <FadeInStagger className="space-y-6 relative z-10">
            {/* Logo & Headline */}
            <div className="space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-white/10 dark:to-white/[0.02] border border-amber-500/30 dark:border-amber-400/25 p-3 flex items-center justify-center shadow-xl shadow-blue-500/5 dark:shadow-black/40 backdrop-blur-xl shrink-0 transition-all">
                <Image
                  src="/logo.png"
                  alt="شعار مكتب المحامي عبدالحسن الخزرجي"
                  width={80}
                  height={80}
                  className="object-contain w-full h-full drop-shadow-md"
                  priority
                />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/25 dark:border-amber-400/30 text-amber-700 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  منظومة العمل القانوني والشركات
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2 font-display tracking-tight leading-snug">
                  مكتب المحامي عبدالحسن الخزرجي
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                  للمحاماة والاستشارات القانونية وتأسيس الشركات
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              المنصة المتكاملة لإدارة معاملات التأسيس والشركات المحدودة، والتحاسب الضريبي، وإطلاق الودائع، وإصدار الهويات الرسمية بأعلى معايير الدقة والأمان.
            </p>

            {/* Core Pillars List */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    تأسيس وإدارة الشركات المحدودة
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    متابعة خط السير والقرارات التأسيسية
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    التحاسب الضريبي وبراءة الذمة
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    الحسابات الختامية ومهل مسجل الشركات
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <BadgeCheck className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    إصدار وتجديد الهويات والرخص
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    هوية مستورد، غرفة التجارة، والشهادات
                  </span>
                </div>
              </div>
            </div>
          </FadeInStagger>

          {/* Footer Security Badge */}
          <div className="pt-5 mt-5 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 relative z-10">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>بإشراف إدارة المكتب — نظام مشفر بمعيار الأمان 256-bit</span>
          </div>
        </aside>

        {/* ============ Form Panel ============ */}
        <section className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex items-center justify-center bg-white/40 dark:bg-white/[0.01] backdrop-blur-xl transition-colors duration-500">
          <LoginForm />
        </section>
      </div>
    </main>
  )
}
