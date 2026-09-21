/** تحميل عام خارج لوحة التطبيق (تسجيل الدخول وغيرها) — مؤشر صغير هادئ */
export default function GlobalLoading() {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center" aria-busy="true" aria-label="جارٍ التحميل">
      <span className="w-7 h-7 rounded-full border-[3px] border-[var(--accent-soft)] border-t-[var(--accent)] animate-spin" />
    </div>
  )
}
