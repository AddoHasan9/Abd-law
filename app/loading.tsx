export default function GlobalLoading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 animate-fade-in-up">
      <div className="relative w-14 h-14 rounded-2xl bg-[var(--surface-2)] border border-[var(--glass-border)] flex items-center justify-center shadow-lg">
        <div className="w-8 h-8 rounded-full border-3 border-[var(--accent)]/20 border-t-[var(--accent)] animate-spin" />
      </div>
      <p className="text-xs font-bold text-[var(--text-3)] animate-pulse">جاري تحميل البيانات...</p>
    </div>
  )
}
