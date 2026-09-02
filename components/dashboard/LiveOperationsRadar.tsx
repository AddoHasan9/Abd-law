'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { DashboardStats } from '@/lib/data/dashboard'
import {
  Building2,
  Landmark,
  FileCheck2,
  Clock,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Layers,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

import { useDragScroll } from '@/lib/hooks/useDragScroll'

interface Props {
  stats: DashboardStats
}

type TabType = 'overview' | 'formation' | 'deposits' | 'llc' | 'deadlines'

const FORMATION_STEPS = [
  { id: 1, label: 'الاسم التجاري', sub: 'حجز وموافقة' },
  { id: 2, label: 'مسجل الشركات', sub: 'تقديم العقد' },
  { id: 3, label: 'غرفة التجارة', sub: 'الانتساب' },
  { id: 4, label: 'الهيئة الضريبية', sub: 'الرقم والفتح' },
  { id: 5, label: 'إيداع المصرف', sub: 'تجميد رأس المال' },
  { id: 6, label: 'الموافقة الأمنية', sub: 'التدقيق' },
  { id: 7, label: 'شهادة التأسيس', sub: 'الصدور الرسمي' },
  { id: 8, label: 'إطلاق الوديعة', sub: 'اكتمال التأسيس' },
]

const DEPOSIT_STAGES = [
  { key: 'tax', label: '1. كتاب الضريبة', desc: 'مراجعة الهيئة العامة للضرائب' },
  { key: 'registrar', label: '2. كتاب المسجل', desc: 'موافقة دائرة تسجيل الشركات' },
  { key: 'submit', label: '3. التقديم للمصرف', desc: 'إشعار المصرف المودع لديه' },
  { key: 'release', label: '4. إطلاق الوديعة', desc: 'استرجاع رأس المال كاملاً' },
]

export default function LiveOperationsRadar({ stats }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const tabsScrollRef = useDragScroll<HTMLDivElement>({ speed: 1.4 })

  const formingCount = stats.formingCompaniesCount || 0
  const establishedCount = stats.establishedCompaniesCount || 0
  const depositsCount = stats.activeDepositsCount || 0
  const llcCount = stats.llcTransactionsCount || 0
  const urgentDeadlines = stats.urgentDeadlines || []
  const doneThisMonth = stats.doneThisMonthCount || 0
  const activeTx = stats.activeTxCount || 0

  const totalOps = formingCount + depositsCount + llcCount + urgentDeadlines.length
  const completionRate = totalOps > 0 ? Math.min(Math.round(((establishedCount + doneThisMonth) / (totalOps + establishedCount + doneThisMonth)) * 100), 98) : 92

  return (
    <div className="glass-card rounded-2xl p-3 sm:p-3.5 border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-[36px] flex flex-col gap-2.5 shadow-2xs relative overflow-hidden">
      
      {/* Top Header: Live Activity Beacon & Segmented Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--line-soft)]">
        
        {/* Title & Live Pulse Indicator */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shrink-0 shadow-2xs">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-black text-[var(--text)] font-display m-0 leading-tight">
                محطة العمليات وسير المسارات الحية
              </h3>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                مباشر
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-3)] font-medium mt-0.5">
              متابعة فورية وتفاعلية لخطوط سير الشركات، الودائع، والمهل القانونية
            </p>
          </div>
        </div>

        {/* Live Efficiency Gauge */}
        <div className="flex items-center gap-1.5 bg-[var(--surface-2)] px-2 py-0.5 rounded-lg border border-[var(--line-soft)]">
          <TrendingUp className="w-3 h-3 text-[var(--accent)]" />
          <span className="text-[10px] font-bold text-[var(--text-2)]">معدل الإنجاز العام:</span>
          <span className="text-[11px] font-black text-[var(--accent)] font-display">{completionRate}%</span>
        </div>
      </div>

      {/* Interactive Segmented Tabs (Framer Motion spring pills + Mouse Drag-to-Scroll) */}
      <div ref={tabsScrollRef} className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none select-none">
        {[
          { id: 'overview', label: 'نظرة شاملة', icon: Layers, count: totalOps },
          { id: 'formation', label: 'مسار التأسيس (8 خطوات)', icon: Building2, count: formingCount },
          { id: 'deposits', label: 'مسار الودائع (4 مراحل)', icon: Landmark, count: depositsCount },
          { id: 'llc', label: 'قسم المحدودة والقرارات', icon: FileCheck2, count: llcCount },
          { id: 'deadlines', label: 'المهل العاجلة والاستحقاقات', icon: Clock, count: urgentDeadlines.length },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`relative px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 flex items-center gap-1 shrink-0 cursor-pointer ${
                isActive
                  ? 'text-white'
                  : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="radarActiveTab"
                  className="absolute inset-0 bg-[#3B82F6] rounded-md shadow-sm shadow-blue-500/20"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[9.5px] rounded-full font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[var(--surface-3)] text-[var(--text-3)]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Dynamic Animated Content Panel */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
          >
            {/* 1. Track: Formation */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--line-soft)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] transition-all flex flex-col justify-between gap-2 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-3)] block mb-0.5">مسار التأسيس الحصري</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-[var(--text)] font-display">{formingCount}</span>
                    <span className="text-[10px] text-[var(--text-3)] font-medium">شركات قيد العمل</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Building2 className="w-3 h-3" />
                </div>
              </div>

              {/* Mini Step Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9.5px] font-bold text-[var(--text-3)]">
                  <span>8 خطوات متسلسلة</span>
                  <span className="text-amber-600 dark:text-amber-400">{formingCount > 0 ? 'نشط الآن' : 'جاهز'}</span>
                </div>
                <div className="h-1 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-3/4 animate-pulse" />
                </div>
              </div>

              <Link
                href="/commercial/companies"
                className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center justify-between pt-1 border-t border-[var(--line-soft)]"
              >
                <span>متابعة خط السير</span>
                <ArrowLeft className="w-2.5 h-2.5 group-hover:-translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 2. Track: Deposits */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--line-soft)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] transition-all flex flex-col justify-between gap-2 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-3)] block mb-0.5">إطلاق الودائع المصرفية</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-[var(--text)] font-display">{depositsCount}</span>
                    <span className="text-[10px] text-[var(--text-3)] font-medium">ودائع قيد المتابعة</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <Landmark className="w-3 h-3" />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[9.5px] font-bold text-[var(--text-3)]">
                  <span>المهلة القانونية (30 يوماً)</span>
                  <span className="text-blue-600 dark:text-blue-400">4 مراحل</span>
                </div>
                <div className="h-1 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3B82F6] rounded-full w-2/3" />
                </div>
              </div>

              <Link
                href="/commercial/deposits"
                className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center justify-between pt-1 border-t border-[var(--line-soft)]"
              >
                <span>استعراض الودائع</span>
                <ArrowLeft className="w-2.5 h-2.5 group-hover:-translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 3. Track: LLC & Resolutions */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--line-soft)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] transition-all flex flex-col justify-between gap-2 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-3)] block mb-0.5">الشركات المحدودة والقرارات</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-[var(--text)] font-display">{llcCount}</span>
                    <span className="text-[10px] text-[var(--text-3)] font-medium">معاملة نشطة</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <FileCheck2 className="w-3 h-3" />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[9.5px] font-bold text-[var(--text-3)]">
                  <span>زيادة رأسمال، أسهم، تجديد</span>
                  <span className="text-purple-600 dark:text-purple-400">سارية</span>
                </div>
                <div className="h-1 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-4/5" />
                </div>
              </div>

              <Link
                href="/commercial/llc"
                className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center justify-between pt-1 border-t border-[var(--line-soft)]"
              >
                <span>قسم المحدودة</span>
                <ArrowLeft className="w-2.5 h-2.5 group-hover:-translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 4. Track: Deadlines & Financials */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--line-soft)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] transition-all flex flex-col justify-between gap-2 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-3)] block mb-0.5">الحسابات والمهل القانونية</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-[var(--text)] font-display">{urgentDeadlines.length}</span>
                    <span className="text-[10px] text-[var(--text-3)] font-medium">استحقاقات عاجلة</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
                  <Clock className="w-3 h-3" />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[9.5px] font-bold text-[var(--text-3)]">
                  <span>مهل 7/10 ومسجل الشركات</span>
                  <span className="text-rose-600 dark:text-rose-400">{urgentDeadlines.length > 0 ? 'متابعة مطلوبة' : 'سليمة'}</span>
                </div>
                <div className="h-1 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full w-full" />
                </div>
              </div>

              <Link
                href="/commercial/financial-statements"
                className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center justify-between pt-1 border-t border-[var(--line-soft)]"
              >
                <span>جدول الحسابات الختامية</span>
                <ArrowLeft className="w-2.5 h-2.5 group-hover:-translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>
        )}

        {activeTab === 'formation' && (
          <motion.div
            key="formation"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--line-soft)] flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-[var(--text)]">
                  خريطة سير خطوات تأسيس الشركات (8 خطوات معيارية موثقة)
                </span>
              </div>
              <Link
                href="/commercial/companies"
                className="btn btn-primary !py-1 !px-2.5 !text-xs !rounded-lg"
              >
                <span>فتح شاشة التأسيس</span>
                <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>

            {/* 8-Step Interactive Progress Tracker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {FORMATION_STEPS.map((st) => (
                <div
                  key={st.id}
                  className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--line-soft)] flex flex-col gap-0.5 text-center hover:border-amber-500/40 transition-colors relative"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] flex items-center justify-center mx-auto mb-0.5">
                    {st.id}
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text)] leading-tight">{st.label}</span>
                  <span className="text-[9.5px] text-[var(--text-3)]">{st.sub}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'deposits' && (
          <motion.div
            key="deposits"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--line-soft)] flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-[var(--text)]">
                  المراحل الأربعة لإطلاق الودائع المصرفية (مهلة 30 يوماً وتفادي الغرامات)
                </span>
              </div>
              <Link
                href="/commercial/deposits"
                className="btn btn-primary !py-1 !px-2.5 !text-xs !rounded-lg"
              >
                <span>متابعة الودائع الحالية</span>
                <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {DEPOSIT_STAGES.map(ds => (
                <div
                  key={ds.key}
                  className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line-soft)] flex flex-col gap-1"
                >
                  <span className="text-xs font-extrabold text-[#3B82F6]">{ds.label}</span>
                  <p className="text-[10.5px] text-[var(--text-3)] leading-relaxed m-0">{ds.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'llc' && (
          <motion.div
            key="llc"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--line-soft)] flex flex-col gap-2"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-[var(--text)]">
                القرارات وتعديلات عقود الشركات المحدودة النشطة
              </span>
              <Link
                href="/commercial/llc"
                className="btn btn-primary !py-1 !px-2.5 !text-xs !rounded-lg"
              >
                <span>قسم المحدودة</span>
                <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-[11px] text-[var(--text-3)]">
              إدارة معاملات زيادة وتخفيض رأس المال، بيع وشراء وتنازل الأسهم، تجديد وتعيين المدير المفوض، ونقل مقار الشركات وفروعها.
            </p>
          </motion.div>
        )}

        {activeTab === 'deadlines' && (
          <motion.div
            key="deadlines"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--line-soft)] flex flex-col gap-2"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-[var(--text)]">
                الاستحقاقات والمهل القانونية السنوية
              </span>
              <Link
                href="/commercial/financial-statements"
                className="btn btn-primary !py-1 !px-2.5 !text-xs !rounded-lg"
              >
                <span>جدول المهل والحسابات</span>
                <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>
            {urgentDeadlines.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>كافة الشركات والمهل القانونية ضمن المواعيد السليمة ولا توجد غرامات متراكمة</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {urgentDeadlines.slice(0, 6).map((ud, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-[var(--surface)] border border-rose-500/20 flex items-center justify-between gap-1.5"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--text)] truncate block">{ud.companyName}</span>
                      <span className="text-[10px] text-[var(--text-3)]">{ud.title}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 shrink-0 bg-rose-500/10 px-1.5 py-0.2 rounded-md">
                      {ud.daysLate > 0 ? `تأخير ${ud.daysLate} يوم` : `متبقي ${ud.daysLeft} يوم`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
