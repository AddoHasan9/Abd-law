import { ShieldCheck } from 'lucide-react'

export default function AppLoading() {
  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300 select-none" dir="rtl">
      {/* Modern Minimalist Glass Capsule Card */}
      <div className="relative flex flex-col items-center p-7 sm:p-9 rounded-[28px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-black/5 dark:shadow-black/50 max-w-sm w-full ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
        
        {/* Ambient Laser Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-blue-500/20 via-cyan-500/10 to-transparent blur-2xl pointer-events-none" />

        {/* Modern Staggered Pulse Wave Indicator (NO Wheel Spin, NO Logo) */}
        <div className="flex items-center justify-center gap-1.5 h-12 mb-6">
          <span className="w-1.5 h-6 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-10 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-8 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full animate-bounce [animation-delay:-0.45s]" />
          <span className="w-1.5 h-11 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
          <span className="w-1.5 h-7 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full animate-bounce [animation-delay:-0.35s]" />
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/10 dark:bg-cyan-500/15 border border-blue-500/20 dark:border-cyan-500/30 text-blue-700 dark:text-cyan-300 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>تهيئة النظام ومزامنة الجلسة</span>
        </div>

        {/* Main Title */}
        <h3 className="text-base font-black text-slate-900 dark:text-white font-display tracking-tight mb-1.5">
          مكتب المحامي عبدالحسن الخزرجي
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[250px]">
          جارٍ فحص الصلاحيات وتحديث السجلات القانونية…
        </p>

        {/* Sleek Skeleton Shimmer Bars */}
        <div className="w-full space-y-2 mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent w-full animate-shimmer" />
          </div>
          <div className="w-3/4 mx-auto h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent w-full animate-shimmer [animation-delay:0.2s]" />
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex items-center gap-1.5 mt-5 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>اتصال مشفر وآمن 256-bit</span>
        </div>
      </div>
    </div>
  )
}
