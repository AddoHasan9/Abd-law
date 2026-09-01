import Image from 'next/image'
import LoginForm from './LoginForm'
import { ThemeToggle } from '@/components/auth/ThemeToggle'
import { Building2, Receipt, BadgeCheck, ShieldCheck, Sparkles } from 'lucide-react'
import { FadeInStagger } from '@/components/ui/FadeInStagger'

export const metadata = { title: 'تسجيل الدخول — مكتب المحامي عبدالحسن الخزرجي' }

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-4 md:p-8 bg-[#EEF2F6] dark:bg-[#0F131A] text-slate-900 dark:text-white overflow-hidden transition-colors duration-500 selection:bg-blue-500 selection:text-white">
      {/* Top Floating Glassmorphism Theme Switcher Button */}
      <div className="absolute top-4 left-4 z-50">
        <ThemeToggle />
      </div>

      {/* Main Glassmorphic Container with Apple Pure Frosted Blur & Specular Border */}
      <div className="relative z-10 w-full max-w-[1000px] rounded-[28px] sm:rounded-[36px] bg-white/70 dark:bg-[#151A24]/75 backdrop-blur-[36px] backdrop-saturate-[180%] border border-white/85 dark:border-white/10 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 ring-1 ring-black/5 dark:ring-white/5 transition-all duration-500">
        
        {/* ============ Brand Presentation Panel (Desktop) ============ */}
        <aside className="hidden lg:flex lg:col-span-5 bg-white/45 dark:bg-white/[0.02] p-8 md:p-10 flex-col justify-between border-l border-white/80 dark:border-white/10 relative overflow-hidden text-right transition-colors duration-500">
          <FadeInStagger className="space-y-6 relative z-10">
            {/* Logo Medallion */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/90 dark:bg-white/[0.08] border border-white/90 dark:border-white/15 p-2.5 flex items-center justify-center shadow-lg shadow-black/5 backdrop-blur-xl shrink-0 transition-all">
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
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
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/75 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.07] border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs transition-all duration-200">
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

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/75 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.07] border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs transition-all duration-200">
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

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/75 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.07] border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs transition-all duration-200">
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
          <div className="pt-6 mt-6 border-t border-white/80 dark:border-white/10 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 relative z-10 transition-colors">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>بإشراف إدارة المكتب — وصول مقيد ومحمي بالصلاحيات</span>
          </div>
        </aside>

        {/* ============ Form Panel ============ */}
        <section className="lg:col-span-7 p-6 sm:p-8 md:p-12 flex items-center justify-center bg-white/50 dark:bg-white/[0.01] backdrop-blur-xl transition-colors duration-500">
          <LoginForm />
        </section>
      </div>
    </main>
  )
}
