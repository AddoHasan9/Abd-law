'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { wfProgress, formatMoney, formatDate, penaltyState } from '@/lib/constants'
import { calculateFSState } from '@/lib/financial-statements/calc'
import { calculateCompanyStatus } from '@/lib/status-engine'
import { WorkflowStatus } from '@/components/ui/WorkflowStatus'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import CompanyDetailsModal from './CompanyDetailsModal'
import NewCompanyModal from './NewCompanyModal'
import { usePermissions } from '@/lib/context/UserRoleContext'
import type { CompanyWithWorkflow } from '@/types/database'
import { updateCompanyFSSettingsAction, createFinancialStatementAction } from '@/app/(app)/commercial/financial-statements/actions'

interface Props {
  initialCompanies: CompanyWithWorkflow[]
}

export default function CompaniesClient({ initialCompanies }: Props) {
  const router = useRouter()
  const { can, isSuperAdmin, isAdmin } = usePermissions()
  const canCreateCompany = can('companies', 'create') || isSuperAdmin || isAdmin
  const [companiesList, setCompaniesList] = useState<CompanyWithWorkflow[]>(initialCompanies)
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithWorkflow | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isNewCompanyOpen, setIsNewCompanyOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  useEffect(() => {
    setCompaniesList(initialCompanies)
  }, [initialCompanies])

  const handleCardClick = (company: CompanyWithWorkflow) => {
    setSelectedCompany(company)
    setIsDetailsOpen(true)
  }

  const handleAssignFS = async (e: React.MouseEvent, companyId: string, companyName: string) => {
    e.stopPropagation()
    setAssigningId(companyId)

    const res = await updateCompanyFSSettingsAction(companyId, { financial_statements_enabled: true })

    if (!res.success) {
      setAssigningId(null)
      setNotification(`تعذّر تكليف المكتب بالحسابات الختامية: ${res.error || 'خطأ غير معروف'}`)
      setTimeout(() => setNotification(null), 6000)
      return
    }

    const currentYear = new Date().getFullYear()
    await createFinancialStatementAction({ company_id: companyId, year: currentYear })

    // Confirmed by the server — safe to reflect immediately, button disappears without a page reload
    setCompaniesList(prev =>
      prev.map(c => (c.id === companyId ? { ...c, financial_statements_enabled: true } : c))
    )

    setAssigningId(null)
    setNotification(`تم تكليف المكتب بالحسابات الختامية لشركة (${companyName}) بنجاح!`)
    setTimeout(() => setNotification(null), 5000)
    router.refresh()
  }

  const [activeTab, setActiveTab] = useState<'all' | 'forming' | 'deposit' | 'established'>('all')
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  // شركات قسم التأسيس فقط (استبعاد الشركات المؤسسة أو مكتملة إطلاق الوديعة)
  const formationList = companiesList.filter(c => c.status !== 'established' && !c.deposit_released && c.deposit_status !== 'released')

  // Categorize companies
  const establishedCompanies = companiesList.filter(c => c.status === 'established' || c.deposit_released)
  const formingCompanies = formationList.filter(c => !c.cert_date)
  const depositPhaseCompanies = formationList.filter(c => Boolean(c.cert_date))

  // Timeframe stats for established companies
  const thisWeekEstablished = establishedCompanies.filter(c => {
    const d = c.cert_date || c.establishment_date || c.created_at
    return d && new Date(d) >= startOfWeek
  }).length

  const thisMonthEstablished = establishedCompanies.filter(c => {
    const d = c.cert_date || c.establishment_date || c.created_at
    return d && new Date(d) >= startOfMonth
  }).length

  const thisYearEstablished = establishedCompanies.filter(c => {
    const d = c.cert_date || c.establishment_date || c.created_at
    return d && new Date(d) >= startOfYear
  }).length

  // Filtered companies based on tabs, search, and time filter
  const filteredCompanies = formationList.filter(co => {
    const activeMgr = co.managers?.find(m => m.active)?.name || co.managers?.[0]?.name || co.manager || ''
    const matchSearch =
      co.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      activeMgr.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      (co.cert_no && co.cert_no.includes(searchTerm.trim())) ||
      (co.task_no && String(co.task_no).includes(searchTerm.trim()))

    if (!matchSearch) return false

    if (activeTab === 'forming') {
      return !co.deposit_released && !co.cert_date
    }
    if (activeTab === 'deposit') {
      return Boolean(co.cert_date) && !co.deposit_released
    }
    if (activeTab === 'established') {
      if (!co.deposit_released) return false

      if (timeFilter === 'week') {
        const d = co.cert_date || co.establishment_date || co.created_at
        return d && new Date(d) >= startOfWeek
      }
      if (timeFilter === 'month') {
        const d = co.cert_date || co.establishment_date || co.created_at
        return d && new Date(d) >= startOfMonth
      }
      if (timeFilter === 'year') {
        const d = co.cert_date || co.establishment_date || co.created_at
        return d && new Date(d) >= startOfYear
      }
      return true
    }

    return true
  })

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in-up">
      
      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--r-md)',
            background: 'var(--ok-soft)',
            border: '1px solid var(--ok)',
            color: 'var(--ok)',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✓ {notification}</span>
          <button type="button" onClick={() => setNotification(null)} style={{ border: 'none', background: 'none', color: 'var(--ok)', cursor: 'pointer', fontWeight: 800 }}>
            ✕
          </button>
        </div>
      )}

      {/* Header & Main Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined text-[26px] text-[var(--accent)]">corporate_fare</span>
            <span>قسم تأسيس الشركات ومسارات العمل</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '4px 0 0 0' }}>
            متابعة شاملة لكافة مراحل تأسيس الشركات وسير العمل والودائع المصرفية
          </p>
        </div>

        {canCreateCompany && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsNewCompanyOpen(true)}
            style={{ padding: '8px 18px', fontSize: '13.5px', fontWeight: 700 }}
          >
            <Icon name="plus" />
            <span>تأسيس شركة جديدة</span>
          </button>
        )}
      </div>

      {/* Top 4 KPI Cards (Matching Dashboard SaaS Luxury Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
        
        {/* KPI 1: Established Companies with Dynamic Time Breakdown */}
        <div
          onClick={() => {
            setActiveTab('established')
            setTimeFilter('all')
          }}
          className={`glass-card p-4 sm:p-5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'established' ? 'ring-2 ring-emerald-500/50 bg-emerald-500/5' : ''
          }`}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:opacity-80 transition-opacity" />
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-0.5">الشركات المؤسسة</span>
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 num">{establishedCompanies.length}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
          </div>
          
          {/* Timeframe Pill Breakdown */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10.5px] font-bold relative z-10 mt-1">
            <span
              onClick={e => {
                e.stopPropagation()
                setActiveTab('established')
                setTimeFilter('week')
              }}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                activeTab === 'established' && timeFilter === 'week'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              الأسبوع: {thisWeekEstablished}
            </span>
            <span
              onClick={e => {
                e.stopPropagation()
                setActiveTab('established')
                setTimeFilter('month')
              }}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                activeTab === 'established' && timeFilter === 'month'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              الشهر: {thisMonthEstablished}
            </span>
            <span
              onClick={e => {
                e.stopPropagation()
                setActiveTab('established')
                setTimeFilter('year')
              }}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                activeTab === 'established' && timeFilter === 'year'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              السنة: {thisYearEstablished}
            </span>
          </div>
        </div>

        {/* KPI 2: Forming Companies */}
        <div
          onClick={() => setActiveTab('forming')}
          className={`glass-card p-4 sm:p-5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'forming' ? 'ring-2 ring-amber-500/50 bg-amber-500/5' : ''
          }`}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:opacity-80 transition-opacity" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-0.5">قيد التأسيس</span>
              <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 num">{formingCompanies.length}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full relative z-10">
            <span>مسار التأسيس (8 خطوات)</span>
            <span className="material-symbols-outlined text-[13px]">arrow_left</span>
          </div>
        </div>

        {/* KPI 3: Deposit Release Phase */}
        <div
          onClick={() => setActiveTab('deposit')}
          className={`glass-card p-4 sm:p-5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'deposit' ? 'ring-2 ring-cyan-500/50 bg-cyan-500/5' : ''
          }`}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:opacity-80 transition-opacity" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-0.5">إطلاق الوديعة</span>
              <span className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 num">{depositPhaseCompanies.length}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-full relative z-10">
            <span>ودائع قيد الإطلاق (30 يوماً)</span>
            <span className="material-symbols-outlined text-[13px]">arrow_left</span>
          </div>
        </div>

        {/* KPI 4: Total Companies Directory */}
        <div
          onClick={() => setActiveTab('all')}
          className={`glass-card p-4 sm:p-5 rounded-[22px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'all' ? 'ring-2 ring-[var(--accent)]/50 bg-[var(--accent)]/5' : ''
          }`}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--accent-soft)] rounded-full blur-xl group-hover:opacity-80 transition-opacity" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-0.5">إجمالي شركات التأسيس</span>
              <span className="text-3xl font-extrabold text-[var(--text)] num">{formationList.length}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-full relative z-10">
            <span>عرض كافة شركات التأسيس</span>
            <span className="material-symbols-outlined text-[13px]">arrow_left</span>
          </div>
        </div>

      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '380px' }}>
          <input
            type="text"
            className="input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الشركة، المدير، رقم الشهادة، أو المهمة..."
            style={{ paddingRight: '36px', fontSize: '13px' }}
          />
          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
            <Icon name="search" />
          </span>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('all')
              setTimeFilter('all')
            }}
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            الكل ({formationList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('forming')}
            className={`btn ${activeTab === 'forming' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            قيد التأسيس ({formingCompanies.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deposit')}
            className={`btn ${activeTab === 'deposit' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            إطلاق الوديعة ({depositPhaseCompanies.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('established')
              setTimeFilter('all')
            }}
            className={`btn ${activeTab === 'established' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            المؤسسة ({establishedCompanies.length})
          </button>
        </div>
      </div>

      {!filteredCompanies.length ? (
        <div className="card">
          <Empty
            icon="build"
            title="لا توجد شركات مطابقة لهذا الفلتر"
            text="يمكنك إضافة شركة جديدة أو تعديل معايير البحث والتصفية لعرض الشركات."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ alignItems: 'stretch' }}>
          {filteredCompanies.map(co => {
            const pg = wfProgress(co.workflow_steps)
            const calculatedSt = calculateCompanyStatus({ company: co })
            const pen = penaltyState(co, false)

            const activeManager = co.managers?.find(m => m.active)?.name || co.managers?.[0]?.name || '—'
            const isEstablished = co.status === 'established' || co.deposit_released

            return (
              <div
                key={co.id}
                className="glass-card co-card formation-card group relative !p-3.5 !gap-2.5 rounded-[18px] bg-[var(--surface)] border border-[var(--line-soft)] hover:border-[var(--accent)]/60 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between overflow-hidden cursor-pointer h-full"
                onClick={() => handleCardClick(co)}
              >
                {/* Glowing Top Indicator Bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: isEstablished
                      ? 'linear-gradient(90deg, #10B981, #34D399, #10B981)'
                      : co.lacks
                      ? 'linear-gradient(90deg, #F59E0B, #EF4444, #F59E0B)'
                      : 'linear-gradient(90deg, #38BDF8, #818CF8, #38BDF8)',
                    opacity: 0.85,
                  }}
                />

                {/* Header (الأيقونة + اسم الشركة + رمز الحالة ورقم المهمة) */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[var(--line-soft)]">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-soft)] to-[var(--surface-3)] border border-[var(--line-soft)] flex items-center justify-center text-[var(--accent)] flex-none shadow-sm group-hover:scale-105 transition-transform duration-300 mt-0.5">
                      <span className="material-symbols-outlined text-[17px]">domain</span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <h3
                        className="font-display font-extrabold text-[var(--text)] transition-colors leading-snug group-hover:text-[var(--accent)]"
                        style={{
                          fontSize: co.name.length > 25 ? '12.5px' : '13.5px',
                          lineHeight: '1.35',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                        title={co.name}
                      >
                        {co.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-[var(--text-2)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--line-soft)]">
                          {co.kind ?? 'شركة'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-none" onClick={e => e.stopPropagation()}>
                    <WorkflowStatus
                      status={co.status}
                      entityId={co.id}
                      entityType="company"
                      size="sm"
                    />
                    <span className="text-[10.5px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)]/25 px-2 py-0.5 rounded-full num shadow-xs">
                      #{co.task_no ?? '—'}
                    </span>
                  </div>
                </div>

                {/* Facts Grid (شبكة البيانات المختصرة 2x2 مع أيقونات ناعمة) */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-2.5 rounded-xl bg-[var(--surface-2)]/70 border border-[var(--line-soft)] text-xs">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-[var(--text-3)]">رقم الشهادة</span>
                    <span className="text-[11.5px] font-bold text-[var(--text)] truncate num mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                      {co.cert_no ?? 'غير صادرة'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-[var(--text-3)]">تاريخ الشهادة</span>
                    <span className="text-[11.5px] font-bold text-[var(--text)] truncate num mt-0.5">
                      {co.cert_date ? formatDate(co.cert_date) : 'قيد التأسيس'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-[var(--text-3)]">رأس المال</span>
                    <span className="text-[12px] font-extrabold text-emerald-600 dark:text-emerald-400 truncate num mt-0.5">
                      {formatMoney(co.capital)}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-[var(--text-3)]">المدير المفوض</span>
                    <span className="text-[11.5px] font-bold text-[var(--text)] truncate mt-0.5" title={activeManager}>
                      {activeManager}
                    </span>
                  </div>
                </div>

                {/* Dual Compact Indicators (حالة الوديعة + الحسابات الختامية) */}
                <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--line-soft)] text-xs items-center">
                  {/* Deposit status */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-[var(--text-3)]">حالة الوديعة</span>
                    <div className="truncate">
                      {isEstablished ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <span>✓ أُطلقت</span>
                        </span>
                      ) : pen ? (
                        <span className={`inline-flex items-center text-[10.5px] font-bold px-2 py-0.5 rounded-full num truncate ${
                          pen.level === 'late' ? 'text-rose-600 bg-rose-500/15' : pen.level === 'soon' ? 'text-amber-600 bg-amber-500/15' : 'text-[var(--accent)] bg-[var(--accent-soft)]'
                        }`}>
                          متابعة ({pen.daysLeft}ي)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10.5px] font-semibold text-[var(--text-3)] bg-[var(--surface-3)] px-2 py-0.5 rounded-full">
                          لم تبدأ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* FS status or Quick Assign Button */}
                  <div className="flex flex-col gap-0.5 min-w-0 border-r border-[var(--line-soft)] pr-2">
                    <span className="text-[10px] font-bold text-[var(--text-3)]">الحسابات الختامية</span>
                    <div className="truncate">
                      {(() => {
                        const currentYear = new Date().getFullYear()
                        const isFsEnabled = co.financial_statements_enabled || Boolean(co.last_completed_fs_year)

                        if (!isEstablished) {
                          return (
                            <span className="inline-flex items-center text-[10px] font-semibold text-[var(--text-3)] bg-[var(--surface-3)] px-2 py-0.5 rounded-full" title="الحسابات الختامية ممنوعة للشركات قيد التأسيس">
                              غير متاح (قيد التأسيس)
                            </span>
                          )
                        }

                        if (!isFsEnabled) {
                          return (
                            <button
                              type="button"
                              disabled={assigningId === co.id}
                              onClick={e => handleAssignFS(e, co.id, co.name)}
                              className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--accent)] hover:text-white bg-[var(--accent-soft)] hover:bg-[var(--accent)] border border-[var(--accent)]/30 px-2 py-0.5 rounded-full transition-all truncate"
                              title="تكليف المكتب بالحسابات الختامية"
                            >
                              <span className="material-symbols-outlined text-[12px]">add_circle</span>
                              <span>{assigningId === co.id ? 'جاري...' : 'تكليف المكتب'}</span>
                            </button>
                          )
                        }

                        const fsCalc = calculateFSState({ year: currentYear, company_id: co.id })
                        return (
                          <span className={`inline-flex items-center text-[10.5px] font-bold px-2 py-0.5 rounded-full truncate ${
                            fsCalc.status === 'penalty_running' || fsCalc.status === 'penalty_max'
                              ? 'text-rose-600 bg-rose-500/15'
                              : fsCalc.status === 'due_soon'
                              ? 'text-amber-600 bg-amber-500/15'
                              : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15'
                          }`}>
                            {fsCalc.statusLabel}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* Lack badge if present */}
                {co.lacks && (
                  <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] animate-pulse">
                    <span className="material-symbols-outlined text-[14px] flex-none">warning</span>
                    <span className="truncate font-bold">{co.lacks}</span>
                  </div>
                )}

                {/* Footer (النسبة المئوية لسير العمل + رابط ملف الشركة الشامل 360) */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--line-soft)] mt-auto">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative w-7 h-7 flex-none flex items-center justify-center">
                      {pg.current && (
                        <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-[2px] animate-pulse" />
                      )}
                      <svg viewBox="0 0 40 40" className="w-7 h-7 -rotate-90">
                        <circle className="stroke-[var(--line-soft)]" strokeWidth="4.5" fill="none" cx="20" cy="20" r="16" />
                        <circle
                          className={`${pg.current ? 'stroke-amber-500' : 'stroke-[var(--accent)]'} transition-all duration-500`}
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          fill="none"
                          cx="20"
                          cy="20"
                          r="16"
                          strokeDasharray={100.5}
                          strokeDashoffset={100.5 * (1 - pg.pct / 100)}
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-[8.5px] font-black num ${pg.current ? 'text-amber-500' : 'text-[var(--accent)]'}`}>
                        {pg.pct}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`tag ${calculatedSt.tagClass} !py-0.5 !px-2 !text-[10px] !font-bold`}>{calculatedSt.label}</span>
                      <span className="text-[10.5px] text-[var(--text-3)] font-bold num truncate" title={pg.current ? `المحطة الحالية: ${pg.current.label}` : undefined}>
                        {pg.done}/{pg.total} خطوات
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/commercial/companies/${co.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-[11.5px] font-bold text-[var(--accent)] hover:text-blue-600 hover:translate-x-[-3px] transition-all flex items-center gap-0.5 flex-none group-hover:underline"
                    title="عرض ملف الشركة الشامل 360°"
                  >
                    <span>ملف 360°</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_left</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Editable Company Details Modal */}
      <CompanyDetailsModal
        company={selectedCompany}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedCompany(null)
        }}
        onDelete={(deletedId: string) => {
          setCompaniesList(prev => prev.filter(c => c.id !== deletedId))
        }}
      />

      {/* New Company Formation Modal */}
      <NewCompanyModal
        isOpen={isNewCompanyOpen}
        onClose={() => setIsNewCompanyOpen(false)}
      />
    </div>
  )
}
