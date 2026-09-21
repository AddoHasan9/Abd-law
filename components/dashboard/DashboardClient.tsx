'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate, formatFullDate } from '@/lib/constants'
import type { DashboardStats } from '@/lib/data/dashboard'
import type { ProfileWithStats } from '@/lib/data/profiles'
import type { Company } from '@/types/database'
import RemindersWidget from './RemindersWidget'
import { WorkflowStatus } from '@/components/ui/WorkflowStatus'
import { FadeInStagger } from '@/components/ui/FadeInStagger'
import { RollingNumber } from '@/components/ui/RollingNumber'
import { AnimatedTabs } from '@/components/ui/AnimatedTabs'

interface Props {
  stats: DashboardStats
  profiles?: ProfileWithStats[]
  companies?: Company[]
}

export default function DashboardClient({ stats, profiles = [], companies = [] }: Props) {
  const [txFilter, setTxFilter] = useState<'all' | 'progress' | 'new' | 'done'>('all')

  // Dynamic values mapped from stats store
  const establishedCount = stats.establishedCompaniesCount ?? stats.totalCompaniesCount ?? 0
  const formingCount = stats.formingCompaniesCount ?? 0
  const llcCount = stats.llcTransactionsCount ?? 0
  const depositsCount = stats.activeDepositsCount ?? 0
  const idsCount = stats.totalIDsCount ?? (stats.expiryAlerts?.length || 0)
  const recentTxs = stats.recentTransactions || []

  const filteredRecentTxs = recentTxs.filter(tx => {
    if (txFilter === 'all') return true
    if (txFilter === 'progress') return tx.status === 'progress' || tx.status === 'doing'
    if (txFilter === 'new') return tx.status === 'new' || tx.status === 'wait'
    if (txFilter === 'done') return tx.status === 'done' || tx.status === 'completed'
    return true
  })

  // Dynamic active lawyers from users table
  const activeLawyers = profiles.filter(p => p.active !== false && !p.id.startsWith('prof_'))
  const displayLawyers: ProfileWithStats[] = activeLawyers.length
    ? activeLawyers
    : [
        {
          id: 'db13125d-3aa1-46ab-9159-8fad18746623',
          name: 'منتظر الخزرجي',
          role: 'super_admin',
          title: 'مدير النظام الأعلى',
          active_tx_count: 0,
          active: true,
          created_at: '',
          dept: 'الإدارة العامة',
          phone: null,
        },
      ]

  const maxWorkload = Math.max(...displayLawyers.map(l => l.active_tx_count ?? 0), 1)

  return (
    <div className="flex flex-col w-full gap-3.5 relative z-10 animate-fade-in-up">
      
      {/* 1. Executive Page Header (Calm, Dignified, No Redundant Buttons) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full gap-2.5 pb-2.5 border-b border-[var(--line-soft)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--accent)] flex items-center justify-center shadow-2xs">
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] leading-tight">
                لوحة التحكم التنفيذية
              </h1>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                متصل ومحدّث
              </span>
            </div>
            <p className="text-xs text-[var(--text-3)] leading-tight mt-0.5">
              مكتب المحامي عبدالحسن الخزرجي — ملخص شامل للعمليات والشركات والمهل القانونية
            </p>
          </div>
        </div>

        {/* Live Date Pill */}
        <div className="flex items-center gap-1.5 self-start lg:self-auto shrink-0 bg-[var(--surface-2)] px-3 py-1.5 rounded-xl border border-[var(--glass-border)] text-xs text-[var(--text-2)] font-semibold shadow-2xs">
          <span className="material-symbols-outlined text-[14px] text-[var(--accent)]">calendar_today</span>
          <span dir="rtl">{formatFullDate()}</span>
        </div>
      </div>

      {/* 2. Executive Metric Pillars with GSAP Fade-In Stagger */}
      <FadeInStagger className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 w-full">
        {/* Metric 1: Established Companies (الشركات المؤسسة) */}
        <Link
          href="/commercial/companies-registry"
          className="glass-card p-2.5 sm:p-3 rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-1.5 mb-1.5 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] font-bold text-[var(--text-3)] mb-0.5 leading-tight">الشركات المؤسسة</span>
              <RollingNumber value={establishedCount} className="text-lg sm:text-xl font-black text-[var(--text)] leading-none" />
            </div>
            <div className="w-6 h-6 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[15px]">domain</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-2)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2 py-0.5 rounded-md relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>دليل الشركات</span>
            <span className="material-symbols-outlined text-[11px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 2: Forming Companies (قيد التأسيس) */}
        <Link
          href="/commercial/companies"
          className="glass-card p-2.5 sm:p-3 rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-1.5 mb-1.5 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] font-bold text-[var(--text-3)] mb-0.5 leading-tight">قيد التأسيس</span>
              <RollingNumber value={formingCount} className="text-lg sm:text-xl font-black text-[var(--text)] leading-none" />
            </div>
            <div className="w-6 h-6 shrink-0 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[15px]">pending_actions</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-2)] group-hover:text-amber-600 dark:group-hover:text-amber-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2 py-0.5 rounded-md relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>مسار التأسيس (8)</span>
            <span className="material-symbols-outlined text-[11px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 3: Active Deposits (إطلاق الوديعة) */}
        <Link
          href="/commercial/deposits"
          className="glass-card p-2.5 sm:p-3 rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-1.5 mb-1.5 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] font-bold text-[var(--text-3)] mb-0.5 leading-tight">إطلاق الوديعة</span>
              <RollingNumber value={depositsCount} className="text-lg sm:text-xl font-black text-[var(--text)] leading-none" />
            </div>
            <div className="w-6 h-6 shrink-0 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[15px]">savings</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-2)] group-hover:text-blue-600 dark:group-hover:text-blue-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2 py-0.5 rounded-md relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>مسار الودائع (4)</span>
            <span className="material-symbols-outlined text-[11px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 4: LLC Transactions (قسم المحدودة) */}
        <Link
          href="/commercial/llc"
          className="glass-card p-2.5 sm:p-3 rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-1.5 mb-1.5 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] font-bold text-[var(--text-3)] mb-0.5 leading-tight">قسم المحدودة</span>
              <RollingNumber value={llcCount} className="text-lg sm:text-xl font-black text-[var(--text)] leading-none" />
            </div>
            <div className="w-6 h-6 shrink-0 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[15px]">history_edu</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-2)] group-hover:text-blue-600 dark:group-hover:text-blue-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2 py-0.5 rounded-md relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>معاملات نشطة</span>
            <span className="material-symbols-outlined text-[11px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 5: Company IDs (قسم الهويات) */}
        <Link
          href="/commercial/ids"
          className="glass-card p-2.5 sm:p-3 rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-1.5 mb-1.5 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] font-bold text-[var(--text-3)] mb-0.5 leading-tight">قسم الهويات</span>
              <RollingNumber value={idsCount} className="text-lg sm:text-xl font-black text-[var(--text)] leading-none" />
            </div>
            <div className="w-6 h-6 shrink-0 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[15px]">badge</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-2)] group-hover:text-purple-600 dark:group-hover:text-purple-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2 py-0.5 rounded-md relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>مستورد / ضريبة</span>
            <span className="material-symbols-outlined text-[11px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 6: Financial Statements (الحسابات الختامية) */}
        <Link
          href="/commercial/financial-statements"
          className="glass-card p-2.5 sm:p-3 rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-1.5 mb-1.5 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] font-bold text-[var(--text-3)] mb-0.5 leading-tight">الحسابات الختامية</span>
              <RollingNumber value={stats.urgentDeadlines?.length || 0} className="text-lg sm:text-xl font-black text-[var(--text)] leading-none" />
            </div>
            <div className="w-6 h-6 shrink-0 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[15px]">receipt_long</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-2)] group-hover:text-rose-600 dark:group-hover:text-rose-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2 py-0.5 rounded-md relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>مهلة 7/10 السنوية</span>
            <span className="material-symbols-outlined text-[11px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>
      </FadeInStagger>

      {/* 3. Central Interactive Bento Section: Active Transactions (8 cols) + Reminders & Deadlines (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 w-full">
        
        {/* Right 8 Cols: Recent Active Transactions Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="glass-card rounded-[22px] p-3.5 sm:p-4.5 flex flex-col gap-3 h-full border border-[var(--glass-border)]">
            
            {/* Header & Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[var(--line-soft)]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[var(--accent-soft)] rounded-lg border border-[var(--accent)]/20 text-[var(--accent)]">
                  <span className="material-symbols-outlined text-[17px]">assignment</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)] m-0">أحدث المعاملات وسير العمل</h3>
                  <span className="text-[10.5px] text-[var(--text-3)]">متابعة وتحديث حالة سير العمل اليومية مباشرة</span>
                </div>
              </div>

              {/* Animated Segmented Filter Tabs */}
              <AnimatedTabs<'all' | 'progress' | 'new' | 'done'>
                layoutId="dashboard-tx"
                size="sm"
                activeTab={txFilter}
                onChange={setTxFilter}
                tabs={[
                  { id: 'all', label: 'الكل', count: recentTxs.length },
                  { id: 'progress', label: 'قيد الإنجاز' },
                  { id: 'new', label: 'جديدة' },
                  { id: 'done', label: 'مكتملة' },
                ]}
              />
            </div>

            {/* Transactions Responsive Table */}
            {filteredRecentTxs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-3)] flex flex-col items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[26px] opacity-40">inbox</span>
                <span>لا توجد معاملات مطابقة في هذا الفلتر</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--line-soft)] text-[var(--text-3)] bg-[var(--surface-2)]/50 text-[11px]">
                      <th className="py-2 px-2.5 font-bold">الشركة / المعاملة</th>
                      <th className="py-2 px-2.5 font-bold text-center">نوع المعاملة</th>
                      <th className="py-2 px-2.5 font-bold text-center">المحامي المكلف</th>
                      <th className="py-2 px-2.5 font-bold text-center">الحالة</th>
                      <th className="py-2 px-2.5 font-bold text-center">التاريخ</th>
                      <th className="py-2 px-2.5 font-bold text-left">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentTxs.slice(0, 7).map(tx => (
                      <tr key={tx.id} className="border-b border-[var(--line-soft)]/50 hover:bg-[var(--surface-2)]/60 transition-colors">
                        {/* Company / Task Name */}
                        <td className="py-2 px-2.5">
                          <div className="flex flex-col min-w-[160px]">
                            <span className="font-extrabold text-[var(--text)] text-xs truncate max-w-[260px]">
                              {tx.companyName || tx.clientName || 'معاملة تجارية'}
                            </span>
                            {tx.clientName && tx.companyName && (
                              <span className="text-[10px] text-[var(--text-3)] truncate">
                                العميل: {tx.clientName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Transaction Type */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span className="badge-type text-[10.5px]">
                            {tx.typeLabel}
                          </span>
                        </td>

                        {/* Assigned Lawyer from DB */}
                        <td className="py-2 px-2.5 text-center text-[var(--text-2)] font-semibold text-[11px] whitespace-nowrap">
                          {tx.lawyerName || 'غير محدد'}
                        </td>

                        {/* Live Workflow Status Badge */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <WorkflowStatus
                            status={tx.status}
                            entityId={tx.id}
                            entityType="transaction"
                            size="sm"
                          />
                        </td>

                        {/* Real Date */}
                        <td className="py-2 px-2.5 text-center num text-[var(--text-3)] text-[11px] whitespace-nowrap">
                          {tx.txDate ? formatDate(tx.txDate) : '—'}
                        </td>

                        {/* Action Button */}
                        <td className="py-2 px-2.5 text-left whitespace-nowrap">
                          <Link
                            href={
                              tx.companyId
                                ? (tx.type === 'formation' || tx.typeLabel?.includes('تأسيس')
                                    ? `/commercial/companies?id=${tx.companyId}`
                                    : `/commercial/companies/${tx.companyId}`)
                                : (tx.type === 'llc' ? `/commercial/llc?id=${tx.id}` : '/commercial')
                            }
                            className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors border border-[var(--accent)]/20 hover:border-[var(--accent)]/40"
                          >
                            عرض
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* View All Footer Link */}
            <div className="pt-2 flex justify-between items-center text-[11px] text-[var(--text-3)] border-t border-[var(--line-soft)] mt-auto">
              <span>عرض أحدث {Math.min(7, filteredRecentTxs.length)} من أصل {recentTxs.length} معاملة مسجلة</span>
              <Link
                href="/commercial"
                className="font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>الانتقال لكافة المعاملات</span>
                <span className="material-symbols-outlined text-[12px]">arrow_left</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Left 4 Cols: Reminders Widget */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <RemindersWidget companies={companies} />
        </div>
      </div>

      {/* 4. Bottom Analytical Bento Section: Team Workload & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 w-full">
        
        {/* Workload Distribution (Span 6) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="glass-card rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 h-full border border-[var(--glass-border)] bg-[var(--surface-glass)] backdrop-blur-[36px]">
            
            {/* Header: Title, Total Staff Counter & Direct Link */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--line-soft)] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shadow-2xs shrink-0">
                  <span className="material-symbols-outlined text-[17px]">group</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-[var(--text)] m-0 leading-tight">
                    توزيع المهام والمعاملات على الكادر
                  </h3>
                  <span className="text-[10px] text-[var(--text-3)] font-medium mt-0.5 block">
                    متابعة الطاقة الاستيعابية والمهام المسندة للفريق
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--glass-border)]">
                  {displayLawyers.length} أعضاء
                </span>
                <Link
                  href="/settings/users"
                  className="text-[10.5px] font-bold text-[var(--accent)] hover:underline flex items-center gap-0.5 transition-colors"
                >
                  <span>إدارة الكادر</span>
                  <span className="material-symbols-outlined text-[12px]">chevron_left</span>
                </Link>
              </div>
            </div>

            {/* Staff Workload Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
              {displayLawyers.map(lawyer => {
                const count = lawyer.active_tx_count ?? 0
                const percent = Math.min(100, Math.round((count / maxWorkload) * 100))
                const roleLabel = lawyer.title || (lawyer.role === 'super_admin' ? 'مدير النظام الأعلى' : lawyer.role === 'manager' ? 'مدير العمليات' : 'محامي ومستشار')
                const isFree = count === 0
                const initial = lawyer.name.trim().slice(0, 1) || '؟'

                // Capacity Color Coding
                const barGradient = isFree
                  ? 'from-emerald-500 to-teal-500'
                  : percent <= 45
                  ? 'from-emerald-500 to-blue-500'
                  : percent <= 80
                  ? 'from-blue-500 to-indigo-600'
                  : 'from-amber-500 to-rose-500'

                const statusColor = isFree
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : percent <= 45
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20'
                  : percent <= 80
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'

                return (
                  <div
                    key={lawyer.id || lawyer.name}
                    className="flex flex-col justify-between gap-2 p-3 rounded-xl bg-[var(--surface-2)]/70 hover:bg-[var(--surface-2)] border border-[var(--glass-border)] hover:border-[var(--accent)]/30 transition-all shadow-2xs group"
                  >
                    {/* Top Row: Avatar + Name + Task Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Circular Avatar with Online Indicator */}
                        <div className="relative shrink-0">
                          {lawyer.avatar_url ? (
                            <img
                              src={lawyer.avatar_url}
                              alt={lawyer.name}
                              className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center border border-white/20 shadow-xs">
                              {initial}
                            </div>
                          )}
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-[var(--surface-2)]"
                            title="نشط"
                          />
                        </div>

                        {/* Staff Name & Role */}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-[var(--text)] truncate leading-tight group-hover:text-[var(--accent)] transition-colors">
                            {lawyer.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-3)] font-medium mt-0.5 truncate">
                            {roleLabel} {lawyer.dept ? `• ${lawyer.dept}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Workload Status Tag */}
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                        {isFree ? 'متاح للعمل' : `${count} مهام نشطة`}
                      </span>
                    </div>

                    {/* Middle Section: Task Capacity & Interactive Progress Ratio Bar */}
                    <div className="space-y-1 pt-1 border-t border-[var(--line-soft)]/50">
                      <div className="flex items-center justify-between text-[10.5px] font-bold">
                        <span className="text-[var(--text-3)]">نسبة الإشغال:</span>
                        <span className={`font-mono ${isFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--accent)]'}`}>
                          {isFree ? '0% (طاقة شاغرة)' : `${percent}% من الطاقة الاستيعابية`}
                        </span>
                      </div>

                      {/* Animated Task Ratio Progress Bar */}
                      <div className="w-full h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden p-[0.5px]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
                          style={{ width: `${isFree ? 0 : Math.max(12, percent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Micro Details: Direct Contact / Email */}
                    {(lawyer.email || lawyer.phone) && (
                      <div className="flex items-center justify-between text-[10.5px] text-[var(--text-3)] font-mono pt-1 border-t border-[var(--line-soft)]/40 truncate">
                        <span className="truncate" dir="ltr">
                          {lawyer.phone || lawyer.email}
                        </span>
                        <span className="text-[10.5px] text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors shrink-0">
                          تفاصيل الملف ←
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Workflow Status Distribution (Span 6) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="glass-card rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 h-full border border-[var(--glass-border)]">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line-soft)]">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text)] flex items-center gap-1.5 m-0">
                <div className="p-1 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                  <span className="material-symbols-outlined text-[16px]">pie_chart</span>
                </div>
                <span>حالات سير العمل في النظام</span>
              </h3>

              <span className="text-[10.5px] text-[var(--text-3)] font-semibold">
                إجمالي {stats.totalCompaniesCount + stats.activeTxCount} بند
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
              {stats.statusDistribution.slice(0, 6).map(st => (
                <div
                  key={st.id}
                  style={{
                    backgroundColor: st.bg || 'var(--surface-2)',
                    borderColor: st.border || 'var(--line-soft)',
                  }}
                  className="flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 shadow-2xs"
                >
                  <span style={{ color: st.text || 'var(--text)' }} className="text-[11px] font-bold">
                    {st.label}
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-black num" style={{ color: st.text || 'var(--text)' }}>
                      {st.count}
                    </span>
                    <span className="text-[10.5px] text-[var(--text-3)] font-semibold">معاملة</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
