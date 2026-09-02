'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import {
  createCompanyIDAction,
  updateCompanyIDAction,
  type CompanyIDRecord,
} from '@/app/(app)/commercial/ids/actions'
import { getActiveLawyersAction } from '@/app/(app)/settings/users/actions'
import type { Company, CompanyManager, CompanyIDStatus } from '@/types/database'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import { cn } from '@/lib/utils'

export type CompanyOption = Company & {
  managers?: CompanyManager[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  companies: CompanyOption[]
  initialIdType?: 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'
  initialCompany?: CompanyOption | null
  /** عند التعديل: السجل المطلوب تحديثه */
  record?: CompanyIDRecord | null
  onSaved?: (record: CompanyIDRecord) => void
}

const ID_TYPE_LABELS: Record<string, string> = {
  importer_id: 'هوية مستورد',
  tax_id: 'هوية ضريبية',
  planning_id: 'هوية التخطيط',
  chamber_id: 'هوية الغرفة التجارية',
}

const CHAMBER_GRADES = [
  'ممتازة',
  'الأولى',
  'الثانية',
  'الثالثة',
  'الرابعة',
  'الخامسة',
]

export default function AddIDModal({
  isOpen,
  onClose,
  companies = [],
  initialIdType = 'importer_id',
  initialCompany = null,
  record = null,
  onSaved,
}: Props) {
  useModalBodyLock(isOpen)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditMode = !!record

  const [idType, setIdType] = useState<'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'>(initialIdType)
  const [actionType, setActionType] = useState<'issue' | 'renew'>('issue')

  // Dual Company Selection (Search/Select or Manual typing)
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(initialCompany)
  const [companySearch, setCompanySearch] = useState(initialCompany?.name || '')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [idNumber, setIdNumber] = useState('')
  const [managerName, setManagerName] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [txStartDate, setTxStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [grade, setGrade] = useState('الأولى')
  const [status, setStatus] = useState<CompanyIDStatus>('in_progress')
  const [lawyerId, setLawyerId] = useState('db13125d-3aa1-46ab-9159-8fad18746623')
  const [notes, setNotes] = useState('')

  const [lawyers, setLawyers] = useState<Array<{ id: string; name: string }>>([
    { id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي' }
  ])

  const autocompleteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    async function loadLawyers() {
      const res = await getActiveLawyersAction()
      if (res.success && res.data && res.data.length > 0) {
        setLawyers(res.data)
        setLawyerId(prev => prev || res.data[0].id)
      }
    }
    loadLawyers()
  }, [])

  useEffect(() => {
    if (!isOpen) return

    if (record) {
      setIdType(record.id_type)
      const foundCo = companies.find(c => c.id === record.company_id) || null
      setSelectedCompany(foundCo)
      setCompanySearch(record.company_name || foundCo?.name || '')
      setIdNumber(record.id_number || '')
      setManagerName(record.manager_name || foundCo?.managers?.find(m => m.active)?.name || foundCo?.manager || '')
      setIssueDate(record.issue_date || '')
      setExpiryDate(record.expiry_date || '')
      setTxStartDate(record.tx_start_date || new Date().toISOString().slice(0, 10))
      setGrade(record.grade || 'الأولى')
      setStatus(record.status || (record.id_number || record.issue_date ? 'done' : 'in_progress'))
      setNotes(record.notes || '')
      setActionType('issue')
    } else {
      setIdType(initialIdType)
      if (initialCompany) {
        setSelectedCompany(initialCompany)
        setCompanySearch(initialCompany.name)
        const activeMgr = initialCompany.managers?.find((m: CompanyManager) => m.active)?.name || initialCompany.managers?.[0]?.name || initialCompany.manager || ''
        setManagerName(activeMgr)
      } else {
        setSelectedCompany(null)
        setCompanySearch('')
        setManagerName('')
      }
      setIdNumber('')
      setIssueDate('')
      setExpiryDate('')
      setTxStartDate(new Date().toISOString().slice(0, 10))
      setGrade('الأولى')
      setStatus('in_progress')
      setNotes('')
      setActionType('issue')
    }
  }, [isOpen, record, initialIdType, initialCompany, companies])

  useModalBodyLock(isOpen)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!mounted || !isOpen) return null

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.trim().toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalCompanyName = companySearch.trim() || selectedCompany?.name || ''
    if (!finalCompanyName) {
      setError('يرجى تحديد الشركة أو كتابة اسمها.')
      return
    }

    const finalLawyerId = lawyerId.trim() || lawyers[0]?.id || 'db13125d-3aa1-46ab-9159-8fad18746623'
    if (!finalLawyerId) {
      setError('يرجى اختيار المحامي المسؤول عن المعاملة.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isEditMode && record) {
        const res = await updateCompanyIDAction(record.id, {
          id_number: idNumber.trim() || null,
          manager_name: managerName.trim() || null,
          grade: idType === 'chamber_id' ? grade : null,
          issue_date: issueDate || null,
          expiry_date: expiryDate || null,
          tx_start_date: txStartDate || null,
          status,
          notes: notes.trim() || null,
        })

        if (!res.success) {
          setError(res.error || 'تعذّر تحديث السجل.')
          setLoading(false)
          return
        }

        if (res.record && onSaved) onSaved(res.record)
      } else {
        const res = await createCompanyIDAction({
          company_id: selectedCompany?.id || undefined,
          company_name: finalCompanyName,
          id_type: idType,
          id_number: idNumber.trim() || undefined,
          manager_name: managerName.trim() || undefined,
          grade: idType === 'chamber_id' ? grade : undefined,
          lawyer_id: finalLawyerId,
          issue_date: issueDate || undefined,
          expiry_date: expiryDate || undefined,
          tx_start_date: txStartDate || undefined,
          status,
          notes: notes.trim() || undefined,
        })

        if (!res.success) {
          setError(res.error || 'تعذّر إنشاء المعاملة.')
          setLoading(false)
          return
        }

        if (res.record && onSaved) onSaved(res.record)
      }

      onClose()
    } catch {
      setError('حدث خطأ غير متوقع أثناء الحفظ.')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-lg, 780px)' } as React.CSSProperties}>
        {/* Header */}
        <div className="modal-head">
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="stamp" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
              {isEditMode ? `تعديل بيانات ${ID_TYPE_LABELS[idType]}` : `إضافة معاملة ${ID_TYPE_LABELS[idType]}`}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {isEditMode ? 'تحديث وتثبيت وثيقة الهوية المسجلة' : 'تسجيل معاملة إصدار أو تجديد هوية وترخيص مهني'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            <Icon name="x" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
            {error && (
              <div className="login-err" style={{ marginBottom: 0 }}>
                {error}
              </div>
            )}

            {/* Type Selector */}
            {!isEditMode && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-2">نوع الهوية / الترخيص الحكومي *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(ID_TYPE_LABELS) as Array<'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'>).map(typeKey => (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => setIdType(typeKey)}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer text-center gap-1.5',
                        idType === typeKey
                          ? 'border-primary bg-primary-soft text-primary shadow-xs'
                          : 'border-border bg-surface-2 text-text-2 hover:border-text-3/40'
                      )}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {typeKey === 'chamber_id' ? 'account_balance' : typeKey === 'importer_id' ? 'local_shipping' : typeKey === 'tax_id' ? 'receipt_long' : 'domain'}
                      </span>
                      <span>{ID_TYPE_LABELS[typeKey]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Type (Issue vs Renew) */}
            {!isEditMode && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-2/60 border border-border-soft">
                <span className="text-xs font-bold text-text-2">نوع الإجراء:</span>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="actionType"
                    checked={actionType === 'issue'}
                    onChange={() => setActionType('issue')}
                    className="accent-primary"
                  />
                  <span>إصدار جديد</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="actionType"
                    checked={actionType === 'renew'}
                    onChange={() => setActionType('renew')}
                    className="accent-primary"
                  />
                  <span>تجديد سنوي</span>
                </label>
              </div>
            )}

            {/* Company Selection */}
            <div className="relative flex flex-col gap-1.5" ref={autocompleteRef}>
              <label className="text-xs font-semibold text-text-2">الشركة المعنية *</label>
              <div className="relative">
                <input
                  type="text"
                  value={companySearch}
                  onChange={e => {
                    setCompanySearch(e.target.value)
                    setSelectedCompany(null)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="ابحث عن الشركة أو اكتب اسم الشركة..."
                  className="flex h-10 w-full rounded-xl bg-surface-2 border border-border px-3.5 pl-10 text-sm font-medium text-text placeholder:text-text-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-[18px]">
                  business
                </span>
              </div>

              {isDropdownOpen && filteredCompanies.length > 0 && (
                <div className="absolute top-[calc(100%+4px)] right-0 left-0 max-h-48 overflow-y-auto bg-surface border border-border-glass rounded-xl shadow-xl z-20 divide-y divide-border-soft">
                  {filteredCompanies.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault()
                        setSelectedCompany(c)
                        setCompanySearch(c.name)
                        const activeMgr = c.managers?.find((m: CompanyManager) => m.active)?.name || c.managers?.[0]?.name || c.manager || ''
                        if (activeMgr) setManagerName(activeMgr)
                        setIsDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-right hover:bg-surface-2 transition-colors cursor-pointer',
                        selectedCompany?.id === c.id && 'bg-primary-soft text-primary font-bold'
                      )}
                    >
                      <span className="font-bold text-text truncate">{c.name}</span>
                      <span className="text-[11px] text-text-3 flex-none mr-2">({c.kind || 'شركة'})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chamber ID Grade */}
            {idType === 'chamber_id' && (
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-2/60 border border-border-soft">
                <label htmlFor="id-chamber-grade" className="text-xs font-bold text-primary">
                  درجة الغرفة التجارية *
                </label>
                <select
                  id="id-chamber-grade"
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  className="flex h-10 w-full rounded-xl bg-surface border border-border px-3.5 text-sm font-semibold text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  required
                >
                  {CHAMBER_GRADES.map(g => (
                    <option key={g} value={g}>
                      درجة {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manager Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="id-mgr-name" className="text-xs font-semibold text-text-2">
                اسم المدير المفوض المسؤول
              </label>
              <input
                id="id-mgr-name"
                type="text"
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                placeholder="اسم المدير المفوض..."
                className="flex h-10 w-full rounded-xl bg-surface-2 border border-border px-3.5 text-sm font-medium text-text placeholder:text-text-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Lawyer & Start Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="id-lawyer" className="text-xs font-bold text-primary">
                  المحامي المكلّف / المسؤول *
                </label>
                <select
                  id="id-lawyer"
                  value={lawyerId}
                  onChange={e => setLawyerId(e.target.value)}
                  className="flex h-10 w-full rounded-xl bg-surface-2 border border-border px-3.5 text-sm font-semibold text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  required
                >
                  {lawyers.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="id-start-date" className="text-xs font-semibold text-text-2">
                  تاريخ بدء المعاملة *
                </label>
                <input
                  id="id-start-date"
                  type="date"
                  value={txStartDate}
                  onChange={e => setTxStartDate(e.target.value)}
                  className="flex h-10 w-full rounded-xl bg-surface-2 border border-border px-3.5 text-sm font-medium text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>

            {/* Status Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text">حالة المعاملة الحالية *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('in_progress')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                    status === 'in_progress'
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'border-border bg-surface-2 text-text-3 hover:text-text'
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>قيد الإصدار</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('done')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                    status === 'done'
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'border-border bg-surface-2 text-text-3 hover:text-text'
                  )}
                >
                  <span>✓</span>
                  <span>مكتملة ومُصدرة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('lacks')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                    status === 'lacks'
                      ? 'border-rose-500/50 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'border-border bg-surface-2 text-text-3 hover:text-text'
                  )}
                >
                  <span>⚠️</span>
                  <span>بها نواقص</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('paused')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                    status === 'paused'
                      ? 'border-border-soft bg-surface-3 text-text-2'
                      : 'border-border bg-surface-2 text-text-3 hover:text-text'
                  )}
                >
                  <span>⏸️</span>
                  <span>متوقفة</span>
                </button>
              </div>
            </div>

            {/* Issued Document Details (Optional) */}
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-2/60 border border-border-soft">
              <span className="text-xs font-bold text-text-2">
                بيانات الوثيقة المُصدرة (تُملأ عند اكتمال واستلام الهوية)
              </span>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="id-number" className="text-xs font-medium text-text-3">
                  رقم الهوية / الوثيقة (إن وُجد)
                </label>
                <input
                  id="id-number"
                  type="text"
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  placeholder="مثال: TX-2026-9901 أو رقم الهوية..."
                  className="flex h-10 w-full rounded-xl bg-surface border border-border px-3.5 text-sm font-medium text-text font-mono placeholder:text-text-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="id-issue-date" className="text-xs font-medium text-text-3">
                    تاريخ الإصدار
                  </label>
                  <input
                    id="id-issue-date"
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="flex h-10 w-full rounded-xl bg-surface border border-border px-3.5 text-sm font-medium text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="id-expiry-date" className="text-xs font-medium text-text-3">
                    تاريخ الانتهاء
                  </label>
                  <input
                    id="id-expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="flex h-10 w-full rounded-xl bg-surface border border-border px-3.5 text-sm font-medium text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="id-notes" className="text-xs font-semibold text-text-2">
                ملاحظات إضافية أو متطلبات
              </label>
              <input
                id="id-notes"
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="أي ملاحظات خاصة بالمعاملة..."
                className="flex h-10 w-full rounded-xl bg-surface-2 border border-border px-3.5 text-sm font-medium text-text placeholder:text-text-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-foot">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-ghost"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading
                ? 'جارٍ الحفظ…'
                : isEditMode
                ? 'حفظ التعديلات'
                : idNumber || issueDate
                ? `حفظ وتثبيت ${ID_TYPE_LABELS[idType]}`
                : `بدء معاملة إصدار ${ID_TYPE_LABELS[idType]}`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
