'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { DataPanel } from '@/components/ui/DataPanel'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { TX_TYPES, PRIORITIES, txType, priorityOf, formatDate, formatNumberWithCommas } from '@/lib/constants'
import { WorkflowStatus } from '@/components/ui/WorkflowStatus'
import { WORKFLOW_STATUS_LIST } from '@/lib/workflow-status'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import dynamic from 'next/dynamic'
import type { TransactionFull, Company, CompanyWithWorkflow } from '@/types/database'

const AddTransactionModal = dynamic(() => import('./AddTransactionModal'), { ssr: false })
import {
  assignLawyerToTransactionAction,
  updateTransactionDetailsAction,
  deleteTransactionAction,
  archiveTransactionAction,
} from '@/app/(app)/commercial/actions'

interface Props {
  heading?: string
  rows?: TransactionFull[]
  companies?: Company[]
}

const SERVICE_TYPE_STYLES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  'formation': { label: 'تأسيس شركة', bg: 'rgba(2, 132, 199, 0.08)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.25)' },
  'tasis': { label: 'تأسيس شركة', bg: 'rgba(2, 132, 199, 0.08)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.25)' },
  'share-sale': { label: 'بيع أسهم', bg: 'rgba(249, 115, 22, 0.08)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.25)' },
  'capital-up': { label: 'زيادة رأس المال', bg: 'rgba(99, 102, 241, 0.08)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.25)' },
  'certify': { label: 'تصديق أوراق', bg: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' },
  'mgr-renew': { label: 'استمرار تعيين', bg: 'rgba(168, 85, 247, 0.08)', color: '#9333ea', border: '1px solid rgba(168, 85, 247, 0.25)' },
  'activity': { label: 'إضافة/حذف نشاط', bg: 'rgba(6, 182, 212, 0.08)', color: '#0891b2', border: '1px solid rgba(6, 182, 212, 0.25)' },
  'relocation': { label: 'نقل مقر', bg: 'rgba(245, 158, 11, 0.08)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)' },
  'final-acc': { label: 'حسابات ختامية', bg: 'rgba(20, 184, 166, 0.08)', color: '#0d9488', border: '1px solid rgba(20, 184, 166, 0.25)' },
  'tax-assess': { label: 'تحاسب ضريبي', bg: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' },
  'tax-clear': { label: 'براءة ذمة ضريبية', bg: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' },
  'tax-id-new': { label: 'إصدار هوية ضريبية', bg: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' },
  'tax-id-renew': { label: 'تجديد هوية ضريبية', bg: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' },
  'chamber-new': { label: 'إصدار هوية غرفة', bg: 'rgba(249, 115, 22, 0.08)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.25)' },
  'plan-id': { label: 'إصدار هوية تخطيط', bg: 'rgba(245, 158, 11, 0.08)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)' },
  'plan-id-renew': { label: 'تجديد هوية تخطيط', bg: 'rgba(245, 158, 11, 0.08)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)' },
  'importer-id-new': { label: 'إصدار هوية مستورد', bg: 'rgba(6, 182, 212, 0.08)', color: '#0891b2', border: '1px solid rgba(6, 182, 212, 0.25)' },
  'importer-id-renew': { label: 'تجديد هوية مستورد', bg: 'rgba(6, 182, 212, 0.08)', color: '#0891b2', border: '1px solid rgba(6, 182, 212, 0.25)' },
  'importer_id': { label: 'هوية مستورد', bg: 'rgba(6, 182, 212, 0.08)', color: '#0891b2', border: '1px solid rgba(6, 182, 212, 0.25)' },
}

function getPersonInCharge(co?: CompanyWithWorkflow | Company | null): { name: string; roleLabel: string } {
  if (!co) return { name: 'سجل غير مكتمل', roleLabel: '' }
  const c = co as CompanyWithWorkflow
  const isEstablished = c.status === 'established' || c.status === 'done'
  const managers = c.managers ?? []
  const activeManager = managers.find(m => m.active)?.name || c.manager || null
  const shareholders = c.shareholders ?? []
  const primaryShareholder = shareholders[0]?.name || null

  if (isEstablished && activeManager) {
    return { name: activeManager, roleLabel: 'المدير المفوض' }
  } else if (primaryShareholder) {
    return { name: primaryShareholder, roleLabel: 'المساهم الرئيسي' }
  } else if (activeManager) {
    return { name: activeManager, roleLabel: 'المدير المفوض' }
  } else {
    return { name: 'سجل غير مكتمل', roleLabel: '' }
  }
}

export default function CommercialClient({ rows = [], companies = [] }: Props) {
  const router = useRouter()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [localRows, setLocalRows] = useState<TransactionFull[]>(rows)
  const [activeMenuTx, setActiveMenuTx] = useState<TransactionFull | null>(null)
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Modals state
  const [assignLawyerTx, setAssignLawyerTx] = useState<TransactionFull | null>(null)
  const [editTx, setEditTx] = useState<TransactionFull | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [onlyIncompleteFilter, setOnlyIncompleteFilter] = useState(false)

  useModalBodyLock(Boolean(editTx), () => setEditTx(null))

  useEffect(() => {
    setLocalRows(rows)
  }, [rows])

  useEffect(() => {
    function handleScrollOrResize() {
      if (activeMenuTx) {
        setActiveMenuTx(null)
        setMenuCoords(null)
      }
    }
    if (activeMenuTx) {
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
    }
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [activeMenuTx])

  const triggerToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Map companies by id for quick lookup
  const companyMap = useMemo(() => {
    const map = new Map<string, CompanyWithWorkflow>()
    companies.forEach(c => map.set(c.id, c as CompanyWithWorkflow))
    return map
  }, [companies])

  // Extract lawyer/staff options
  const lawyerList = useMemo(() => {
    const map = new Map<string, string>()
    map.set('db13125d-3aa1-46ab-9159-8fad18746623', 'منتظر الخزرجي')
    localRows.forEach(r => {
      if (r.profiles?.id && r.profiles?.name && !r.profiles.id.startsWith('prof_')) {
        map.set(r.profiles.id, r.profiles.name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [localRows])

  // Detect incomplete / orphaned records
  const incompleteCount = useMemo(() => {
    return localRows.filter(t => {
      const co = t.company_id ? companyMap.get(t.company_id) || t.companies : t.companies
      return !co?.name || !t.type || t.type === '—'
    }).length
  }, [localRows, companyMap])

  // Auto-close action menu on scroll or resize to prevent floating or jumping
  useEffect(() => {
    if (!activeMenuTx) return
    const handleScrollOrResize = () => {
      setActiveMenuTx(null)
      setMenuCoords(null)
    }
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [activeMenuTx])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [lawyerFilter, setLawyerFilter] = useState('')

  const filteredRows = useMemo(() => {
    return localRows.filter(t => {
      const companyObj = t.company_id ? companyMap.get(t.company_id) || t.companies : t.companies
      const isRecordIncomplete = !companyObj?.name || !t.type || t.type === '—'

      if (onlyIncompleteFilter && !isRecordIncomplete) return false

      if (typeFilter && t.type !== typeFilter) return false
      if (statusFilter && t.status !== statusFilter) return false
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (lawyerFilter) {
        const lawyerName = t.profiles?.name || (t as unknown as { assigned_lawyer_name?: string }).assigned_lawyer_name
        if (lawyerName !== lawyerFilter) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const typeLabel = txType(t.type).label.toLowerCase()
        const desc = (t.description || '').toLowerCase()
        const clientName = (t.clients?.name || '').toLowerCase()
        const companyName = (companyObj?.name || '').toLowerCase()
        const haystack = `${typeLabel} ${desc} ${clientName} ${companyName}`
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [localRows, companyMap, typeFilter, statusFilter, priorityFilter, lawyerFilter, searchQuery, onlyIncompleteFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setTypeFilter('')
    setStatusFilter('')
    setPriorityFilter('')
    setLawyerFilter('')
    setOnlyIncompleteFilter(false)
  }

  // Row Action Handlers
  const handleAssignLawyer = async (txId: string, lawyerId: string | null, lawyerName: string | null, companyId?: string | null) => {
    setLocalRows(prev =>
      prev.map(t => (t.id === txId ? { ...t, lawyer_id: lawyerId, profiles: lawyerName ? { id: lawyerId || '1', name: lawyerName } : null } as TransactionFull : t))
    )
    const res = await assignLawyerToTransactionAction(txId, lawyerId, lawyerName, companyId)
    if (res.success) {
      triggerToast('تم تعيين المحامي المكلف بنجاح')
      router.refresh()
    } else {
      triggerToast(res.error || 'تعذر تعيين المحامي')
    }
  }

  const handleArchive = async (txId: string) => {
    const reason = prompt('سبب أرشفة المعاملة:')
    if (reason === null) return
    setLocalRows(prev => prev.map(t => (t.id === txId ? { ...t, status: 'closed' as const } : t)))
    const res = await archiveTransactionAction(txId, reason || 'أرشفة من شريط الخيارات')
    if (res.success) {
      triggerToast('تمت أرشفة المعاملة بنجاح')
      router.refresh()
    }
  }

  const handleDelete = async (txId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المعاملة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.')) return
    setLocalRows(prev => prev.filter(t => t.id !== txId))
    const res = await deleteTransactionAction(txId)
    if (res.success) {
      triggerToast('تم حذف المعاملة بنجاح')
      router.refresh()
    }
  }

  const handleExportExcel = () => {
    if (!filteredRows.length) return
    const headers = ['اسم الشركة', 'نوع الخدمة', 'المحامي المكلف', 'المسؤول عن الشركة', 'الأولوية', 'حالة سير العمل', 'تاريخ المعاملة']
    const csvRows = [
      headers.join(','),
      ...filteredRows.map(t => {
        const comp = t.company_id ? companyMap.get(t.company_id) || t.companies : t.companies
        const name = comp?.name || (t.companies as { name?: string })?.name || '—'
        const sType = t.type ? txType(t.type).label : '—'
        const lawyer = t.profiles?.name || (t as unknown as { assigned_lawyer_name?: string }).assigned_lawyer_name || 'غير محدد'
        const pic = getPersonInCharge(comp)
        const pr = priorityOf(t.priority).label
        const st = t.status || 'new'
        const dt = formatDate(t.created_at)
        return [
          `"${name.replace(/"/g, '""')}"`,
          `"${sType.replace(/"/g, '""')}"`,
          `"${lawyer.replace(/"/g, '""')}"`,
          `"${(pic.name || '—').replace(/"/g, '""')}"`,
          `"${pr}"`,
          `"${st}"`,
          `"${dt}"`
        ].join(',')
      })
    ]
    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div
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

      {/* Incomplete Records Warning Banner */}
      {incompleteCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between flex-wrap gap-3 font-semibold text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-amber-400">warning</span>
            <span>
              تنبيه سلامة البيانات: يرجى الملاحظة أنه يوجد <strong className="text-amber-200 num">{incompleteCount}</strong> سجل غير مكتمل (ينقصه اسم الشركة أو نوع الخدمة).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOnlyIncompleteFilter(!onlyIncompleteFilter)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition ${
              onlyIncompleteFilter
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                : 'bg-transparent text-amber-400 border-amber-500/40 hover:bg-amber-500/15'
            }`}
          >
            {onlyIncompleteFilter ? 'عرض جميع السجلات' : 'تصفية السجلات غير المكتملة فقط'}
          </button>
        </div>
      )}

      {/* Toolbar with Search, Filters & Action Button */}
      <div className="bg-[var(--surface-glass)] p-3 sm:p-4 rounded-[20px] border border-[var(--border)] shadow-xs flex flex-col gap-3">
        {/* Row 1: Search Bar & Primary Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-3)] pointer-events-none">
              search
            </span>
            <input
              type="text"
              style={{ paddingRight: '44px', paddingLeft: '36px' }}
              className="w-full h-10 search-input rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] focus:border-[var(--accent)] focus:bg-[var(--surface)] text-xs font-medium text-[var(--text)] placeholder:text-[var(--text-3)] transition-all outline-none"
              placeholder="ابحث بالشركة، المحامي، أو الملاحظات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--surface-3)] text-[var(--text-3)] hover:text-[var(--text)] text-[10px] flex items-center justify-center cursor-pointer"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs shrink-0 cursor-pointer"
            onClick={handleExportExcel}
            title="تصدير جدول المعاملات إلى ملف بيانات إكسل"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>تصدير ملف إكسل</span>
          </button>

          {(searchQuery || typeFilter || statusFilter || priorityFilter || lawyerFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 px-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-3)] hover:text-rose-500 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-[var(--line-soft)] shrink-0 cursor-pointer"
              title="إعادة تعيين جميع الفلاتر"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              <span>مسح الفلاتر</span>
            </button>
          )}
        </div>

        {/* Row 2: Four Filter Select Dropdowns in Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select
            className="h-9 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text)] focus:border-[var(--accent)] transition outline-none cursor-pointer"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">كل أنواع الخدمات</option>
            {TX_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          <select
            className="h-9 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text)] focus:border-[var(--accent)] transition outline-none cursor-pointer"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">كل الحالات</option>
            {WORKFLOW_STATUS_LIST.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>

          <select
            className="h-9 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text)] focus:border-[var(--accent)] transition outline-none cursor-pointer"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="">كل الأولويات</option>
            {PRIORITIES.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          <select
            className="h-9 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text)] focus:border-[var(--accent)] transition outline-none cursor-pointer"
            value={lawyerFilter}
            onChange={e => setLawyerFilter(e.target.value)}
          >
            <option value="">كل المحامين المكلفين</option>
            {lawyerList.map(l => (
              <option key={l.id} value={l.name}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Main Transactions Interactive Table */}
      <DataPanel icon="table_rows" title="جدول المعاملات التجارية" subtitle="متابعة كافة معاملات وحركات الشركات وقسم المحدودة" count={filteredRows.length} total={localRows.length} unit="معاملة">
        

        {!localRows.length ? (
          <Empty
            icon="brief"
            title="لا توجد معاملات مسجلة بعد"
            text="ستظهر هنا كل المعاملات المسجلة في القسم التجاري فور إضافتها."
          />
        ) : !filteredRows.length ? (
          <div className="py-14 px-6 text-center text-sm font-semibold text-[var(--text-3)]">
            لا توجد معاملات مطابقة للفلاتر المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-right text-xs table-auto">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[color:color-mix(in_srgb,var(--surface-2)_80%,transparent)] text-xs text-[var(--text-2)] font-bold">
                  <th className="py-3 px-3 text-right">اسم الشركة</th>
                  <th className="py-3 px-2 text-center">نوع الخدمة</th>
                  <th className="py-3 px-2 text-center">المحامي المكلف</th>
                  <th className="py-3 px-2 text-center">المسؤول</th>
                  <th className="py-3 px-2 text-center">الأولوية</th>
                  <th className="py-3 px-2 text-center">حالة سير العمل</th>
                  <th className="py-3 px-2 text-center">تاريخ المعاملة</th>
                  <th className="py-3 px-2 text-center w-[50px]">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredRows.map(t => {
                  const pr = priorityOf(t.priority)
                  const companyObj = t.company_id ? companyMap.get(t.company_id) || t.companies : t.companies
                  const companyName = companyObj?.name || (t.companies as { name?: string })?.name || null
                  const pic = getPersonInCharge(companyObj)
                  const serviceLabel = t.type ? txType(t.type).label : null
                  const isServiceValid = serviceLabel && serviceLabel !== '—'
                  const lawyerName = t.profiles?.name || (t as unknown as { assigned_lawyer_name?: string }).assigned_lawyer_name || null
                  const isIncompleteRecord = !companyName || !isServiceValid
                  const isMenuOpen = activeMenuTx?.id === t.id
                  const stStyle = SERVICE_TYPE_STYLES[t.type]

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08] transition-colors duration-200 ${
                        isIncompleteRecord ? 'bg-amber-500/[0.04]' : ''
                      }`}
                    >
                      {/* 1. Company Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-soft)] to-blue-500/10 border border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] flex items-center justify-center shrink-0 shadow-xs">
                            <span className="material-symbols-outlined text-[19px]">domain</span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[13.5px] text-[var(--text)] leading-snug">
                              {companyName || 'سجل غير مكتمل'}
                            </span>
                            {t.description && (
                              <span className="text-[11.5px] text-[var(--text-3)] font-medium mt-0.5 truncate max-w-[320px]">
                                {t.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Service Type */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        {(() => {
                          const isFormation = t.type === 'formation' || t.type === 'tasis'
                          const isDepositReleased = companyObj?.deposit_released || Boolean(companyObj?.deposit_released_at)
                          const isInDepositPhase = isFormation && !isDepositReleased && Boolean(companyObj?.cert_date || companyObj?.status === 'established')

                          if (isFormation && isDepositReleased) {
                            return (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/20">
                                <span className="material-symbols-outlined text-[14px]">verified</span>
                                <span>تأسيس (أُطلقت الوديعة)</span>
                              </span>
                            )
                          }

                          if (isInDepositPhase) {
                            return (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/20">
                                <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                                <span>تأسيس · قيد إطلاق الوديعة</span>
                              </span>
                            )
                          }

                          if (stStyle) {
                            return (
                              <span
                                style={{
                                  background: stStyle.bg,
                                  border: stStyle.border,
                                  color: stStyle.color,
                                }}
                                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-xs"
                              >
                                {stStyle.label}
                              </span>
                            )
                          }

                          if (isServiceValid) {
                            return (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                {serviceLabel}
                              </span>
                            )
                          }

                          return (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              سجل غير مكتمل
                            </span>
                          )
                        })()}
                      </td>

                      {/* 3. Assigned Lawyer */}
                      <td className="py-3.5 px-3 text-center align-middle text-xs font-bold text-[var(--text)]">
                        {lawyerName ? (
                          <span className="text-[var(--text)]">{lawyerName}</span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[var(--text-3)] bg-[var(--surface-3)] px-2.5 py-0.5 rounded-full">
                            غير معيّن
                          </span>
                        )}
                      </td>

                      {/* 4. Person In Charge */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-xs text-[var(--text)]">
                            {pic.name === 'سجل غير مكتمل' ? <span className="text-[var(--text-3)] italic">سجل غير مكتمل</span> : pic.name}
                          </span>
                          {pic.roleLabel && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-cyan-400 bg-blue-500/10 border border-blue-500/15 px-2 py-0.5 rounded-full">
                              {pic.roleLabel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Priority */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          t.priority === 'high'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : t.priority === 'medium'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                        }`}>
                          {pr.label}
                        </span>
                      </td>

                      {/* 6. Reusable Workflow Status Badge Component */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <div className="flex justify-center">
                          <WorkflowStatus
                            status={t.status}
                            entityId={t.id}
                            entityType="transaction"
                            companyId={t.company_id}
                            size="sm"
                          />
                        </div>
                      </td>

                      {/* 7. Transaction Date */}
                      <td className="py-3.5 px-3 text-center align-middle text-xs font-bold text-[var(--text-2)] num">
                        {formatDate(t.tx_date)}
                      </td>

                      {/* 8. Actions Menu (⋮) on Every Row */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            if (activeMenuTx?.id === t.id) {
                              setActiveMenuTx(null)
                              setMenuCoords(null)
                              return
                            }
                            const rect = e.currentTarget.getBoundingClientRect()
                            const menuHeight = 240
                            const menuWidth = 210
                            let top = rect.bottom + 6
                            if (top + menuHeight > window.innerHeight - 12) {
                              top = Math.max(12, rect.top - menuHeight - 6)
                            }
                            let left = rect.left
                            if (left + menuWidth > window.innerWidth - 12) {
                              left = window.innerWidth - menuWidth - 12
                            }
                            if (left < 12) {
                              left = 12
                            }
                            setMenuCoords({ top, left })
                            setActiveMenuTx(t)
                          }}
                          className={`w-8 h-8 rounded-full border transition inline-flex items-center justify-center text-sm font-bold shadow-xs cursor-pointer ${
                            activeMenuTx?.id === t.id
                              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                              : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)]'
                          }`}
                          aria-label="خيارات المعاملة"
                        >
                          ⋮
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {/* Floating Actions Menu Portal (Floats smoothly above all containers) */}
      {activeMenuTx && menuCoords && typeof document !== 'undefined' && createPortal(
        <>
          {/* Dismiss Backdrop */}
          <div
            className="fixed inset-0 z-[999998] bg-black/10 sm:bg-transparent"
            onClick={() => {
              setActiveMenuTx(null)
              setMenuCoords(null)
            }}
          />

          {/* Floating Dropdown Card */}
          <div
            ref={menuRef}
            className="fixed z-[999999] min-w-[200px] max-w-[90vw] bg-[var(--surface)] border border-[var(--glass-border)] rounded-2xl shadow-2xl p-1.5 text-right flex flex-col gap-1 backdrop-blur-2xl animate-scale-in"
            style={{
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
            }}
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Open / 360 */}
            <button
              type="button"
              onClick={() => {
                const cur = activeMenuTx
                setActiveMenuTx(null)
                setMenuCoords(null)
                if (cur.type === 'formation' || cur.type === 'tasis') {
                  if (cur.company_id) {
                    router.push(`/commercial/companies?id=${cur.company_id}`)
                  } else {
                    setEditTx(cur)
                  }
                } else if (cur.company_id) {
                  router.push(`/commercial/companies/${cur.company_id}`)
                } else {
                  setEditTx(cur)
                }
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-right"
            >
              <span className="material-symbols-outlined text-[16px] text-blue-500">visibility</span>
              <span>{activeMenuTx.type === 'formation' || activeMenuTx.type === 'tasis' ? 'فتح تفاصيل وسير عمل التأسيس' : 'فتح تفاصيل الشركة'}</span>
            </button>

            {/* Edit / Fix Record */}
            <button
              type="button"
              onClick={() => {
                const cur = activeMenuTx
                setActiveMenuTx(null)
                setMenuCoords(null)
                setEditTx(cur)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-right"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-500">edit_note</span>
              <span>{(!activeMenuTx.company_id || !activeMenuTx.type) ? 'تصحيح وإكمال السجل' : 'تعديل المعاملة'}</span>
            </button>

            {/* Assign Lawyer */}
            <button
              type="button"
              onClick={() => {
                const cur = activeMenuTx
                setActiveMenuTx(null)
                setMenuCoords(null)
                setAssignLawyerTx(cur)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-right"
            >
              <span className="material-symbols-outlined text-[16px] text-indigo-500">person_add</span>
              <span>تعيين المحامي المسؤول</span>
            </button>

            {/* Archive */}
            <button
              type="button"
              onClick={() => {
                const id = activeMenuTx.id
                setActiveMenuTx(null)
                setMenuCoords(null)
                handleArchive(id)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-right"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-400">archive</span>
              <span>أرشفة المعاملة</span>
            </button>

            <div className="h-[1px] bg-[var(--line-soft)] my-0.5" />

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                const id = activeMenuTx.id
                setActiveMenuTx(null)
                setMenuCoords(null)
                handleDelete(id)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer text-right"
            >
              <span className="material-symbols-outlined text-[16px] text-rose-500">delete</span>
              <span>حذف المعاملة</span>
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        companies={companies}
        lawyers={lawyerList}
      />

      {/* Assign Lawyer Modal */}
      {assignLawyerTx && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: 'var(--shadow-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                تعيين المحامي المكلف
              </h3>
              <button
                type="button"
                onClick={() => setAssignLawyerTx(null)}
                style={{ border: 'none', background: 'none', fontSize: '18px', color: 'var(--text-3)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                اختر المحامي المكلف بهذه المعاملة:
              </label>
              <select
                id="assign-lawyer-select"
                className="input"
                defaultValue={assignLawyerTx.lawyer_id || ''}
                style={{ width: '100%', padding: '10px', borderRadius: '8px' }}
              >
                <option value="">غير معيّن (إلغاء التكليف)</option>
                {lawyerList.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setAssignLawyerTx(null)}
                  className="btn btn-quiet"
                  style={{ padding: '8px 16px', borderRadius: '8px' }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sel = document.getElementById('assign-lawyer-select') as HTMLSelectElement
                    const selectedId = sel?.value || null
                    const selectedOpt = sel?.options[sel.selectedIndex]
                    const selectedName = selectedId ? selectedOpt?.text || null : null
                    handleAssignLawyer(assignLawyerTx.id, selectedId, selectedName, assignLawyerTx.company_id)
                    setAssignLawyerTx(null)
                  }}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', borderRadius: '8px', fontWeight: 600 }}
                >
                  حفظ التعيين
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل وتصحيح المعاملة — التصميم الموحّد الحديث */}
      {editTx && (
        <div id="modal-root" className="on">
          <div className="modal-veil" onClick={() => setEditTx(null)} role="presentation" aria-hidden="true" />
          <div className="modal" style={{ '--modal-max-w': 'var(--modal-md, 640px)' } as React.CSSProperties}>
            
            {/* Modal Header */}
            <div className="modal-head">
              <div className="co-ico" style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                <Icon name="doc" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>تعديل وتصحيح بيانات المعاملة</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  تحديث حالة سير العمل، الشركة المرتبطة، الأتعاب، والمحامي المكلف
                </span>
              </div>
              <button type="button" onClick={() => setEditTx(null)} className="icon-btn" aria-label="إغلاق">
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={async e => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const company_id = formData.get('company_id')?.toString().trim() || null
                const company_name = formData.get('company_name')?.toString().trim() || null
                const type = formData.get('type')?.toString().trim() || null
                const status = formData.get('status')?.toString().trim() || null
                const priority = formData.get('priority')?.toString().trim() || null
                const tx_date = formData.get('tx_date')?.toString().trim() || null
                const lawyer_id = formData.get('lawyer_id')?.toString().trim() || null
                const lawyerSel = document.getElementById('edit-lawyer-select') as HTMLSelectElement
                const lawyer_name = lawyer_id && lawyerSel ? lawyerSel.options[lawyerSel.selectedIndex]?.text : null
                const manager_name = formData.get('manager_name')?.toString().trim() || null
                const feeRaw = formData.get('fee')?.toString() || '0'
                const fee = parseFloat(feeRaw.replace(/[^0-9.]/g, '')) || null
                const description = formData.get('description')?.toString().trim() || null

                const res = await updateTransactionDetailsAction(editTx.id, {
                  company_id,
                  company_name,
                  type,
                  status,
                  priority,
                  tx_date,
                  fee,
                  description,
                  lawyer_id,
                  lawyer_name,
                  manager_name,
                })

                if (res.success) {
                  // تحديث حالة العميل التفاعلية مباشرة حتى يظهر السجل المكتمل بالبيانات الحقيقية
                  setLocalRows(prev =>
                    prev.map(t => {
                      if (t.id !== editTx.id && t.company_id !== company_id) return t
                      const currentCo = (t.company_id ? companyMap.get(t.company_id) || t.companies : t.companies) as CompanyWithWorkflow | undefined
                      const updatedCo = currentCo
                        ? {
                            ...currentCo,
                            name: company_name || currentCo.name,
                            manager: manager_name || currentCo.manager,
                          }
                        : company_id && company_name
                        ? ({ id: company_id, name: company_name, manager: manager_name } as CompanyWithWorkflow)
                        : null

                      return {
                        ...t,
                        company_id: company_id || t.company_id,
                        type: type || t.type,
                        priority: (priority as unknown as TransactionFull['priority']) || t.priority,
                        status: (status as unknown as TransactionFull['status']) || t.status,
                        tx_date: tx_date || t.tx_date,
                        fee: fee !== null ? fee : t.fee,
                        description: description !== null ? description : t.description,
                        lawyer_id: lawyer_id || null,
                        profiles: lawyer_name ? ({ id: lawyer_id || '1', name: lawyer_name } as unknown as TransactionFull['profiles']) : null,
                        companies: updatedCo as unknown as Company,
                      } as TransactionFull
                    })
                  )
                  triggerToast('تم تحديث وتصحيح بيانات المعاملة بنجاح')
                  setEditTx(null)
                  router.refresh()
                } else {
                  alert(res.error || 'فشل التحديث')
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
            >
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. الشركة والمرتبط بها + تعديل اسم الشركة */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label>
                      تحديد الشركة <span style={{ color: 'var(--bad)' }}>*</span>
                    </label>
                    <select
                      name="company_id"
                      className="input"
                      defaultValue={editTx.company_id || ''}
                      required
                    >
                      <option value="" disabled>اختر الشركة المرتبطة...</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>
                      اسم الشركة (التصحيح) <span style={{ color: 'var(--bad)' }}>*</span>
                    </label>
                    <input
                      name="company_name"
                      type="text"
                      className="input"
                      defaultValue={(editTx.company_id ? companyMap.get(editTx.company_id)?.name : editTx.companies?.name) || ''}
                      placeholder="اسم الشركة الكلي..."
                      required
                    />
                  </div>
                </div>

                {/* 2. نوع الخدمة والمدير المسؤول */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label>
                      نوع الخدمة / المعاملة <span style={{ color: 'var(--bad)' }}>*</span>
                    </label>
                    <select
                      name="type"
                      className="input"
                      defaultValue={editTx.type || 'formation'}
                      required
                    >
                      {TX_TYPES.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>
                      الشخص المسؤول / المدير المفوض
                    </label>
                    <input
                      name="manager_name"
                      type="text"
                      className="input"
                      defaultValue={getPersonInCharge(editTx.company_id ? companyMap.get(editTx.company_id) || editTx.companies : editTx.companies).name.replace('سجل غير مكتمل', '')}
                      placeholder="اسم المدير المفوض..."
                    />
                  </div>
                </div>

                {/* 3. حالة المعاملة + تاريخ المعاملة */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label>حالة سير العمل</label>
                    <select
                      name="status"
                      className="input"
                      defaultValue={editTx.status || 'new'}
                    >
                      {WORKFLOW_STATUS_LIST.map(s => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>تاريخ المعاملة</label>
                    <input
                      name="tx_date"
                      type="date"
                      className="input num"
                      defaultValue={editTx.tx_date || new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                </div>

                {/* 4. الأولوية والمحامي المكلف */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label>الأولوية</label>
                    <select
                      name="priority"
                      className="input"
                      defaultValue={editTx.priority || 'medium'}
                    >
                      <option value="high">عالية</option>
                      <option value="medium">متوسطة</option>
                      <option value="low">منخفضة</option>
                      <option value="urgent">عاجلة</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>المحامي المكلف</label>
                    <select
                      id="edit-lawyer-select"
                      name="lawyer_id"
                      className="input"
                      defaultValue={editTx.lawyer_id || ''}
                    >
                      <option value="">غير معيّن (Unassigned)</option>
                      {lawyerList.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. المبلغ والتعليقات */}
                <div className="field">
                  <label>المبلغ / الأتعاب (د.ع)</label>
                  <input
                    name="fee"
                    type="text"
                    className="input num"
                    defaultValue={editTx.fee ? formatNumberWithCommas(editTx.fee) : ''}
                    onInput={e => {
                      const t = e.currentTarget
                      t.value = formatNumberWithCommas(t.value)
                    }}
                    placeholder="250,000"
                  />
                </div>

                <div className="field">
                  <label>الوصف والتعليقات</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="input"
                    defaultValue={editTx.description || ''}
                    placeholder="تفاصيل عن حالة السجل والتصحيح..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    حفظ وتصحيح المعاملة
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTx(null)}
                    className="btn btn-ghost"
                  >
                    إلغاء
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const txIdToDelete = editTx.id
                    setEditTx(null)
                    handleDelete(txIdToDelete)
                  }}
                  className="btn btn-danger"
                  style={{ fontSize: '12.5px', padding: '8px 14px' }}
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>حذف المعاملة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
