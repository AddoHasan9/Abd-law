import Image from 'next/image'
import { Sparkles, ShieldCheck } from 'lucide-react'

export default function AppLoading() {
  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300 select-none" dir="rtl">
      {/* Frosted Glass Floating Card */}
      <div className="relative flex flex-col items-center p-8 sm:p-10 rounded-[32px] bg-white/70 dark:bg-slate-900/65 backdrop-blur-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-black/5 dark:shadow-black/60 max-w-sm w-full ring-1 ring-black/5 dark:ring-white/10">
        
        {/* Subtle Ambient Glow behind Logo */}
        <div className="absolute top-10 w-24 h-24 bg-blue-500/20 dark:bg-cyan-500/25 rounded-full blur-2xl pointer-events-none animate-pulse" />

        {/* Logo Medallion with Dual Orbital Ring Spinner */}
        <div className="relative mb-6">
          {/* Outer glowing pulsing ring */}
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 opacity-30 blur-md animate-pulse" />
          
          {/* Rotating Spinner Ring */}
          <div className="absolute -inset-1 rounded-2xl border-2 border-transparent border-t-blue-600 dark:border-t-cyan-400 border-r-blue-400 animate-spin" />

          {/* Inner Logo Badge */}
          <div className="relative w-20 h-20 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/15 p-3 flex items-center justify-center shadow-xl backdrop-blur-xl">
            <Image
              src="/logo.png"
              alt="شعار المكتب"
              width={64}
              height={64}
              className="object-contain w-full h-full drop-shadow-sm"
              priority
            />
          </div>
        </div>

        {/* Header Text & Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/10 dark:bg-cyan-500/15 border border-blue-500/20 dark:border-cyan-500/30 text-blue-700 dark:text-cyan-300 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 animate-pulse" />
          <span>منظومة العمل القانوني</span>
        </div>

        <h3 className="text-base font-black text-slate-900 dark:text-white font-display tracking-tight mb-1">
          مكتب المحامي عبدالحسن الخزرجي
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[240px]">
          جارٍ تحميل ومزامنة البيانات وتجهيز لوحة العمل…
        </p>

        {/* Executive Animated Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mt-6 border border-slate-200/60 dark:border-white/5">
          <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400 rounded-full animate-progress" />
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-1.5 mt-5 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>اتصال آمن ومشفر 256-bit</span>
        </div>
      </div>
    </div>
  )
}
