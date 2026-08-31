import Image from 'next/image'
import LoginForm from './LoginForm'
import { ThemeToggle } from '@/components/auth/ThemeToggle'
import { Building2, Receipt, BadgeCheck, ShieldCheck, Scale, Sparkles } from 'lucide-react'
import { FadeInStagger } from '@/components/ui/FadeInStagger'

export const metadata = { title: 'تسجيل الدخول — مكتب المحامي عبدالحسن الخزرجي' }

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-4 md:p-8 bg-slate-100 dark:bg-[#070D18] text-slate-900 dark:text-white overflow-hidden transition-colors duration-500 selection:bg-blue-500 selection:text-white">
      {/* Top Floating Glassmorphism Theme Switcher Button */}
      <div className="absolute top-4 left-4 z-50">
        <ThemeToggle />
      </div>

      {/* Dynamic Ambient Background Glow Orbs */}
      <div
        className="absolute -top-32 -right-32 w-[480px] h-[480px] bg-blue-500/15 dark:bg-cyan-500/20 rounded-full blur-[140px] pointer-events-none transition-all duration-500"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -left-32 w-[520px] h-[520px] bg-indigo-500/15 dark:bg-blue-600/25 rounded-full blur-[150px] pointer-events-none transition-all duration-500"
        aria-hidden
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-sky-400/10 dark:bg-indigo-500/15 rounded-full blur-[130px] pointer-events-none transition-all duration-500"
        aria-hidden
      />

      {/* Main Glassmorphic Container with Deep Blur & Light/Dark Adaptation */}
      <div className="relative z-10 w-full max-w-[1000px] rounded-[28px] sm:rounded-[36px] bg-white/75 dark:bg-slate-900/65 backdrop-blur-3xl border border-slate-200/80 dark:border-white/[0.14] shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.7)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 ring-1 ring-black/5 dark:ring-white/10 transition-all duration-500">
        
        {/* ============ Brand Presentation Panel (Desktop) ============ */}
        <aside className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-slate-50/90 via-slate-100/60 to-slate-100/90 dark:from-white/[0.06] dark:via-white/[0.02] dark:to-white/[0.04] p-8 md:p-10 flex-col justify-between border-l border-slate-200/80 dark:border-white/10 relative overflow-hidden text-right transition-colors duration-500">
          {/* Subtle Ambient Legal Watermark Icon in background */}
          <div
            className="absolute -bottom-10 -left-10 opacity-[0.04] dark:opacity-[0.03] text-slate-900 dark:text-white pointer-events-none select-none transition-opacity"
            aria-hidden
          >
            <Scale className="w-64 h-64" />
          </div>

          <FadeInStagger className="space-y-6 relative z-10">
            {/* Logo Medallion */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-cyan-500/30 p-2.5 flex items-center justify-center shadow-lg shadow-black/5 dark:shadow-cyan-500/15 backdrop-blur-xl shrink-0 transition-all">
                <Image
                  src="/logo.png"
                  alt="شعار مكتب المحامي عبدالحسن الخزرجي"
                  width={64}
                  height={64}
                  className="object-contain w-full h-full drop-shadow-sm"
                  priority
                />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/10 dark:bg-cyan-500/15 border border-blue-500/20 dark:border-cyan-500/30 text-blue-700 dark:text-cyan-300 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 animate-pulse" />
                  منظومة العمل القانوني الموحدة
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1.5 font-display tracking-tight transition-colors">
                  مكتب المحامي عبدالحسن الخزرجي
                </h2>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium transition-colors">
              المنصة المتكاملة لإدارة معاملات الشركات، التحاسب الضريبي، إطلاق الودائع، وإصدار الهويات الرسمية بأعلى معايير الدقة والأمان.
            </p>

            {/* Core Pillars List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs transition-all duration-200">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 border border-blue-500/25 dark:border-blue-500/35 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white transition-colors">
                    تأسيس وإدارة وتعديل الشركات
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 transition-colors">
                    متابعة خط سير التأسيس والقرارات
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs transition-all duration-200">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/25 dark:border-emerald-500/35 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white transition-colors">
                    التحاسب الضريبي وبراءة الذمة
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 transition-colors">
                    الحسابات الختامية ومهل مسجل الشركات
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs transition-all duration-200">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 dark:bg-purple-500/20 border border-purple-500/25 dark:border-purple-500/35 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
                  <BadgeCheck className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white transition-colors">
                    إصدار وتجديد الهويات والرخص
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 transition-colors">
                    هوية مستورد، غرفة التجارة والضريبة
                  </span>
                </div>
              </div>
            </div>
          </FadeInStagger>

          {/* Footer Security Badge */}
          <div className="pt-6 mt-6 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 relative z-10 transition-colors">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>بإشراف إدارة المكتب — وصول مقيد ومحمي بالصلاحيات</span>
          </div>
        </aside>

        {/* ============ Form Panel ============ */}
        <section className="lg:col-span-7 p-6 sm:p-8 md:p-12 flex items-center justify-center bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl transition-colors duration-500">
          <LoginForm />
        </section>
      </div>
    </main>
  )
}
