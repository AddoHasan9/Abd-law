'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import {
  createFinancialStatementsBatchAction,
  updateFinancialStatementAction
} from '@/app/(app)/commercial/financial-statements/actions'
import { getFSYearOptions } from '@/lib/financial-statements/calc'
import { createClient } from '@/lib/supabase/client'
import type { Company, FinancialStatement } from '@/types/database'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'

interface Props {
  isOpen: boolean
  onClose: () => void
  companies?: Company[]
  initialCompanyId?: string
  editingStatement?: FinancialStatement | null
}

interface DynamicYearRow {
  rowId: string
  year: number
  date_received: string
  tax_submitted: boolean
  date_submitted_tax: string
  registrar_submitted: boolean
  date_submitted_registrar: string
  notes: string
}

export default function AddFinancialStatementModal({
  isOpen,
  onClose,
  companies = [],
  initialCompanyId,
  editingStatement,
}: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [loadedCompanies, setLoadedCompanies] = useState<Company[]>(companies)

  const currentYear = new Date().getFullYear()
  const yearOptions = getFSYearOptions()

  // Company Search Autocomplete State
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companySearch, setCompanySearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Dynamic Rows State (for Create Mode)
  const [rows, setRows] = useState<DynamicYearRow[]>([])

  // Edit Mode State (for single statement editing)
  const [editYear, setEditYear] = useState<number>(currentYear - 1)
  const [editDateReceived, setEditDateReceived] = useState('')
  const [editTaxSubmitted, setEditTaxSubmitted] = useState(false)
  const [editDateSubmittedTax, setEditDateSubmittedTax] = useState('')
  const [editRegistrarSubmitted, setEditRegistrarSubmitted] = useState(false)
  const [editDateSubmittedRegistrar, setEditDateSubmittedRegistrar] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const autocompleteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Dynamic fetch of registered companies if list is empty
  useEffect(() => {
    if (companies && companies.length > 0) {
      setLoadedCompanies(companies)
      return
    }
    const fetchCompanies = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('companies').select('*').order('name')
        if (data) setLoadedCompanies(data as Company[])
      } catch {
        setError('تعذّر تحميل قائمة الشركات لقاعدة البيانات')
      }
    }
    if (isOpen) {
      fetchCompanies()
    }
  }, [companies, isOpen])

  useModalBodyLock(isOpen, onClose)

  // Close company search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset or initialize state when modal opens
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setSuccessMsg(null)

    const list = loadedCompanies.length > 0 ? loadedCompanies : companies

    if (editingStatement) {
      const co = list.find(c => c.id === editingStatement.company_id) || null
      setSelectedCompany(co)
      setCompanySearch(co ? co.name : editingStatement.company_name || '')
      setEditYear(editingStatement.year || currentYear)
      setEditDateReceived(editingStatement.date_received || '')

      const hasTax = Boolean(editingStatement.date_submitted_tax || editingStatement.tax_submitted)
      setEditTaxSubmitted(hasTax)
      setEditDateSubmittedTax(editingStatement.date_submitted_tax || (hasTax ? editingStatement.date_submitted || '' : ''))

      const hasReg = Boolean(editingStatement.date_submitted_registrar || editingStatement.registrar_submitted || editingStatement.date_submitted)
      setEditRegistrarSubmitted(hasReg)
      setEditDateSubmittedRegistrar(editingStatement.date_submitted_registrar || editingStatement.date_submitted || '')

      setEditNotes(editingStatement.notes || '')
    } else {
      const initialCo = list.find(c => c.id === initialCompanyId) || (list.length > 0 ? list[0] : null)
      setSelectedCompany(initialCo)
      setCompanySearch(initialCo ? initialCo.name : '')

      // Default 1 row for creation (preceding fiscal year, e.g. 2025 in 2026)
      setRows([
        {
          rowId: Math.random().toString(),
          year: currentYear - 1,
          date_received: '',
          tax_submitted: false,
          date_submitted_tax: '',
          registrar_submitted: false,
          date_submitted_registrar: '',
          notes: '',
        },
      ])
    }
  }, [editingStatement, initialCompanyId, isOpen, companies, loadedCompanies, currentYear])

  if (!mounted || !isOpen) return null

  // إتاحة الشركات المؤسسة فقط، واستبعاد الشركات قيد التأسيس من قائمة اختيار الحسابات الختامية
  const availableCompanies = (loadedCompanies.length > 0 ? loadedCompanies : companies).filter(
    c => c.status === 'established' || Boolean(c.deposit_released) || Boolean(c.cert_date) || Boolean(c.cert_no)
  )

  // Filter companies based on search input
  const filteredCompanies = availableCompanies.filter(c =>
    c.name.toLowerCase().includes(companySearch.trim().toLowerCase())
  )

  // Add new dynamic year row
  const handleAddRow = () => {
    const usedYears = new Set(rows.map(r => r.year))
    let nextAvailableYear = currentYear - 1

    for (const y of yearOptions) {
      if (!usedYears.has(y)) {
        nextAvailableYear = y
        break
      }
    }

    setRows(prev => [
      ...prev,
      {
        rowId: Math.random().toString(),
        year: nextAvailableYear,
        date_received: '',
        tax_submitted: false,
        date_submitted_tax: '',
        registrar_submitted: false,
        date_submitted_registrar: '',
        notes: '',
      },
    ])
  }

  // Remove dynamic row
  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) return
    setRows(prev => prev.filter(r => r.rowId !== rowId))
  }

  // Update field in dynamic row
  const handleRowChange = (rowId: string, field: keyof DynamicYearRow, value: string | number | boolean) => {
    setRows(prev =>
      prev.map(r => {
        if (r.rowId !== rowId) return r
        const updated = { ...r, [field]: value }
        // Auto-set today date when enabling switch if date was empty
        if (field === 'tax_submitted' && value === true && !r.date_submitted_tax) {
          updated.date_submitted_tax = new Date().toISOString().slice(0, 10)
        }
        if (field === 'registrar_submitted' && value === true && !r.date_submitted_registrar) {
          updated.date_submitted_registrar = new Date().toISOString().slice(0, 10)
        }
        return updated
      })
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedInput = companySearch.trim()
    if (!trimmedInput && !selectedCompany) {
      setError('يرجى كتابة أو اختيار اسم الشركة')
      return
    }

    let targetCompanyId = selectedCompany?.id || ''
    let targetCompanyName = selectedCompany?.name || trimmedInput

    if (!targetCompanyId && trimmedInput) {
      const match = availableCompanies.find(
        c => c.name.trim().toLowerCase() === trimmedInput.toLowerCase() || c.id === trimmedInput
      )
      if (match) {
        targetCompanyId = match.id
        targetCompanyName = match.name
      } else {
        targetCompanyId = 'custom_' + trimmedInput.toLowerCase().replace(/\s+/g, '_')
        targetCompanyName = trimmedInput
      }
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    if (editingStatement) {
      // Single edit mode
      const res = await updateFinancialStatementAction(editingStatement.id, {
        year: editYear,
        date_received: editDateReceived,
        date_submitted_tax: editTaxSubmitted ? (editDateSubmittedTax || new Date().toISOString().slice(0, 10)) : '',
        date_submitted_registrar: editRegistrarSubmitted ? (editDateSubmittedRegistrar || new Date().toISOString().slice(0, 10)) : '',
        date_submitted: editRegistrarSubmitted ? (editDateSubmittedRegistrar || new Date().toISOString().slice(0, 10)) : '',
        tax_submitted: editTaxSubmitted,
        registrar_submitted: editRegistrarSubmitted,
        notes: editNotes,
      })

      setLoading(false)
      if (res.success) {
        setSuccessMsg('تم حفظ وتعديل بيانات الحسابات الختامية بنجاح')
        setTimeout(() => {
          router.refresh()
          onClose()
        }, 600)
      } else {
        setError(res.error || 'حدث خطأ أثناء تعديل الحسابات الختامية')
      }
    } else {
      // Create batch mode (multiple rows)
      const selectedYears = rows.map(r => r.year)
      const uniqueYears = new Set(selectedYears)
      if (uniqueYears.size !== selectedYears.length) {
        setLoading(false)
        setError('لا يمكن تكرار نفس السنة المالية بنفس الاستمارة')
        return
      }

      const res = await createFinancialStatementsBatchAction({
        company_id: targetCompanyId,
        company_name: targetCompanyName,
        rows: rows.map(r => ({
          year: r.year,
          date_received: r.date_received,
          date_submitted_tax: r.tax_submitted ? (r.date_submitted_tax || new Date().toISOString().slice(0, 10)) : undefined,
          date_submitted_registrar: r.registrar_submitted ? (r.date_submitted_registrar || new Date().toISOString().slice(0, 10)) : undefined,
          date_submitted: r.registrar_submitted ? (r.date_submitted_registrar || new Date().toISOString().slice(0, 10)) : undefined,
          notes: r.notes,
        })),
      })

      setLoading(false)
      if (res.success) {
        setSuccessMsg(`تم حفظ الحسابات الختامية بنجاح لـ (${targetCompanyName})!`)
        setTimeout(() => {
          router.refresh()
          onClose()
        }, 600)
      } else {
        setError(res.error || 'حدث خطأ أثناء حفظ الحسابات الختامية')
      }
    }
  }

  const setTodayDate = (setter: (val: string) => void) => {
    setter(new Date().toISOString().slice(0, 10))
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-lg, 840px)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' } as React.CSSProperties}>
        {/* Head */}
        <div className="modal-head" style={{ flex: 'none' }}>
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
            <Icon name="doc" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{editingStatement ? 'تعديل الحسابات الختامية' : 'إضافة حسابات ختامية'}</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {editingStatement ? `تعديل سجّل الميزانية لسنة ${editingStatement.year}` : 'تسجيل تسليم الميزانيات للضرائب (31/7) ومسجل الشركات (7/10)'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px' }}>
            {error && (
              <div className="login-err" style={{ marginBottom: 0 }}>
                {error}
              </div>
            )}

            {successMsg && (
              <div style={{ padding: '10px 14px', background: 'var(--ok-soft)', border: '1px solid var(--ok)', borderRadius: 'var(--r-md)', color: 'var(--ok)', fontSize: '13px', fontWeight: 700 }}>
                ✓ {successMsg}
              </div>
            )}

            {/* Legal Deadlines Banner */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '10px',
              padding: '12px 14px',
              background: 'rgba(217, 119, 6, 0.08)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              borderRadius: 'var(--r-md)',
              fontSize: '12px',
              color: 'var(--text)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#d97706', fontSize: '16px' }}>🏛️</span>
                <span>مهلة الضرائب القانونية: <strong>31 تموز (31/7)</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#2563eb', fontSize: '16px' }}>🏢</span>
                <span>مهلة مسجل الشركات: <strong>7 تشرين الأول (7/10)</strong></span>
              </div>
            </div>

            {/* 1. Full-Width Searchable Company Selector at the Top */}
            <div className="field" style={{ position: 'relative', width: '100%' }} ref={autocompleteRef}>
              <label htmlFor="fs-company-search" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px', display: 'block' }}>
                الشركة المعنية (مسجلة بالنظام أو خارجية) *
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="fs-company-search"
                  type="text"
                  className="input"
                  value={companySearch}
                  onChange={e => {
                    setCompanySearch(e.target.value)
                    setSelectedCompany(null)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="ابحث عن شركة مسجلة أو اكتب اسم شركة خارجية..."
                  disabled={Boolean(editingStatement || initialCompanyId)}
                  autoComplete="off"
                  style={{ width: '100%', height: '42px', fontSize: '13.5px' }}
                  required
                />
                {selectedCompany && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--ok)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      background: 'var(--ok-soft)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    ✓ مسجلة بالنظام
                  </span>
                )}
                {!selectedCompany && companySearch.trim() && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--accent)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      background: 'var(--accent-soft)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    شركة خارجية
                  </span>
                )}
              </div>

              {/* Searchable Autocomplete Dropdown Results */}
              {isDropdownOpen && !editingStatement && !initialCompanyId && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    boxShadow: 'var(--shadow-3)',
                    zIndex: 99999,
                  }}
                >
                  {filteredCompanies.length === 0 ? (
                    <div
                      onMouseDown={e => {
                        e.preventDefault()
                        setSelectedCompany(null)
                        setIsDropdownOpen(false)
                      }}
                      style={{ padding: '12px 14px', fontSize: '12.5px', color: 'var(--accent)', cursor: 'pointer', textAlign: 'center', fontWeight: 700 }}
                    >
                      + إضافة حسابات لشركة خارجية باسم: &quot;{companySearch.trim()}&quot;
                    </div>
                  ) : (
                    filteredCompanies.map(c => (
                      <div
                        key={c.id}
                        onMouseDown={e => {
                          e.preventDefault()
                          setSelectedCompany(c)
                          setCompanySearch(c.name)
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
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
                          {c.kind}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 2. Financial Statement Years Cards */}
            {editingStatement ? (
              /* Single Edit Mode Card */
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
                  تعديل الحسابات الختامية لسنة {editYear}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <div className="field">
                    <label htmlFor="edit-fs-year" style={{ fontSize: '12px', fontWeight: 700 }}>سنة الحسابات الختامية *</label>
                    <select
                      id="edit-fs-year"
                      className="input"
                      value={editYear}
                      onChange={e => setEditYear(Number(e.target.value))}
                      required
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>
                          سنة {y} {y === currentYear - 1 ? '(آخر سنة منتهية)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="edit-fs-rec" style={{ fontSize: '12px', fontWeight: 700 }}>تاريخ استلام المستندات من العميل</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        id="edit-fs-rec"
                        type="date"
                        className="input"
                        value={editDateReceived}
                        onChange={e => setEditDateReceived(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => setTodayDate(setEditDateReceived)}
                        className="btn btn-ghost"
                        style={{ padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                      >
                        اليوم
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delivery Controls: Taxes & Registrar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', marginTop: '6px' }}>
                  
                  {/* Tax Commission Delivery */}
                  <div style={{
                    background: editTaxSubmitted ? 'rgba(16, 185, 129, 0.06)' : 'var(--surface)',
                    border: `1px solid ${editTaxSubmitted ? 'rgba(16, 185, 129, 0.3)' : 'var(--line-soft)'}`,
                    borderRadius: 'var(--r-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={editTaxSubmitted}
                        onChange={e => {
                          const checked = e.target.checked
                          setEditTaxSubmitted(checked)
                          if (checked && !editDateSubmittedTax) {
                            setEditDateSubmittedTax(new Date().toISOString().slice(0, 10))
                          }
                        }}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                          تم التسليم للهيئة العامة للضرائب 🏛️
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                          المهلة القصوى: 31/07/{editYear + 1}
                        </div>
                      </div>
                    </label>

                    {editTaxSubmitted && (
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-2)' }}>تاريخ التسليم للضرائب</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="date"
                            className="input"
                            value={editDateSubmittedTax}
                            onChange={e => setEditDateSubmittedTax(e.target.value)}
                            style={{ flex: 1, height: '36px', fontSize: '13px' }}
                            required={editTaxSubmitted}
                          />
                          <button
                            type="button"
                            onClick={() => setTodayDate(setEditDateSubmittedTax)}
                            className="btn btn-ghost"
                            style={{ padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                          >
                            اليوم
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Registrar Delivery */}
                  <div style={{
                    background: editRegistrarSubmitted ? 'rgba(59, 130, 246, 0.06)' : 'var(--surface)',
                    border: `1px solid ${editRegistrarSubmitted ? 'rgba(59, 130, 246, 0.3)' : 'var(--line-soft)'}`,
                    borderRadius: 'var(--r-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={editRegistrarSubmitted}
                        onChange={e => {
                          const checked = e.target.checked
                          setEditRegistrarSubmitted(checked)
                          if (checked && !editDateSubmittedRegistrar) {
                            setEditDateSubmittedRegistrar(new Date().toISOString().slice(0, 10))
                          }
                        }}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                          تم التسليم لدائرة تسجيل الشركات 🏢
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                          المهلة القصوى: 07/10/{editYear + 1}
                        </div>
                      </div>
                    </label>

                    {editRegistrarSubmitted && (
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-2)' }}>تاريخ التسليم لمسجل الشركات</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="date"
                            className="input"
                            value={editDateSubmittedRegistrar}
                            onChange={e => setEditDateSubmittedRegistrar(e.target.value)}
                            style={{ flex: 1, height: '36px', fontSize: '13px' }}
                            required={editRegistrarSubmitted}
                          />
                          <button
                            type="button"
                            onClick={() => setTodayDate(setEditDateSubmittedRegistrar)}
                            className="btn btn-ghost"
                            style={{ padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                          >
                            اليوم
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="field">
                  <label htmlFor="edit-fs-notes" style={{ fontSize: '12px', fontWeight: 700 }}>ملاحظات إضافية (اختياري)</label>
                  <input
                    id="edit-fs-notes"
                    type="text"
                    className="input"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="أية ملاحظات خاصة بالميزانية..."
                  />
                </div>
              </div>
            ) : (
              /* Multi-Year Cards List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {rows.map(row => (
                  <div
                    key={row.rowId}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-lg)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      boxShadow: 'var(--shadow-1)',
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)' }} />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
                          الحسابات الختامية لسنة {row.year}
                        </span>
                      </div>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.rowId)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--bad)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          ✕ حذف هذه السنة
                        </button>
                      )}
                    </div>

                    {/* 2-Column Inputs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                      <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 700 }}>سنة الميزانية *</label>
                        <select
                          className="input"
                          value={row.year}
                          onChange={e => handleRowChange(row.rowId, 'year', Number(e.target.value))}
                          required
                        >
                          {yearOptions.map(y => (
                            <option key={y} value={y}>
                              سنة {y} {y === currentYear - 1 ? '(آخر سنة منتهية)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 700 }}>تاريخ الاستلام من العميل</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="date"
                            className="input"
                            value={row.date_received}
                            onChange={e => handleRowChange(row.rowId, 'date_received', e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRowChange(row.rowId, 'date_received', new Date().toISOString().slice(0, 10))}
                            className="btn btn-ghost"
                            style={{ padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                          >
                            اليوم
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dual Delivery Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                      
                      {/* Taxes Delivery Switch */}
                      <div style={{
                        background: row.tax_submitted ? 'rgba(16, 185, 129, 0.06)' : 'var(--surface)',
                        border: `1px solid ${row.tax_submitted ? 'rgba(16, 185, 129, 0.3)' : 'var(--line-soft)'}`,
                        borderRadius: 'var(--r-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={row.tax_submitted}
                            onChange={e => handleRowChange(row.rowId, 'tax_submitted', e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                              تم التسليم للضرائب 🏛️
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                              المهلة: 31/07/{row.year + 1}
                            </div>
                          </div>
                        </label>

                        {row.tax_submitted && (
                          <div className="field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-2)' }}>تاريخ التسليم للضرائب</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input
                                type="date"
                                className="input"
                                value={row.date_submitted_tax}
                                onChange={e => handleRowChange(row.rowId, 'date_submitted_tax', e.target.value)}
                                style={{ flex: 1, height: '36px', fontSize: '13px' }}
                                required={row.tax_submitted}
                              />
                              <button
                                type="button"
                                onClick={() => handleRowChange(row.rowId, 'date_submitted_tax', new Date().toISOString().slice(0, 10))}
                                className="btn btn-ghost"
                                style={{ padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                              >
                                اليوم
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Registrar Delivery Switch */}
                      <div style={{
                        background: row.registrar_submitted ? 'rgba(59, 130, 246, 0.06)' : 'var(--surface)',
                        border: `1px solid ${row.registrar_submitted ? 'rgba(59, 130, 246, 0.3)' : 'var(--line-soft)'}`,
                        borderRadius: 'var(--r-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={row.registrar_submitted}
                            onChange={e => handleRowChange(row.rowId, 'registrar_submitted', e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                              تم التسليم لمسجل الشركات 🏢
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                              المهلة: 07/10/{row.year + 1}
                            </div>
                          </div>
                        </label>

                        {row.registrar_submitted && (
                          <div className="field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-2)' }}>تاريخ التسليم لمسجل الشركات</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input
                                type="date"
                                className="input"
                                value={row.date_submitted_registrar}
                                onChange={e => handleRowChange(row.rowId, 'date_submitted_registrar', e.target.value)}
                                style={{ flex: 1, height: '36px', fontSize: '13px' }}
                                required={row.registrar_submitted}
                              />
                              <button
                                type="button"
                                onClick={() => handleRowChange(row.rowId, 'date_submitted_registrar', new Date().toISOString().slice(0, 10))}
                                className="btn btn-ghost"
                                style={{ padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                              >
                                اليوم
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="field">
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>ملاحظات إضافية (اختياري)</label>
                      <input
                        type="text"
                        className="input"
                        value={row.notes}
                        onChange={e => handleRowChange(row.rowId, 'notes', e.target.value)}
                        placeholder="أية ملاحظات خاصة بالميزانية..."
                      />
                    </div>
                  </div>
                ))}

                {/* Bottom Add Another Year Button */}
                <button
                  type="button"
                  onClick={handleAddRow}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 'var(--r-md)',
                    border: '1px dashed var(--accent)',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon name="plus" />
                  <span>إضافة سنة مالية أخرى</span>
                </button>
              </div>
            )}
          </div>

          {/* Sticky Fixed Footer */}
          <div className="modal-foot" style={{ flex: 'none', borderTop: '1px solid var(--line-soft)', padding: '14px 20px', background: 'var(--surface-2)' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 24px' }}>
              {loading ? 'جاري الحفظ...' : editingStatement ? 'حفظ التعديلات' : `حفظ الحسابات الختامية (${editingStatement ? 1 : rows.length} سنوات)`}
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
