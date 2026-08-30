/**
 * صفحة تسجيل الدخول — تصميم "الجناح الذهبي" بلوحين
 * ------------------------------------------------------------
 * لوح تعريفي (هوية المكتب) + لوح النموذج. المصادقة في LoginForm.
 */
import Image from 'next/image'
import LoginForm from './LoginForm'
import { IconSprite, Icon } from '@/components/ui/Icon'

export const metadata = { title: 'تسجيل الدخول — مكتب المحامي عبد الحسن الخزرجي' }

export default function LoginPage() {
  return (
    <>
      <IconSprite />
      <main id="login">
        <div className="lx-shell animate-fade-in-up">
          {/* ============ لوح النموذج ============ */}
          <section className="lx-form">
            <LoginForm />
          </section>

          {/* ============ اللوح التعريفي ============ */}
          <aside className="lx-brand">
            <div className="lx-brand-watermark" aria-hidden>
              <ScalesOfJustice />
            </div>

            <div className="lx-brand-inner">
              <div className="lx-medallion">
                <Image
                  src="/logo.png"
                  alt="شعار مكتب المحامي عبد الحسن الخزرجي"
                  width={92}
                  height={92}
                  priority
                />
              </div>

              <h2 className="lx-brand-name">
                مكتب المحامي
                <br />
                عبدالحسن الخزرجي
              </h2>

              <div className="lx-rule" aria-hidden>
                <i />
              </div>

              <span className="lx-pill">
                <span className="dot" />
                منظومة العمل القانوني الموحدة
              </span>

              <p className="lx-brand-tag">
                إدارة المعاملات وقضايا الشركات والتقييمات الضريبية
                والودائع في منصّة واحدة آمنة.
              </p>
            </div>

            <div className="lx-brand-foot" aria-hidden>
              <Icon name="shield" />
              <span>بإشراف إدارة المكتب — وصول مُقيّد بالصلاحيات</span>
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}

/** ميزان العدالة — رسم خطّي أنيق يُستخدم كعلامة مائية */
function ScalesOfJustice() {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M100 26v150M64 176h72" />
      <path d="M100 40 44 62M100 40l56 22" />
      <circle cx="100" cy="33" r="5" />
      {/* الكفة اليمنى */}
      <path d="M156 62l-20 44h40z" />
      <path d="M136 106a20 12 0 0 0 40 0" />
      {/* الكفة اليسرى */}
      <path d="M44 62l-20 44h40z" />
      <path d="M24 106a20 12 0 0 0 40 0" />
    </svg>
  )
}
