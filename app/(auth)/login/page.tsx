import Image from 'next/image'
import LoginForm from './LoginForm'
import { ThemeToggle } from '@/components/auth/ThemeToggle'
import { Building2, Receipt, BadgeCheck, ShieldCheck, Scale, Sparkles } from 'lucide-react'
import { FadeInStagger } from '@/components/ui/FadeInStagger'

export const metadata = { title: 'تسجيل الدخول — مكتب المحامي عبدالحسن الخزرجي' }

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-4 md:p-8 bg-background text-foreground overflow-hidden transition-colors duration-300">
      {/* Top Floating Theme Switcher Button */}
      <div className="absolute top-4 left-4 z-50">
        <ThemeToggle />
      </div>

      {/* Dynamic Ambient Background Glow Orbs */}
      <div
        className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[130px] pointer-events-none"
        aria-hidden
      />

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-[980px] rounded-[24px] sm:rounded-[32px] bg-card/70 backdrop-blur-2xl border border-border/80 shadow-2xl shadow-black/5 dark:shadow-black/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-fade-in-up">
        
        {/* ============ Brand Presentation Panel (Desktop) ============ */}
        <aside className="hidden lg:flex lg:col-span-5 bg-secondary/60 dark:bg-secondary/30 p-8 md:p-10 flex-col justify-between border-l border-border/80 relative overflow-hidden text-right">
          
          <FadeInStagger className="space-y-6 relative z-10">
            {/* Logo Medallion */}
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-card border border-border/80 p-2 flex items-center justify-center shadow-md shadow-primary/5 backdrop-blur-md">
                <Image
                  src="/logo.png"
                  alt="شعار مكتب المحامي عبدالحسن الخزرجي"
                  width={64}
                  height={64}
                  className="object-contain w-full h-full drop-shadow-sm"
                  priority
                />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 border border-primary/20 text-primary">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  منظومة العمل القانوني الموحدة
                </span>
                <h2 className="text-base md:text-lg font-extrabold text-foreground mt-1 font-display">
                  مكتب المحامي عبدالحسن الخزرجي
                </h2>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              المنصة المتكاملة لإدارة معاملات الشركات، التحاسب الضريبي، إطلاق الودائع، وإصدار الهويات الرسمية بأعلى معايير الدقة والأمان.
            </p>

            {/* Core Pillars List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card/80 border border-border/60 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-foreground">
                  تأسيس وإدارة وتعديل الشركات
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card/80 border border-border/60 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-foreground">
                  التحاسب الضريبي وبراءة الذمة
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card/80 border border-border/60 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-foreground">
                  إصدار وتجديد الهويات والرخص
                </div>
              </div>
            </div>
          </FadeInStagger>

          {/* Footer Security Badge */}
          <div className="pt-6 mt-6 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground relative z-10">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>بإشراف إدارة المكتب — وصول مقيد ومحمي بالصلاحيات</span>
          </div>
        </aside>

        {/* ============ Form Panel ============ */}
        <section className="lg:col-span-7 p-6 sm:p-8 md:p-12 flex items-center justify-center bg-card/40">
          <LoginForm />
        </section>
      </div>
    </main>
  )
}
