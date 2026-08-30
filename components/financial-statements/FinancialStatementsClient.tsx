'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui/Icon'
import { formatMoney } from '@/lib/constants'
import {
  getFinancialStatementsAction,
  getFSContactStatusesAction,
  updateFSContactStatusAction,
  deleteFinancialStatementAction,
  markStatementSubmittedAction
} from '@/app/(app)/commercial/financial-statements/actions'
import {
  calculateRequiredFSForCompanies,
  isCompanyNewAndExempt,
  FS_CONTACT_STATUS_LABELS
} from '@/lib/financial-statements/erp'
import { calculateFSState } from '@/lib/financial-statements/calc'
import type { Company, FinancialStatement, FSContactStatus } from '@/types/database'
import AddFinancialStatementModal from '@/components/financial-statements/AddFinancialStatementModal'
import CompanyFSDetailsModal from '@/components/financial-statements/CompanyFSDetailsModal'
import { usePermissions } from '@/lib/context/UserRoleContext'

interface Props {
  companies: Company[]
}

interface GroupedCompanyFS {
  companyId: string
  companyName: string
  companyObj?: Company
  statements: FinancialStatement[]
  yearsCount: number
  latestYear: number | string
  totalPenalty: number
  overallStatusLabel: string
  overallTagClass: string
}

