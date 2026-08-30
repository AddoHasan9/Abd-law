'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import {
  createCompanyIDAction,
  updateCompanyIDAction,
  type CompanyIDRecord,
} from '@/app/(app)/commercial/ids/actions'
import type { Company, CompanyIDStatus } from '@/types/database'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'

interface Props {
  isOpen: boolean
  onClose: () => void
  companies: Company[]
  initialIdType?: 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'
  initialCompany?: Company | null
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
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditMode = !!record

  const [idType, setIdType] = useState<'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'>(initialIdType)
  const [actionType, setActionType] = useState<'issue' | 'renew'>('issue')

  // Dual Company Selection (Search/Select or Manual typing)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(initialCompany)
  const [companySearch, setCompanySearch] = useState(initialCompany?.name || '')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [idNumber, setIdNumber] = useState('')
  const [managerName, setManagerName] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [txStartDate, setTxStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [grade, setGrade] = useState('الأولى')
  const [status, setStatus] = useState<CompanyIDStatus>('in_progress')
  const [notes, setNotes] = useState('')

  const autocompleteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    if (record) {
      setIdType(record.id_type)
      const foundCo = companies.find(c => c.id === record.company_id) || null
      setSelectedCompany(foundCo)
      setCompanySearch(record.company_name || foundCo?.name || '')
      setIdNumber(record.id_number || '')
      setManagerName(record.manager_name || foundCo?.manager || '')
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
        setManagerName(initialCompany.manager || '')
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
    if (!isEditMode && !finalCompanyName) {
      setError('يرجى اختيار شركة مسجلة أو كتابة اسم الشركة يدوياً')
      return
    }

    setLoading(true)
    setError(null)

    // Use explicitly selected status, or infer done if ID number / dates provided
    const computedStatus: CompanyIDStatus = status === 'done'
      ? 'done'
      : status === 'lacks'
      ? 'lacks'
      : status === 'paused'
      ? 'paused'
      : (idNumber.trim() || issueDate ? 'done' : 'in_progress')

    const res = isEditMode && record
      ? await updateCompanyIDAction(record.id, {
          id_number: idNumber.trim() || null,
          manager_name: managerName.trim() || null,
          issue_date: issueDate || null,
          expiry_date: expiryDate || null,
          tx_start_date: txStartDate || null,
          grade: idType === 'chamber_id' ? grade : null,
          status: computedStatus,
          notes: notes.trim() || null,
        })
      : await createCompanyIDAction({
          company_id: selectedCompany?.id,
          company_name: finalCompanyName,
          id_type: idType,
          id_number: idNumber.trim() || undefined,
          manager_name: managerName.trim() || selectedCompany?.manager || undefined,
          issue_date: issueDate || undefined,
          expiry_date: expiryDate || undefined,
          tx_start_date: txStartDate || undefined,
          grade: idType === 'chamber_id' ? grade : undefined,
          status: computedStatus,
          notes: notes.trim() || undefined,
        })

    setLoading(false)

    if (res.success) {
      if (res.record && onSaved) {
        onSaved(res.record)
      }
      onClose()
    } else {
      setError(res.error || 'حدث خطأ أثناء حفظ الهوية')
    }
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-md, 640px)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' } as React.CSSProperties}>
        
        {/* Modal Head */}
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
            }}
          >
            <Icon name="badge" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '15.5px' }}>
              {isEditMode ? 'تعديل بيانات الهوية' : actionType === 'renew' ? `تجديد ${ID_TYPE_LABELS[idType]}` : `إصدار ${ID_TYPE_LABELS[idType]}`}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {isEditMode
                ? `تحديث بيانات هوية الشركة: ${record?.company_name ?? ''}`
                : 'بدء معاملة إصدار أو تجديد هوية للشركات المسجلة ومتابعة حالتها'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            ✕
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', padding: '20px' }}>
            {error && (
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--bad-soft)',
                  border: '1px solid var(--bad)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--bad)',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>{error}</span>
              </div>
            )}

            {/* Action Type Toggle: إصدار / تجديد */}
            {!isEditMode && (
              <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-2)', padding: '4px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
                <button
                  type="button"
                  onClick={() => setActionType('issue')}
                  className={`btn ${actionType === 'issue' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: '12.5px', padding: '6px' }}
                >
                  إصدار جديد
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('renew')}
                  className={`btn ${actionType === 'renew' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: '12.5px', padding: '6px' }}
                >
                  تجديد هوية سابقة
                </button>
              </div>
            )}

            {/* ID Type Selector */}
            <div className="field">
              <label>نوع الهوية المطلوبة *</label>
              <select
                className="input"
                value={idType}
                onChange={e => setIdType(e.target.value as 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id')}
                disabled={isEditMode}
                required
              >
                <option value="importer_id">هوية مستورد</option>
                <option value="tax_id">هوية ضريبية</option>
                <option value="planning_id">هوية التخطيط</option>
                <option value="chamber_id">هوية الغرفة التجارية</option>
              </select>
            </div>

            {/* Dual Searchable Company Input: Select registered company OR type manual name */}
            <div className="field" style={{ position: 'relative', width: '100%' }} ref={autocompleteRef}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label htmlFor="id-co-search" style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
                  اسم الشركة (اختيار من المسجلة أو كتابة يدوية) *
                </label>
                {selectedCompany ? (
                  <span style={{ fontSize: '11.5px', color: 'var(--ok)', fontWeight: 700 }}>
                    ✓ شركة مسجلة بالنظام
                  </span>
                ) : companySearch.trim() ? (
                  <span style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 700 }}>
                    ✎ كتابة يدوية
                  </span>
                ) : null}
              </div>

              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="id-co-search"
                  type="text"
                  className="input"
                  style={{ width: '100%', minHeight: '42px', fontSize: '14px', padding: '10px 14px' }}
                  value={companySearch}
                  onChange={e => {
                    setCompanySearch(e.target.value)
                    setSelectedCompany(null)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => !isEditMode && setIsDropdownOpen(true)}
                  placeholder="اختر شركة مسجلة من القائمة أو اكتب اسم الشركة يدوياً..."
                  autoComplete="off"
                  disabled={isEditMode}
                  required
                />
              </div>

              {/* Autocomplete Dropdown */}
              {isDropdownOpen && !isEditMode && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    boxShadow: 'var(--shadow-3)',
                    zIndex: 99999,
                  }}
                >
                  {companySearch.trim() && (
                    <div
                      onMouseDown={e => {
                        e.preventDefault()
                        setSelectedCompany(null)
                        setIsDropdownOpen(false)
                      }}
                      style={{
                        padding: '10px 14px',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--line-soft)',
                        background: 'var(--surface-2)',
                        color: 'var(--accent)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Icon name="plus" />
                      <span>استخدام الاسم اليدوي: &quot;{companySearch.trim()}&quot;</span>
                    </div>
                  )}

                  {filteredCompanies.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={e => {
                        e.preventDefault()
                        setSelectedCompany(c)
                        setCompanySearch(c.name)
                        if (c.manager) setManagerName(c.manager)
                        setIsDropdownOpen(false)
                      }}
                      style={{
                        padding: '10px 14px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--line-soft)',
                        background: selectedCompany?.id === c.id ? 'var(--accent-soft)' : 'transparent',
                        color: 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>({c.kind || 'شركة'})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chamber ID Grade */}
            {idType === 'chamber_id' && (
              <div className="field" style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
                <label htmlFor="id-chamber-grade" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  درجة الغرفة التجارية *
                </label>
                <select
                  id="id-chamber-grade"
                  className="input"
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
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
            <div className="field">
              <label htmlFor="id-mgr-name">اسم المدير المفوض المسؤول</label>
              <input
                id="id-mgr-name"
                type="text"
                className="input"
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                placeholder="اسم المدير المفوض..."
              />
            </div>

            {/* Transaction Start Date */}
            <div className="field">
              <label htmlFor="id-start-date">تاريخ بدء المعاملة *</label>
              <input
                id="id-start-date"
                type="date"
                className="input"
                value={txStartDate}
                onChange={e => setTxStartDate(e.target.value)}
                required
              />
            </div>

            {/* Status Selection */}
            <div className="field">
              <label style={{ fontWeight: 800, color: 'var(--text)' }}>حالة المعاملة الحالية *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStatus('in_progress')}
                  className={`btn ${status === 'in_progress' ? 'btn-warn' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>قيد الإصدار / الإجراء</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('done')}
                  className={`btn ${status === 'done' ? 'btn-go' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span>✓</span>
                  <span>مكتملة ومُصدرة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('lacks')}
                  className={`btn ${status === 'lacks' ? 'btn-bad' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span>⚠️</span>
                  <span>بها نواقص</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('paused')}
                  className={`btn ${status === 'paused' ? 'btn-gray' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span>⏸️</span>
                  <span>متوقفة مؤقتاً</span>
                </button>
              </div>
            </div>

            {/* Informational Guidance Alert */}
            <div
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent)',
                padding: '10px 14px',
                borderRadius: 'var(--r-md)',
                fontSize: '12.5px',
                color: 'var(--text-2)',
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: 'var(--accent)' }}>ملاحظة هامة:</strong> إذا كانت الهوية لا تزال قيد الإنجاز في الدوائر الحكومية، اترك <strong>رقم الهوية وتاريخ الإصدار والانتهاء فارغين</strong>؛ وسيتم إدراجها فوراً كـ <span className="tag tag-warn" style={{ fontSize: '11px', fontWeight: 700 }}>قيد الإصدار / قيد الإجراء</span> ويمكنك إكمالها في أي وقت.
            </div>

            {/* ID Number & Dates Grid */}
            <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-2)' }}>
                بيانات الوثيقة المُصدرة (تُملأ عند اكتمال واستلام الهوية)
              </div>

              <div className="field">
                <label htmlFor="id-number">رقم الهوية / الوثيقة (إن وُجد)</label>
                <input
                  id="id-number"
                  type="text"
                  className="input num"
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  placeholder="مثال: TX-2026-9901 أو رقم الهوية..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label htmlFor="id-issue-date">تاريخ الإصدار</label>
                  <input
                    id="id-issue-date"
                    type="date"
                    className="input"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="id-expiry-date">تاريخ الانتهاء</label>
                  <input
                    id="id-expiry-date"
                    type="date"
                    className="input"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="field">
              <label htmlFor="id-notes">ملاحظات إضافية أو متطلبات</label>
              <input
                id="id-notes"
                type="text"
                className="input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="أي ملاحظات خاصة بالمعاملة..."
              />
            </div>

          </div>

          {/* Modal Footer */}
          <div className="modal-foot">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الحفظ...' : isEditMode ? 'حفظ التعديلات' : idNumber || issueDate ? `حفظ وتثبيت ${ID_TYPE_LABELS[idType]}` : `بدء معاملة إصدار ${ID_TYPE_LABELS[idType]}`}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
