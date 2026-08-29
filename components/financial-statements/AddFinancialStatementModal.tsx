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
  date_submitted: string
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
  const [editDateSubmitted, setEditDateSubmitted] = useState('')
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
      setEditDateSubmitted(editingStatement.date_submitted || '')
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
          date_submitted: '',
          notes: '',
        },
      ])
    }
  }, [editingStatement, initialCompanyId, isOpen, companies, loadedCompanies, currentYear])

  useModalBodyLock(isOpen)

  if (!mounted || !isOpen) return null

  const availableCompanies = loadedCompanies.length > 0 ? loadedCompanies : companies

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
        date_submitted: '',
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
  const handleRowChange = (rowId: string, field: keyof DynamicYearRow, value: string | number) => {
    setRows(prev =>
      prev.map(r => (r.rowId === rowId ? { ...r, [field]: value } : r))
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
        date_submitted: editDateSubmitted,
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
          date_submitted: r.date_submitted,
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

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-lg, 780px)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' } as React.CSSProperties}>
        {/* Head */}
        <div className="modal-head" style={{ flex: 'none' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="doc" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0 }}>{editingStatement ? 'تعديل الحسابات الختامية' : 'إضافة حسابات ختامية'}</h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
              {editingStatement ? `تعديل سجّل الميزانية لسنة ${editingStatement.year}` : 'ابحث عن الشركة المسجلة ثم أضف الميزانيات والسنوات المطلوبة'}
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

            {/* Legal Rule Banner */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] flex-none">info</span>
              <span>
                الموعد القانوني لتقديم الحسابات الختامية هو <strong>7/10 من كل سنة</strong>
              </span>
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
                  style={{ width: '100%', height: '40px', fontSize: '13.5px' }}
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
                          e.preventDefault() // Prevents blur before click
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
                  border: '1px solid var(--line-soft)',
                  borderRadius: 'var(--r-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
                  تعديل الحسابات الختامية لسنة {editYear}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <div className="field">
                    <label htmlFor="edit-fs-year">سنة الحسابات الختامية *</label>
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
                    <label htmlFor="edit-fs-rec">تاريخ استلام المستندات (من العميل)</label>
                    <input
                      id="edit-fs-rec"
                      type="date"
                      className="input"
                      value={editDateReceived}
                      onChange={e => setEditDateReceived(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="edit-fs-sub">تاريخ التقديم في النظام الحكومي</label>
                    <input
                      id="edit-fs-sub"
                      type="date"
                      className="input"
                      value={editDateSubmitted}
                      onChange={e => setEditDateSubmitted(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="edit-fs-notes">ملاحظات إضافية (اختياري)</label>
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
                      borderRadius: 'var(--r-md)',
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
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
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

                    {/* Balanced 2-Column Responsive Field Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>سنة الميزانية *</label>
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
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>تاريخ الاستلام من العميل</label>
                        <input
                          type="date"
                          className="input"
                          value={row.date_received}
                          onChange={e => handleRowChange(row.rowId, 'date_received', e.target.value)}
                        />
                      </div>

                      <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>تاريخ التقديم في النظام الحكومي</label>
                        <input
                          type="date"
                          className="input"
                          value={row.date_submitted}
                          onChange={e => handleRowChange(row.rowId, 'date_submitted', e.target.value)}
                        />
                      </div>

                      <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>ملاحظات إضافية (اختياري)</label>
                        <input
                          type="text"
                          className="input"
                          value={row.notes}
                          onChange={e => handleRowChange(row.rowId, 'notes', e.target.value)}
                          placeholder="أية ملاحظات خاصة بالميزانية..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Bottom Add Another Year Button */}
                <button
                  type="button"
                  onClick={handleAddRow}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--r-md)',
                    border: '1px dashed var(--accent)',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                    fontSize: '13px',
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
