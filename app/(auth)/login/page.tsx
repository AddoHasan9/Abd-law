import Image from 'next/image'
import LoginForm from './LoginForm'
import { ThemeToggle } from '@/components/auth/ThemeToggle'
import { Building2, Receipt, BadgeCheck, ShieldCheck, Sparkles } from 'lucide-react'
import { FadeInStagger } from '@/components/ui/FadeInStagger'

export const metadata = { title: 'تسجيل الدخول — مكتب المحامي عبدالحسن الخزرجي' }

export default function LoginPage() {
  return (
    <main className="login-page hz-login">
      {/* إضاءة الخلفية الخافتة (أسلوب Horizon) */}
      <div className="hz-login-sky" aria-hidden />

      <div className="hz-login-theme">
        <ThemeToggle />
      </div>

      <div className="hz-login-shell">
        {/* ============ لوحة الهوية (الحاسبة) ============ */}
        <aside className="hz-login-brand">
          <FadeInStagger className="hz-login-brand-body">
            <div className="hz-login-logo">
              <Image src="/logo.png" alt="شعار مكتب المحامي عبدالحسن الخزرجي" width={80} height={80} className="object-contain w-full h-full" priority />
            </div>
            <div>
              <span className="hz-login-badge"><Sparkles className="w-3.5 h-3.5" aria-hidden />منظومة العمل القانوني والشركات</span>
              <p className="hz-login-name">مكتب المحامي عبدالحسن الخزرجي</p>
              <p className="hz-login-tag">للمحاماة والاستشارات القانونية وتأسيس الشركات</p>
            </div>
            <p className="hz-login-desc">
              المنصة المتكاملة لإدارة معاملات التأسيس والشركات المحدودة، والتحاسب الضريبي، وإطلاق الودائع، وإصدار الهويات الرسمية.
            </p>
            <div className="hz-login-feats">
              <div className="hz-login-feat" style={{ ['--t' as string]: 'var(--coral)' }}>
                <span className="hz-login-feat-ic"><Building2 className="h-[18px] w-[18px]" aria-hidden /></span>
                <span><b>تأسيس وإدارة الشركات المحدودة</b><small>متابعة خط السير والقرارات التأسيسية</small></span>
              </div>
              <div className="hz-login-feat" style={{ ['--t' as string]: 'var(--sky)' }}>
                <span className="hz-login-feat-ic"><Receipt className="h-[18px] w-[18px]" aria-hidden /></span>
                <span><b>التحاسب الضريبي وبراءة الذمة</b><small>الحسابات الختامية ومهل مسجل الشركات</small></span>
              </div>
              <div className="hz-login-feat" style={{ ['--t' as string]: 'var(--lav)' }}>
                <span className="hz-login-feat-ic"><BadgeCheck className="h-[18px] w-[18px]" aria-hidden /></span>
                <span><b>إصدار وتجديد الهويات والرخص</b><small>هوية مستورد، غرفة التجارة، والشهادات</small></span>
              </div>
            </div>
          </FadeInStagger>
          <div className="hz-login-foot">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            <span>بإشراف إدارة المكتب — اتصال مشفّر ومحمي</span>
          </div>
        </aside>

        {/* ============ النموذج ============ */}
        <section className="hz-login-form">
          <LoginForm />
        </section>
      </div>
    </main>
  )
}
