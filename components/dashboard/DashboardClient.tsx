'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataPanel } from '@/components/ui/DataPanel'
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
  const router = useRouter()

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

  const txHref = (tx: (typeof recentTxs)[number]) =>
    tx.companyId
      ? (tx.type === 'formation' || tx.typeLabel?.includes('تأسيس') ? `/commercial/companies?id=${tx.companyId}` : `/commercial/companies/${tx.companyId}`)
      : (tx.type === 'llc' ? `/commercial/llc?id=${tx.id}` : '/commercial')
  // عمود المحامي يظهر فقط إذا كان هناك تكليف فعلي — بدل تكرار «غير محدد» في كل صف
  const showLawyer = recentTxs.some(tx => !!tx.lawyerName)

  const urgentFS = stats.urgentDeadlines?.length || 0
  const kpis = [
    { label: 'الشركات المؤسسة', value: establishedCount, hint: 'دليل الشركات', icon: 'domain', href: '/commercial/companies-registry' },
    { label: 'قيد التأسيس', value: formingCount, hint: 'مسار التأسيس', icon: 'pending_actions', href: '/commercial/companies' },
    { label: 'إطلاق الوديعة', value: depositsCount, hint: 'مسار الودائع', icon: 'savings', href: '/commercial/deposits' },
    { label: 'قسم المحدودة', value: llcCount, hint: 'المعاملات النشطة', icon: 'history_edu', href: '/commercial/llc' },
    { label: 'الهويات', value: idsCount, hint: 'مستورد وضريبة وغرفة', icon: 'badge', href: '/commercial/ids' },
    { label: 'الحسابات الختامية', value: urgentFS, hint: urgentFS ? 'مهل قريبة تحتاج متابعة' : 'مهلة 7/10 السنوية', icon: 'receipt_long', href: '/commercial/financial-statements', alert: urgentFS > 0 },
  ]

  const maxWorkload = Math.max(...displayLawyers.map(l => l.active_tx_count ?? 0), 1)

  return (
    <div className="flex flex-col w-full gap-3.5 relative z-10 animate-fade-in-up">
      
      {/* 1. سطر علوي هادئ: العنوان موجود أصلاً في الشريط العلوي، فهنا ملخص + التاريخ فقط */}
      <div className="dash-intro">
        <h1>ملخص اليوم</h1>
        <span className="dash-date">
          <span className="material-symbols-outlined" aria-hidden>calendar_today</span>
          {formatFullDate()}
        </span>
      </div>

      {/* 2. المؤشرات: البطاقة كلها رابط، الرقم هو الأبرز، واللون فقط لما يحتاج انتباه */}
      <FadeInStagger className="kpi-grid">
        {kpis.map(k => (
          <Link key={k.href} href={k.href} className={`kpi-card ${k.alert ? 'is-alert' : ''}`}>
            <span className="kpi-icon" aria-hidden>
              <span className="material-symbols-outlined">{k.icon}</span>
            </span>
            <span className="kpi-label">{k.label}</span>
            <RollingNumber value={k.value} className="kpi-value" />
            <span className="kpi-hint">
              {k.hint}
              <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
            </span>
          </Link>
        ))}
      </FadeInStagger>

      {/* 3. Central Interactive Bento Section: Active Transactions (8 cols) + Reminders & Deadlines (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 w-full">
        
        {/* Right 8 Cols: Recent Active Transactions Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <DataPanel className="h-full flex flex-col" icon="assignment" title="أحدث المعاملات وسير العمل" subtitle="متابعة وتحديث حالة سير العمل اليومية مباشرة" actions={
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

            }>
            <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
            
            

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
                    <tr className="border-b border-[var(--line-soft)] text-[var(--text-3)] bg-[color:color-mix(in_srgb,var(--surface-2)_50%,transparent)] text-[11px]">
                      <th className="py-2 px-2.5 font-bold">الشركة / المعاملة</th>
                      <th className="py-2 px-2.5 font-bold text-center">نوع المعاملة</th>
                      {showLawyer && <th className="py-2 px-2.5 font-bold text-center">المحامي المكلف</th>}
                      <th className="py-2 px-2.5 font-bold text-center">الحالة</th>
                      <th className="py-2 px-2.5 font-bold text-center">التاريخ</th>
                      <th className="py-2 px-2.5 w-8"><span className="sr-only">فتح</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentTxs.slice(0, 7).map(tx => (
                      <tr
                        key={tx.id}
                        className="dash-row border-b border-[color:color-mix(in_srgb,var(--line-soft)_50%,transparent)]"
                        onClick={e => { if (!(e.target as HTMLElement).closest('a,button,[role="menu"],[role="listbox"]')) router.push(txHref(tx)) }}
                      >
                        {/* Company / Task Name */}
                        <td className="py-2 px-2.5">
                          <div className="flex flex-col min-w-[160px]">
                            <Link href={txHref(tx)} className="dash-row-link font-extrabold text-[var(--text)] text-xs truncate max-w-[260px] xl:max-w-[440px]">
                              {tx.companyName || tx.clientName || 'معاملة تجارية'}
                            </Link>
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
                        {showLawyer && (
                          <td className="py-2 px-2.5 text-center text-[var(--text-2)] font-semibold text-[11px] whitespace-nowrap">
                            {tx.lawyerName || <span className="text-[var(--text-3)]">—</span>}
                          </td>
                        )}

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

                        <td className="py-2 px-2 text-left">
                          <span className="material-symbols-outlined dash-row-go" aria-hidden>chevron_left</span>
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
          </DataPanel>
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
          <DataPanel className="h-full flex flex-col" icon="group" title="توزيع المهام والمعاملات على الكادر" subtitle="متابعة الطاقة الاستيعابية والمهام المسندة للفريق" count={displayLawyers.length} unit="أعضاء" actions={
              <Link href="/settings/users" className="btn btn-sm btn-soft">إدارة الكادر</Link>
            }>
            <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
            
            

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
                    className="flex flex-col justify-between gap-2 p-3 rounded-xl bg-[color:color-mix(in_srgb,var(--surface-2)_70%,transparent)] hover:bg-[var(--surface-2)] border border-[var(--glass-border)] hover:border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)] transition shadow-2xs group"
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
                    <div className="space-y-1 pt-1 border-t border-[color:color-mix(in_srgb,var(--line-soft)_50%,transparent)]">
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
                      <div className="flex items-center justify-between text-[10.5px] text-[var(--text-3)] font-mono pt-1 border-t border-[color:color-mix(in_srgb,var(--line-soft)_40%,transparent)] truncate">
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
          </DataPanel>
        </div>

        {/* Workflow Status Distribution (Span 6) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <DataPanel className="h-full flex flex-col" icon="pie_chart" title="حالات سير العمل في النظام" subtitle="توزيع الشركات والمعاملات حسب المرحلة" count={stats.totalCompaniesCount + stats.activeTxCount} unit="بند">
            <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
            

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
          </DataPanel>
        </div>

      </div>
    </div>
  )
}