export default function FinancialStatementsClient({ companies = [] }: Props) {
  const { can, isSuperAdmin, isAdmin } = usePermissions()
  const canCreateFS = can('financial_statements', 'create') || isSuperAdmin || isAdmin
  const canSubmitFS = can('financial_statements', 'submit') || isSuperAdmin || isAdmin
  const canDeleteFS = can('financial_statements', 'delete') || isSuperAdmin || isAdmin
  const [statements, setStatements] = useState<FinancialStatement[]>([])
  const [contactStatuses, setContactStatuses] = useState<Record<string, FSContactStatus>>({})
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'grouped' | 'required' | 'contact'>('grouped')
  const [contactFilter, setContactFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const triggerToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [modalCompanyId, setModalCompanyId] = useState<string | undefined>()
  const [editingStatement, setEditingStatement] = useState<FinancialStatement | null>(null)

  // Company Details Modal State
  const [selectedFSCompany, setSelectedFSCompany] = useState<GroupedCompanyFS | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [fsRes, csRes] = await Promise.all([
      getFinancialStatementsAction(),
      getFSContactStatusesAction(),
    ])
    setLoading(false)
    if (fsRes.success) setStatements(fsRes.data)
    if (csRes.success) setContactStatuses(csRes.data as Record<string, FSContactStatus>)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ERP Engine calculation for required statements
  const requiredItems = calculateRequiredFSForCompanies(companies, statements, contactStatuses)

  // Group statements strictly ONE ROW PER COMPANY for the main table
  const groupedCompanyMap = new Map<string, GroupedCompanyFS>()

  // 1. Group completed/added statements
  statements.forEach(st => {
    const key = st.company_id || st.company_name || 'unknown'
    const name = st.company_name || companies.find(c => c.id === st.company_id)?.name || 'شركة'
    const coObj = companies.find(c => c.id === st.company_id)

    if (!groupedCompanyMap.has(key)) {
      groupedCompanyMap.set(key, {
        companyId: st.company_id,
        companyName: name,
        companyObj: coObj,
        statements: [],
        yearsCount: 0,
        latestYear: '—',
        totalPenalty: 0,
        overallStatusLabel: 'منجزة ✓',
        overallTagClass: 'tag-ok',
      })
    }

    const group = groupedCompanyMap.get(key)!
    group.statements.push(st)
  })

  // 2. Add companies with required statements that may not have records yet
  companies.forEach(co => {
    if (!groupedCompanyMap.has(co.id)) {
      groupedCompanyMap.set(co.id, {
        companyId: co.id,
        companyName: co.name,
        companyObj: co,
        statements: [],
        yearsCount: 0,
        latestYear: co.last_completed_fs_year || '—',
        totalPenalty: 0,
        overallStatusLabel: 'قيد المتابعة',
        overallTagClass: 'tag-blue',
      })
    }
  })

  // 3. Process grouped stats per company
  const groupedCompanies: GroupedCompanyFS[] = Array.from(groupedCompanyMap.values()).map(group => {
    const years = group.statements.map(s => s.year)
    const yearsCount = group.statements.length
    const latestYear = years.length > 0 ? Math.max(...years) : (group.companyObj?.last_completed_fs_year || '—')

    let totalPenalty = 0
    let hasOverdue = false
    let hasPenalty = false

    group.statements.forEach(s => {
      const calc = calculateFSState(s)
      totalPenalty += calc.penaltyAmount
      if (calc.status === 'penalty_running' || calc.status === 'penalty_max') hasPenalty = true
      if (calc.status === 'overdue') hasOverdue = true
    })

    // Also include penalty from pending required years for this company
    const coRequired = requiredItems.filter(r => r.companyId === group.companyId)
    coRequired.forEach(r => {
      totalPenalty += r.penaltyAmount
      if (r.status === 'penalty_running' || r.status === 'penalty_max') hasPenalty = true
      if (r.status === 'due_soon') hasOverdue = true
    })

    let overallStatusLabel = 'منجزة ✓'
    let overallTagClass = 'tag-ok'

    if (hasPenalty) {
      overallStatusLabel = 'خاضعة للغرامة ⚠'
      overallTagClass = 'tag-bad'
    } else if (hasOverdue) {
      overallStatusLabel = 'قيد المتابعة'
      overallTagClass = 'tag-warn'
    } else if (yearsCount === 0) {
      if (group.companyObj && isCompanyNewAndExempt(group.companyObj)) {
        overallStatusLabel = 'شركة جديدة (معفاة)'
        overallTagClass = 'tag-blue'
      } else {
        overallStatusLabel = 'لم تُقدَّم ميزانية'
        overallTagClass = 'tag-gray'
      }
    }

    return {
      ...group,
      yearsCount,
      latestYear,
      totalPenalty,
      overallStatusLabel,
      overallTagClass,
    }
  }).sort((a, b) => b.totalPenalty - a.totalPenalty || b.yearsCount - a.yearsCount)

  // Overall KPI Metrics
  const totalRequired = requiredItems.length
  const totalPenalties = requiredItems.filter(x => x.status === 'penalty_running' || x.status === 'penalty_max')
  const nearDeadline = requiredItems.filter(x => x.status === 'due_soon')
  const totalPenaltyAmount = requiredItems.reduce((acc, curr) => acc + curr.penaltyAmount, 0)

  const handleContactStatusChange = async (companyId: string, year: number, newStatus: FSContactStatus) => {
    const key = `${companyId}_${year}`
    setContactStatuses(prev => ({ ...prev, [key]: newStatus }))
    await updateFSContactStatusAction(companyId, year, newStatus)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف سجّل الميزانية هذا؟')) return
    await deleteFinancialStatementAction(id)
    loadData()
  }

  const handleMarkSubmitted = async (id: string) => {
    if (!confirm('تسجيل تقديم الميزانية اليوم للنظام الحكومي؟')) return
    await markStatementSubmittedAction(id)
    loadData()
  }

  // بحث نصّي على قائمة الشركات المجمّعة (الاسم أو أي سنة ماليّة)
  const q = searchTerm.trim().toLowerCase()
  const visibleGrouped = q
    ? groupedCompanies.filter(item =>
        item.companyName.toLowerCase().includes(q) ||
        item.statements.some(s => String(s.year).includes(q)) ||
        String(item.latestYear).includes(q),
      )
    : groupedCompanies

  const handleExportExcel = () => {
    if (!groupedCompanies.length) { triggerToast('لا توجد سجلات لتصديرها'); return }
    const headers = ['الشركة', 'عدد سنوات الميزانيات', 'آخر سنة ماليّة', 'الحالة العامة', 'إجمالي الغرامة (د.ع)']
    const csvRows = [
      headers.join(','),
      ...visibleGrouped.map(item => [
        `"${(item.companyName || '—').replace(/"/g, '""')}"`,
        item.yearsCount,
        `"${item.latestYear}"`,
        `"${item.overallStatusLabel.replace(/[✓⚠]/g, '').trim()}"`,
        item.totalPenalty || 0,
      ].join(',')),
    ]
    const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financial_statements_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    triggerToast(`تم تصدير ${visibleGrouped.length} سجلاً إلى ملف Excel`)
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in-up">
      {/* Header Title & Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            إدارة الحسابات الختامية للشركات (ERP Engine)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '4px 0 0 0' }}>
            تظهر كل شركة مرة واحدة فقط في القائمة الرئيسية مع إمكانية فتح الملف الكامل للحسابات الختامية
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportExcel}
            className="btn btn-excel"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            title="تصدير سجل الحسابات الختامية إلى ملف Excel"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            <span>تصدير Excel</span>
          </button>
          {canCreateFS && (
            <button
              type="button"
              onClick={() => {
                setEditingStatement(null)
                setModalCompanyId(undefined)
                setIsAddModalOpen(true)
              }}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <Icon name="plus" />
              <span>إضافة حسابات ختامية</span>
            </button>
          )}
        </div>
      </div>

      {/* شريط البحث */}
      <div style={{ position: 'relative', maxWidth: '420px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="ابحث باسم الشركة أو السنة الماليّة..."
          className="input"
          style={{ paddingRight: '38px' }}
        />
        <span
          className="material-symbols-outlined"
          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: 19, color: 'var(--text-3)', pointerEvents: 'none' }}
        >
          search
        </span>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '14px 18px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>إجمالي الشركات المعنية</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>
            {groupedCompanies.length} شركة مسجلة
          </div>
        </div>

        <div style={{ padding: '14px 18px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>الميزانيات المستحقة للعام</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>
            {totalRequired} ميزانية مستحقة
          </div>
        </div>

        <div style={{ padding: '14px 18px', background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--warn)', fontWeight: 600 }}>تقترب من المهلة (07/10)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--warn)', marginTop: '4px' }}>
            {nearDeadline.length} شركة
          </div>
        </div>

        <div style={{ padding: '14px 18px', background: 'var(--bad-soft)', border: '1px solid var(--bad)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--bad)', fontWeight: 600 }}>الشركات الخاضعة للغرامة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--bad)', marginTop: '4px' }}>
            {totalPenalties.length} شركة ({formatMoney(totalPenaltyAmount)})
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('grouped')}
          className={`btn ${activeTab === 'grouped' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '13px' }}
        >
          سجل الشركات الرئيسي ({groupedCompanies.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('required')}
          className={`btn ${activeTab === 'required' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '13px' }}
        >
          الميزانيات المستحقة تلقائياً ({requiredItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`btn ${activeTab === 'contact' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '13px' }}
        >
          متابعة التواصل والاتصال
        </button>
      </div>

      {/* Tab 1: Grouped Main Table (Strictly ONE Row Per Company) */}
      {activeTab === 'grouped' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
              قائمة الشركات الحالية (تظهر كل شركة مرة واحدة فقط — اضغط على الاسم للفتح والتعديل)
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
              إجمالي الشركات: {visibleGrouped.length}{searchTerm.trim() ? ` من ${groupedCompanies.length}` : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-3)' }}>جاري تحميل الحسابات الختامية...</div>
          ) : visibleGrouped.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>
              {searchTerm.trim() ? 'لا توجد شركة تطابق بحثك.' : 'لا توجد سجلات ميزانيات مضافة حالياً.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>الشركة</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>عدد سنوات الميزانيات</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>آخر سنة ماليّة</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>الحالة العامة</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>حالة الغرامة</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGrouped.map(item => (
                    <tr key={item.companyId || item.companyName} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedFSCompany(item)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '13.5px', textAlign: 'right' }}
                        >
                          {item.companyName}
                        </button>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                        {item.yearsCount > 0 ? `${item.yearsCount} سنوات` : 'لا يوجد'}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>
                        {item.latestYear}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className={`tag ${item.overallTagClass}`}>
                          {item.overallStatusLabel}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', color: item.totalPenalty > 0 ? 'var(--bad)' : 'var(--text-3)', fontWeight: item.totalPenalty > 0 ? 700 : 400 }}>
                        {item.totalPenalty > 0 ? formatMoney(item.totalPenalty) : 'لا يوجد'}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'left' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedFSCompany(item)}
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}
                        >
                          عرض التفاصيل والسجل ←
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Required Statements (ERP Engine) */}
      {activeTab === 'required' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
              قائمة الميزانيات المطلوبة والمستحقة حسب نظام التتبع التلقائي
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
              المهلة القانونية: 7 تشرين الأول (07/10) لكل سنة مالية
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>الشركة المعنية</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>السنة المطلوبة</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>الموعد النهائي</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>حالة المهلة والغرامة</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>متابعة التواصل</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {requiredItems.map(item => {
                  const groupItem = groupedCompanies.find(g => g.companyId === item.companyId)
                  return (
                    <tr key={`${item.companyId}_${item.requiredYear}`} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          type="button"
                          onClick={() => groupItem && setSelectedFSCompany(groupItem)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '13px' }}
                        >
                          {item.companyName}
                        </button>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: 'var(--accent)' }}>
                        السنة المالية {item.requiredYear}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-2)', fontWeight: 600 }}>
                        07/10/{item.requiredYear + 1}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className={`tag ${item.tagClass}`}>
                          {item.statusLabel}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <select
                          className="input"
                          value={item.contactStatus}
                          onChange={e => handleContactStatusChange(item.companyId, item.requiredYear, e.target.value as FSContactStatus)}
                          style={{ padding: '4px 8px', fontSize: '12px', height: '30px', minWidth: '130px' }}
                        >
                          {Object.entries(FS_CONTACT_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'left' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setModalCompanyId(item.companyId)
                            setEditingStatement(null)
                            setIsAddModalOpen(true)
                          }}
                          className="btn btn-go"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          + إضافة الميزانية
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Contact Tracking View */}
      {activeTab === 'contact' && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>تتبع الاتصال والتواصل مع العملاء</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setContactFilter('all')}
                className={`btn ${contactFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                الكل
              </button>
              {Object.entries(FS_CONTACT_STATUS_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setContactFilter(k)}
                  className={`btn ${contactFilter === k ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {requiredItems
              .filter(item => contactFilter === 'all' || item.contactStatus === contactFilter)
              .map(item => (
                <div
                  key={`${item.companyId}_${item.requiredYear}`}
                  style={{
                    padding: '14px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line-soft)',
                    borderRadius: 'var(--r-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text)' }}>{item.companyName}</strong>
                    <span className={`tag ${FS_CONTACT_STATUS_LABELS[item.contactStatus].tagClass}`}>
                      {FS_CONTACT_STATUS_LABELS[item.contactStatus].label}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    سنة الميزانية: <strong>{item.requiredYear}</strong> — الموعد: <strong>07/10/{item.requiredYear}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--line-soft)' }}>
                    <span className={`tag ${item.tagClass}`}>{item.statusLabel}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setModalCompanyId(item.companyId)
                        setEditingStatement(null)
                        setIsAddModalOpen(true)
                      }}
                      className="btn btn-go"
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                    >
                      + ثبت الميزانية
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add / Edit Financial Statement Modal */}
      {isAddModalOpen && (
        <AddFinancialStatementModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingStatement(null)
            loadData()
          }}
          companies={companies}
          initialCompanyId={modalCompanyId}
          editingStatement={editingStatement}
        />
      )}

      {/* Company Financial Statements Details Flyout Modal */}
      {selectedFSCompany && (
        <CompanyFSDetailsModal
          company={selectedFSCompany.companyObj || ({ id: selectedFSCompany.companyId, name: selectedFSCompany.companyName } as Company)}
          statements={selectedFSCompany.statements}
          requiredItems={requiredItems.filter(r => r.companyId === selectedFSCompany.companyId)}
          isOpen={Boolean(selectedFSCompany)}
          onClose={() => setSelectedFSCompany(null)}
          onAddYear={() => {
            setModalCompanyId(selectedFSCompany.companyId)
            setEditingStatement(null)
            setIsAddModalOpen(true)
          }}
          onEditYear={(statement) => {
            setEditingStatement(statement)
            setIsAddModalOpen(true)
          }}
          onDeleteYear={handleDelete}
          onMarkSubmitted={handleMarkSubmitted}
          canSubmit={canSubmitFS}
          canDelete={canDeleteFS}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 99999,
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '13px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  )
}
