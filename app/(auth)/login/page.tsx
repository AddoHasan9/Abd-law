import Image from 'next/image'
import LoginForm from './LoginForm'

export const metadata = { title: 'تسجيل الدخول — مكتب المحامي عبدالحسن الخزرجي' }

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-4 md:p-8 bg-[#090D16] overflow-hidden">
      {/* Dynamic Ambient Background Glow Orbs */}
      <div
        className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[130px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-900/40 rounded-full blur-[100px] pointer-events-none"
        aria-hidden
      />

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-[960px] rounded-[24px] sm:rounded-[28px] bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-fade-in-up">
        {/* ============ Brand Presentation Panel (Desktop only to keep mobile direct & compact) ============ */}
        <aside className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-slate-800/50 via-slate-900/70 to-slate-950/80 p-8 md:p-10 flex-col justify-between border-l border-white/10 relative overflow-hidden text-right">
          {/* Subtle Ambient Background Watermark */}
          <div
            className="absolute -bottom-10 -left-10 opacity-5 text-amber-400 pointer-events-none select-none"
            aria-hidden
          >
            <span className="material-symbols-outlined text-[240px]">balance</span>
          </div>

          <div className="space-y-6 relative z-10">
            {/* Logo Medallion with Soft Glow */}
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/[0.06] border border-amber-500/30 p-2 flex items-center justify-center shadow-lg shadow-amber-500/10 backdrop-blur-md">
                <Image
                  src="/logo.png"
                  alt="شعار مكتب المحامي عبدالحسن الخزرجي"
                  width={64}
                  height={64}
                  className="object-contain w-full h-full drop-shadow-md"
                  priority
                />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  منظومة العمل القانوني الموحدة
                </span>
                <h2 className="text-base md:text-lg font-extrabold text-white mt-1">
                  مكتب المحامي عبدالحسن الخزرجي
                </h2>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              المنصة المتكاملة لإدارة معاملات الشركات، التحاسب الضريبي، إطلاق الودائع، وإصدار الهويات الرسمية بأعلى معايير الأمان.
            </p>

            {/* Core Pillars List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[17px]">domain</span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  تأسيس وإدارة وتعديل الشركات
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[17px]">receipt_long</span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  التحاسب الضريبي وبراءة الذمة
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[17px]">badge</span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  إصدار وتجديد الهويات والرخص
                </div>
              </div>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="pt-6 mt-6 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400 relative z-10">
            <span className="material-symbols-outlined text-[16px] text-amber-400">
              verified_user
            </span>
            <span>بإشراف إدارة المكتب — وصول مقيد ومحمي بالصلاحيات</span>
          </div>
        </aside>

        {/* ============ Form Panel (Direct and Centered on Mobile, 7 cols on Desktop) ============ */}
        <section className="lg:col-span-7 p-5 sm:p-8 md:p-12 flex items-center justify-center bg-slate-950/40">
          <LoginForm />
        </section>
      </div>
    </main>
  )
}
