'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate, formatFullDate } from '@/lib/constants'
import type { DashboardStats } from '@/lib/data/dashboard'
import type { ProfileWithStats } from '@/lib/data/profiles'
import RemindersWidget from './RemindersWidget'
import { WorkflowStatus } from '@/components/ui/WorkflowStatus'
import { FadeInStagger } from '@/components/ui/FadeInStagger'
import { RollingNumber } from '@/components/ui/RollingNumber'
import LiveOperationsRadar from './LiveOperationsRadar'

interface Props {
  stats: DashboardStats
  profiles?: ProfileWithStats[]
}

export default function DashboardClient({ stats, profiles = [] }: Props) {
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
          title: 'مدير النظام الأعلى (Super Admin)',
          active_tx_count: 0,
          active: true,
          created_at: '',
          dept: 'الإدارة العامة',
          phone: null,
        },
      ]

  const maxWorkload = Math.max(...displayLawyers.map(l => l.active_tx_count ?? 0), 1)

  return (
    <div className="flex flex-col w-full gap-6 relative z-10 animate-fade-in-up">
      
      {/* 1. Executive Page Header (Calm, Dignified, No Redundant Buttons) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full gap-3 lg:gap-4 pb-4 border-b border-[var(--line-soft)]">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--accent)] flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[22px]">account_balance</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--text)] leading-tight">
                لوحة التحكم التنفيذية
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                متصل ومحدّث
              </span>
            </div>
            <p className="mt-1.5 text-xs md:text-sm text-[var(--text-3)] leading-relaxed">
              مكتب المحامي عبدالحسن الخزرجي — ملخص شامل للعمليات والشركات والمهل القانونية
            </p>
          </div>
        </div>

        {/* Live Date Pill */}
        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 bg-[var(--surface-2)] px-3.5 py-2 rounded-xl border border-[var(--glass-border)] text-[12.5px] text-[var(--text-2)] font-semibold shadow-xs">
          <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">calendar_today</span>
          <span dir="rtl">{formatFullDate()}</span>
        </div>
      </div>

      {/* 2. Executive Metric Pillars with GSAP Fade-In Stagger */}
      <FadeInStagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 w-full">
        {/* Metric 1: Established Companies (الشركات المؤسسة) */}
        <Link
          href="/commercial/companies-registry"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">الشركات المؤسسة</span>
              <RollingNumber value={establishedCount} className="text-[22px] sm:text-3xl text-[var(--text)] leading-none" />
            </div>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[20px]">domain</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-2)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2.5 py-1 rounded-xl relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>دليل الشركات</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 2: Forming Companies (قيد التأسيس) */}
        <Link
          href="/commercial/companies"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">قيد التأسيس</span>
              <RollingNumber value={formingCount} className="text-[22px] sm:text-3xl text-[var(--text)] leading-none" />
            </div>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-2)] group-hover:text-amber-600 dark:group-hover:text-amber-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2.5 py-1 rounded-xl relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>مسار التأسيس (8)</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 3: Active Deposits (إطلاق الوديعة) */}
        <Link
          href="/commercial/deposits"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">إطلاق الوديعة</span>
              <RollingNumber value={depositsCount} className="text-[22px] sm:text-3xl text-[var(--text)] leading-none" />
            </div>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[20px]">savings</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-2)] group-hover:text-blue-600 dark:group-hover:text-blue-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2.5 py-1 rounded-xl relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>مسار الودائع (4)</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 4: LLC Transactions (قسم المحدودة) */}
        <Link
          href="/commercial/llc"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">قسم المحدودة</span>
              <RollingNumber value={llcCount} className="text-[22px] sm:text-3xl text-[var(--text)] leading-none" />
            </div>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[20px]">history_edu</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-2)] group-hover:text-blue-600 dark:group-hover:text-blue-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2.5 py-1 rounded-xl relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>معاملات نشطة</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 5: Company IDs (قسم الهويات) */}
        <Link
          href="/commercial/ids"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">قسم الهويات</span>
              <RollingNumber value={idsCount} className="text-[22px] sm:text-3xl text-[var(--text)] leading-none" />
            </div>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-2)] group-hover:text-purple-600 dark:group-hover:text-purple-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2.5 py-1 rounded-xl relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>مستورد / ضريبة</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 6: Financial Statements (الحسابات الختامية) */}
        <Link
          href="/commercial/financial-statements"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300 block border border-[var(--border)] bg-[var(--surface-glass)]"
        >
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">الحسابات الختامية</span>
              <RollingNumber value={stats.urgentDeadlines?.length || 0} className="text-[22px] sm:text-3xl text-[var(--text)] leading-none" />
            </div>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-2)] group-hover:text-rose-600 dark:group-hover:text-rose-400 bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] px-2.5 py-1 rounded-xl relative z-10 border border-[var(--line-soft)] transition-colors">
            <span>مهلة 7/10 السنوية</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>
      </FadeInStagger>

      {/* 2.5 Live Executive Operations & Workflow Radar (Animated Hub) */}
      <LiveOperationsRadar stats={stats} />

      {/* 3. Central Interactive Bento Section: Active Transactions (8 cols) + Reminders & Deadlines (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        
        {/* Right 8 Cols: Recent Active Transactions Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="glass-card rounded-[28px] p-5 sm:p-6 flex flex-col gap-4 h-full border border-[var(--glass-border)]">
            
            {/* Header & Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-[var(--line-soft)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[var(--accent-soft)] rounded-xl border border-[var(--accent)]/20 text-[var(--accent)]">
                  <span className="material-symbols-outlined text-[20px]">assignment</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text)] m-0">أحدث المعاملات وسير العمل</h3>
                  <span className="text-[11.5px] text-[var(--text-3)]">متابعة وتحديث حالة سير العمل اليومية مباشرة</span>
                </div>
              </div>

              {/* Filter Pills with Active Glow */}
              <div className="flex items-center gap-1.5 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--glass-border)]">
                <button
                  type="button"
                  onClick={() => setTxFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${txFilter === 'all' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-3)] hover:text-[var(--text)]'}`}
                >
                  الكل ({recentTxs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTxFilter('progress')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${txFilter === 'progress' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-3)] hover:text-[var(--text)]'}`}
                >
                  قيد الإنجاز
                </button>
                <button
                  type="button"
                  onClick={() => setTxFilter('new')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${txFilter === 'new' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-3)] hover:text-[var(--text)]'}`}
                >
                  جديدة
                </button>
                <button
                  type="button"
                  onClick={() => setTxFilter('done')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${txFilter === 'done' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-3)] hover:text-[var(--text)]'}`}
                >
                  مكتملة
                </button>
              </div>
            </div>

            {/* Transactions Responsive Table */}
            {filteredRecentTxs.length === 0 ? (
              <div className="py-14 text-center text-sm text-[var(--text-3)] flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[32px] opacity-40">inbox</span>
                <span>لا توجد معاملات مطابقة في هذا الفلتر</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--line-soft)] text-[var(--text-3)] bg-[var(--surface-2)]/50">
                      <th className="py-3 px-3 font-bold">الشركة / المعاملة</th>
                      <th className="py-3 px-3 font-bold text-center">نوع المعاملة</th>
                      <th className="py-3 px-3 font-bold text-center">المحامي المكلف</th>
                      <th className="py-3 px-3 font-bold text-center">الحالة</th>
                      <th className="py-3 px-3 font-bold text-center">التاريخ</th>
                      <th className="py-3 px-3 font-bold text-left">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentTxs.slice(0, 8).map(tx => (
                      <tr key={tx.id} className="border-b border-[var(--line-soft)]/50 hover:bg-[var(--surface-2)]/60 transition-colors">
                        {/* Company / Task Name */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col min-w-[180px]">
                            <span className="font-extrabold text-[var(--text)] text-xs truncate max-w-[280px]">
                              {tx.companyName || tx.clientName || 'معاملة تجارية'}
                            </span>
                            {tx.clientName && tx.companyName && (
                              <span className="text-[10.5px] text-[var(--text-3)] truncate">
                                العميل: {tx.clientName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Transaction Type */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="badge-type">
                            {tx.typeLabel}
                          </span>
                        </td>

                        {/* Assigned Lawyer from DB */}
                        <td className="py-3 px-3 text-center text-[var(--text-2)] font-semibold whitespace-nowrap">
                          {tx.lawyerName || 'غير محدد'}
                        </td>

                        {/* Live Workflow Status Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <WorkflowStatus
                            status={tx.status}
                            entityId={tx.id}
                            entityType="transaction"
                            size="sm"
                          />
                        </td>

                        {/* Real Date */}
                        <td className="py-3 px-3 text-center num text-[var(--text-3)] whitespace-nowrap">
                          {tx.txDate ? formatDate(tx.txDate) : '—'}
                        </td>

                        {/* Action Button */}
                        <td className="py-3 px-3 text-left whitespace-nowrap">
                          <Link
                            href={tx.companyId ? `/commercial/companies/${tx.companyId}` : '/commercial/llc'}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors border border-[var(--accent)]/20"
                          >
                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                            <span>عرض</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* View All Footer Link */}
            <div className="pt-3 flex justify-between items-center text-xs text-[var(--text-3)] border-t border-[var(--line-soft)] mt-auto">
              <span>عرض أحدث {Math.min(7, filteredRecentTxs.length)} من أصل {recentTxs.length} معاملة مسجلة</span>
              <Link
                href="/commercial"
                className="font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>الانتقال لكافة المعاملات</span>
                <span className="material-symbols-outlined text-[13px]">arrow_left</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Left 4 Cols: Reminders Widget */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <RemindersWidget />
        </div>
      </div>

      {/* 4. Bottom Analytical Bento Section: Team Workload & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        
        {/* Workload Distribution (Span 6) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="glass-card rounded-[28px] p-5 flex flex-col gap-3.5 h-full border border-[var(--glass-border)]">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--line-soft)]">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <div className="p-1.5 bg-[var(--accent-soft)] rounded-lg text-[var(--accent)]">
                  <span className="material-symbols-outlined text-[18px]">group</span>
                </div>
                <span>توزيع المهام والمعاملات على الكادر</span>
              </h3>

              <Link
                href="/settings/users"
                className="text-[11.5px] font-semibold text-[var(--text-3)] hover:text-[var(--accent)] transition-colors flex items-center gap-1 bg-[var(--surface-2)] px-2.5 py-1 rounded-full border border-[var(--glass-border)]"
              >
                <span>المستخدمون</span>
                <span className="material-symbols-outlined text-[13px]">chevron_left</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
              {displayLawyers.map(lawyer => {
                const count = lawyer.active_tx_count ?? 0
                const percent = Math.min(100, Math.round((count / maxWorkload) * 100))
                const roleLabel = lawyer.title || (lawyer.role === 'super_admin' ? 'مدير النظام' : lawyer.role === 'manager' ? 'مدير عمليات' : 'محامي')
                const isFree = count === 0

                return (
                  <div
                    key={lawyer.id || lawyer.name}
                    className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] justify-between"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] font-extrabold flex items-center justify-center text-[11px] flex-none">
                          {lawyer.name.trim().slice(0, 1)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[var(--text)] truncate">
                            {lawyer.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-3)]">
                            {roleLabel}
                          </span>
                        </div>
                      </div>

                      {isFree ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex-none">
                          متاح
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full num flex-none">
                          {count} مهام
                        </span>
                      )}
                    </div>

                    <div className="w-full h-1.5 bg-[var(--line-soft)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-blue-500 transition-all duration-500"
                        style={{ width: `${isFree ? 0 : Math.max(15, percent)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Workflow Status Distribution (Span 6) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="glass-card rounded-[28px] p-5 flex flex-col gap-3.5 h-full border border-[var(--glass-border)]">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--line-soft)]">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                  <span className="material-symbols-outlined text-[18px]">pie_chart</span>
                </div>
                <span>حالات سير العمل في النظام</span>
              </h3>

              <span className="text-[11.5px] text-[var(--text-3)] font-semibold">
                إجمالي {stats.totalCompaniesCount + stats.activeTxCount} بند مسجل
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1">
              {stats.statusDistribution.slice(0, 6).map(st => (
                <div
                  key={st.id}
                  style={{
                    backgroundColor: st.bg || 'var(--surface-2)',
                    borderColor: st.border || 'var(--line-soft)',
                  }}
                  className="flex flex-col justify-between p-3 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 shadow-xs"
                >
                  <span style={{ color: st.text || 'var(--text)' }} className="text-xs font-bold">
                    {st.label}
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-xl font-extrabold num" style={{ color: st.text || 'var(--text)' }}>
                      {st.count}
                    </span>
                    <span className="text-[10px] text-[var(--text-3)] font-semibold">معاملة/شركة</span>
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
