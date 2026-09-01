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
    <div className="glass-card rounded-[26px] p-5 sm:p-6 border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-[36px] flex flex-col gap-5 shadow-xs relative overflow-hidden">
      
      {/* Top Header: Live Activity Beacon & Segmented Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3.5 border-b border-[var(--line-soft)]">
        
        {/* Title & Live Pulse Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shrink-0 shadow-xs">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[var(--text)] font-display m-0 leading-tight">
                محطة العمليات وسير المسارات الحية
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                مباشر
              </span>
            </div>
            <p className="text-xs text-[var(--text-3)] font-medium mt-0.5">
              متابعة فورية وتفاعلية لخطوط سير الشركات، الودائع، والمهل القانونية
            </p>
          </div>
        </div>

        {/* Live Efficiency Gauge */}
        <div className="flex items-center gap-2 bg-[var(--surface-2)] px-3 py-1.5 rounded-2xl border border-[var(--line-soft)]">
          <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-2)]">معدل الإنجاز العام:</span>
          <span className="text-sm font-extrabold text-[var(--accent)] font-display">{completionRate}%</span>
        </div>
      </div>

      {/* Interactive Segmented Tabs (Framer Motion spring pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
              className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'text-white'
                  : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="radarActiveTab"
                  className="absolute inset-0 bg-[#3B82F6] rounded-xl shadow-md shadow-blue-500/20"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10.5px] rounded-full font-extrabold ${
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5"
          >
            {/* 1. Track: Formation */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--line-soft)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-3)] block mb-1">مسار التأسيس الحصري</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[var(--text)] font-display">{formingCount}</span>
                    <span className="text-xs text-[var(--text-3)] font-medium">شركات قيد العمل</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>

              {/* Mini Step Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10.5px] font-bold text-[var(--text-3)]">
                  <span>8 خطوات متسلسلة</span>
                  <span className="text-amber-600 dark:text-amber-400">{formingCount > 0 ? 'نشط الآن' : 'جاهز'}</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-3/4 animate-pulse" />
                </div>
              </div>

              <Link
                href="/commercial/companies"
                className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center justify-between pt-1 border-t border-[var(--line-soft)]"
              >
                <span>متابعة خط السير</span>
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* 2. Track: Deposits */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--line-soft)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-3)] block mb-1">إطلاق الودائع المصرفية</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[var(--text)] font-display">{depositsCount}</span>
                    <span className="text-xs text-[var(--text-3)] font-medium">ودائع قيد المتابعة</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10.5px] font-bold text-[var(--text-3)]">
                  <span>المهلة القانونية (30 يوماً)</span>
                  <span className="text-blue-600 dark:text-blue-400">4 مراحل</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3B82F6] rounded-full w-2/3" />
                </div>
              </div>

              <Link
                href="/commercial/deposits"
                className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center justify-between pt-1 border-t border-[var(--line-soft)]"
              >
                <span>استعراض الودائع</span>
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* 3. Track: LLC & Resolutions */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--line-soft)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-3)] block mb-1">الشركات المحدودة والقرارات</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[var(--text)] font-display">{llcCount}</span>
                    <span className="text-xs text-[var(--text-3)] font-medium">معاملة تجارية نشطة</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10.5px] font-bold text-[var(--text-3)]">
                  <span>زيادة رأسمال، أسهم، تجديد</span>
                  <span className="text-purple-600 dark:text-purple-400">سارية</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-4/5" />
                </div>
              </div>

              <Link
                href="/commercial/llc"
                className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center justify-between pt-1 border-t border-[var(--line-soft)]"
              >
                <span>قسم المحدودة</span>
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* 4. Track: Deadlines & Financials */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--line-soft)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-3)] block mb-1">الحسابات والمهل القانونية</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[var(--text)] font-display">{urgentDeadlines.length}</span>
                    <span className="text-xs text-[var(--text-3)] font-medium">استحقاقات عاجلة</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10.5px] font-bold text-[var(--text-3)]">
                  <span>مهل 7/10 ومسجل الشركات</span>
                  <span className="text-rose-600 dark:text-rose-400">{urgentDeadlines.length > 0 ? 'متابعة مطلوبة' : 'سليمة'}</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full w-full" />
                </div>
              </div>

              <Link
                href="/commercial/financial-statements"
                className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center justify-between pt-1 border-t border-[var(--line-soft)]"
              >
                <span>جدول الحسابات الختامية</span>
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        )}

        {activeTab === 'formation' && (
          <motion.div
            key="formation"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--line-soft)] flex flex-col gap-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs sm:text-sm font-bold text-[var(--text)]">
                  خريطة سير خطوات تأسيس الشركات (8 خطوات معيارية موثقة)
                </span>
              </div>
              <Link
                href="/commercial/companies"
                className="btn btn-primary !py-1.5 !px-3.5 !text-xs !rounded-xl"
              >
                <span>فتح شاشة التأسيس</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 8-Step Interactive Progress Tracker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {FORMATION_STEPS.map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line-soft)] flex flex-col gap-1 text-center hover:border-amber-500/40 transition-colors relative"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] flex items-center justify-center mx-auto mb-1">
                    {st.id}
                  </div>
                  <span className="text-xs font-bold text-[var(--text)] leading-tight">{st.label}</span>
                  <span className="text-[10px] text-[var(--text-3)]">{st.sub}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'deposits' && (
          <motion.div
            key="deposits"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--line-soft)] flex flex-col gap-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span className="text-xs sm:text-sm font-bold text-[var(--text)]">
                  المراحل الأربعة لإطلاق الودائع المصرفية (مهلة 30 يوماً وتفادي الغرامات)
                </span>
              </div>
              <Link
                href="/commercial/deposits"
                className="btn btn-primary !py-1.5 !px-3.5 !text-xs !rounded-xl"
              >
                <span>متابعة الودائع الحالية</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DEPOSIT_STAGES.map(ds => (
                <div
                  key={ds.key}
                  className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line-soft)] flex flex-col gap-1.5"
                >
                  <span className="text-xs font-extrabold text-[#3B82F6]">{ds.label}</span>
                  <p className="text-[11px] text-[var(--text-3)] leading-relaxed m-0">{ds.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'llc' && (
          <motion.div
            key="llc"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--line-soft)] flex flex-col gap-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs sm:text-sm font-bold text-[var(--text)]">
                القرارات وتعديلات عقود الشركات المحدودة النشطة
              </span>
              <Link
                href="/commercial/llc"
                className="btn btn-primary !py-1.5 !px-3.5 !text-xs !rounded-xl"
              >
                <span>قسم المحدودة</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-[var(--text-3)]">
              إدارة معاملات زيادة وتخفيض رأس المال، بيع وشراء وتنازل الأسهم، تجديد وتعيين المدير المفوض، ونقل مقار الشركات وفروعها.
            </p>
          </motion.div>
        )}

        {activeTab === 'deadlines' && (
          <motion.div
            key="deadlines"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--line-soft)] flex flex-col gap-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs sm:text-sm font-bold text-[var(--text)]">
                الاستحقاقات والمهل القانونية السنوية
              </span>
              <Link
                href="/commercial/financial-statements"
                className="btn btn-primary !py-1.5 !px-3.5 !text-xs !rounded-xl"
              >
                <span>جدول المهل والحسابات</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
            {urgentDeadlines.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>كافة الشركات والمهل القانونية ضمن المواعيد السليمة ولا توجد غرامات متراكمة</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {urgentDeadlines.slice(0, 6).map((ud, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[var(--surface)] border border-rose-500/20 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--text)] truncate block">{ud.companyName}</span>
                      <span className="text-[10.5px] text-[var(--text-3)]">{ud.title}</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 shrink-0 bg-rose-500/10 px-2 py-0.5 rounded-md">
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
