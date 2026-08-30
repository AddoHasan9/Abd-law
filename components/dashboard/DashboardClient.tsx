'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate, formatFullDate } from '@/lib/constants'
import type { DashboardStats } from '@/lib/data/dashboard'
import type { ProfileWithStats } from '@/lib/data/profiles'
import RemindersWidget from './RemindersWidget'
import ExpiryAlertBanner from './ExpiryAlertBanner'
import { WorkflowStatus } from '@/components/ui/WorkflowStatus'

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
  const activeLawyers = profiles.filter(p => p.active !== false)
  const displayLawyers: ProfileWithStats[] = activeLawyers.length
    ? activeLawyers
    : [
        { id: 'prof_1', name: 'منتظر', role: 'super_admin', title: 'مدير النظام الأعلى', active_tx_count: 0, active: true, created_at: '', dept: 'إدارة النظام والعمليات', phone: null },
        { id: 'prof_2', name: 'عباس', role: 'manager', title: 'مدير عمليات', active_tx_count: 0, active: true, created_at: '', dept: 'قسم قضايا الشركات والودائع', phone: null },
        { id: 'prof_3', name: 'مروة', role: 'lawyer', title: 'محامية', active_tx_count: 0, active: true, created_at: '', dept: 'قسم تأسيس الشركات والهويات', phone: null },
        { id: 'prof_4', name: 'علي', role: 'lawyer', title: 'محامي', active_tx_count: 0, active: true, created_at: '', dept: 'قسم المتابعة الميدانية والضرائب', phone: null },
      ]

  const maxWorkload = Math.max(...displayLawyers.map(l => l.active_tx_count ?? 0), 1)

  return (
    <div className="flex flex-col w-full gap-6 relative z-10 animate-fade-in-up">
      
      {/* 0. Government Expiry Banner (Compact & Interactive) */}
      <ExpiryAlertBanner alerts={stats.expiryAlerts || []} />

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

      {/* 2. Executive Metric Pillars (6 Commercial Sub-Departments with Glassmorphic Depth & Subtle Corner Color Accent) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 w-full">
        
        {/* Metric 1: Established Companies (الشركات المؤسسة) */}
        <Link
          href="/commercial/companies-registry"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-lg hover:border-emerald-500/40 transition-all duration-300 block border border-[var(--glass-border)] bg-[var(--surface)] shadow-xs"
        >
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/15 rounded-full blur-xl group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
          
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">الشركات المؤسسة</span>
              <span className="text-[22px] sm:text-3xl font-extrabold text-[var(--text)] leading-none num">{establishedCount}</span>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">domain</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-xl relative z-10 border border-emerald-500/15">
            <span>دليل الشركات</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 2: Forming Companies (قيد التأسيس) */}
        <Link
          href="/commercial/companies"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-lg hover:border-amber-500/40 transition-all duration-300 block border border-[var(--glass-border)] bg-[var(--surface)] shadow-xs"
        >
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/15 rounded-full blur-xl group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
          
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">قيد التأسيس</span>
              <span className="text-[22px] sm:text-3xl font-extrabold text-[var(--text)] leading-none num">{formingCount}</span>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-xl relative z-10 border border-amber-500/15">
            <span>مسار التأسيس (8)</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 3: Active Deposits (إطلاق الوديعة) */}
        <Link
          href="/commercial/deposits"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-lg hover:border-cyan-500/40 transition-all duration-300 block border border-[var(--glass-border)] bg-[var(--surface)] shadow-xs"
        >
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/15 rounded-full blur-xl group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
          
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">إطلاق الوديعة</span>
              <span className="text-[22px] sm:text-3xl font-extrabold text-[var(--text)] leading-none num">{depositsCount}</span>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">savings</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-xl relative z-10 border border-cyan-500/15">
            <span>مسار الودائع (4)</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 4: LLC Transactions (قسم المحدودة) */}
        <Link
          href="/commercial/llc"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-lg hover:border-blue-500/40 transition-all duration-300 block border border-[var(--glass-border)] bg-[var(--surface)] shadow-xs"
        >
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/15 rounded-full blur-xl group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
          
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">قسم المحدودة</span>
              <span className="text-[22px] sm:text-3xl font-extrabold text-[var(--text)] leading-none num">{llcCount}</span>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">history_edu</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-xl relative z-10 border border-blue-500/15">
            <span>معاملات نشطة</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 5: Company IDs (قسم الهويات) */}
        <Link
          href="/commercial/ids"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-lg hover:border-indigo-500/40 transition-all duration-300 block border border-[var(--glass-border)] bg-[var(--surface)] shadow-xs"
        >
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/15 rounded-full blur-xl group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
          
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">قسم الهويات</span>
              <span className="text-[22px] sm:text-3xl font-extrabold text-[var(--text)] leading-none num">{idsCount}</span>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-xl relative z-10 border border-indigo-500/15">
            <span>مستورد / ضريبة</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>

        {/* Metric 6: Financial Statements (الحسابات الختامية) */}
        <Link
          href="/commercial/financial-statements"
          className="glass-card p-4 sm:p-4.5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-lg hover:border-rose-500/40 transition-all duration-300 block border border-[var(--glass-border)] bg-[var(--surface)] shadow-xs"
        >
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/15 rounded-full blur-xl group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
          
          <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-[var(--text-3)] mb-1 leading-tight">الحسابات الختامية</span>
              <span className="text-[22px] sm:text-3xl font-extrabold text-[var(--text)] leading-none num">
                {stats.urgentDeadlines?.length || 0}
              </span>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-xl relative z-10 border border-rose-500/15">
            <span>مهلة 7/10 السنوية</span>
            <span className="material-symbols-outlined text-[13px] group-hover:-translate-x-0.5 transition-transform">arrow_left</span>
          </div>
        </Link>
      </div>

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
                href="/commercial/llc"
                className="font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>الانتقال لكافة المعاملات</span>
                <span className="material-symbols-outlined text-[13px]">arrow_left</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Left 4 Cols: Reminders & Deadlines Mini Widget */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <RemindersWidget />

          {/* Mini Deadlines & Statutory Alerts Card */}
          {stats.urgentDeadlines && stats.urgentDeadlines.length > 0 && (
            <div className="glass-card rounded-[28px] p-4 flex flex-col gap-2.5 border border-[var(--glass-border)]">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--line-soft)]">
                <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">timer</span>
                  <span>أقرب المهل القانونية للشركات</span>
                </span>
                <Link href="/commercial/financial-statements" className="text-[10.5px] font-bold text-[var(--accent)] hover:underline">
                  الحسابات الختامية ←
                </Link>
              </div>

              <div className="flex flex-col gap-2">
                {stats.urgentDeadlines.slice(0, 3).map(ud => (
                  <div key={ud.companyId} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)]">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[var(--text)] truncate max-w-[150px]">{ud.companyName}</span>
                      <span className="text-[10px] text-[var(--text-3)]">استحقاق 7/10 السنوي</span>
                    </div>
                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full num ${ud.level === 'late' ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'}`}>
                      {ud.level === 'late' ? `متأخر ${ud.daysLate} يوماً` : `باقي ${ud.daysLeft} يوماً`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
