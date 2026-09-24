import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)] text-[var(--text)] font-sans antialiased text-right" dir="rtl">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[var(--surface)] border border-[var(--glass-border)] shadow-2xl text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[color:color-mix(in_srgb,var(--accent)_15%,transparent)] border border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)] flex items-center justify-center text-[var(--accent)] text-3xl shadow-inner">
          <span className="material-symbols-outlined text-[36px]">search_off</span>
        </div>

        <div>
          <h1 className="text-2xl font-black text-[var(--text)] mb-2">الصفحة غير موجودة (404)</h1>
          <p className="text-sm text-[var(--text-3)] leading-relaxed">
            عذراً، الرابط الذي تحاول الوصول إليه غير متوفر أو تم نقله إلى مسار آخر.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full pt-2">
          <Link
            href="/dashboard"
            className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent)] text-slate-950 font-bold text-sm hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            <span>لوحة التحكم</span>
          </Link>
          <Link
            href="/commercial/companies"
            className="py-3 px-4 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-[var(--text)] font-bold text-sm hover:bg-[var(--surface-3)] transition-all flex items-center justify-center gap-2"
          >
            <span>الشركات</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
