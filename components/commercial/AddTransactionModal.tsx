'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { TX_TYPES, formatNumberWithCommas } from '@/lib/constants'
import { createTransactionAction } from '@/app/(app)/commercial/actions'
import { getActiveLawyersAction } from '@/app/(app)/settings/users/actions'
import type { Company } from '@/types/database'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'

interface Props {
  isOpen: boolean
  onClose: () => void
  companies: Company[]
  lawyers?: Array<{ id: string; name: string }>
}

export default function AddTransactionModal({ isOpen, onClose, companies, lawyers: initialLawyers }: Props) {
  useModalBodyLock(isOpen)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [activeLawyers, setActiveLawyers] = useState<Array<{ id: string; name: string }>>(
    initialLawyers && initialLawyers.length > 0 ? initialLawyers : [{ id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي' }]
  )

  useEffect(() => {
    async function load() {
      const res = await getActiveLawyersAction()
      if (res.success && res.data && res.data.length > 0) {
        setActiveLawyers(res.data)
      }
    }
    load()
  }, [])

  // Dual Company Selection State
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companySearch, setCompanySearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setSelectedCompany(null)
    setCompanySearch('')
    setAmount('')
    setIsDropdownOpen(false)
    setError(null)
  }, [isOpen])

  useModalBodyLock(isOpen, onClose)

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const type = formData.get('type')?.toString().trim()
    const finalCompanyName = companySearch.trim() || selectedCompany?.name || ''

    if (!finalCompanyName) {
      setError('يرجى اختيار شركة أو كتابة اسم الشركة يدوياً (إلزامي)')
      setLoading(false)
      return
    }

    if (!type) {
      setError('يرجى اختيار نوع الخدمة/المعاملة (إلزامي)')
      setLoading(false)
      return
    }

    const lawyer_id = formData.get('lawyer_id')?.toString().trim()
    if (!lawyer_id) {
      setError('المحامي المكلّف / المسؤول مطلوب (إلزامي)')
      setLoading(false)
      return
    }

    // Pass company_id or company_name
    if (selectedCompany?.id) {
      formData.set('company_id', selectedCompany.id)
    } else {
      formData.set('company_name', finalCompanyName)
    }

    const res = await createTransactionAction(formData)

    setLoading(false)
    if (res.success) {
      toast.success('تمت إضافة المعاملة بنجاح')
      onClose()
    } else {
      setError(res.error || 'حدث خطأ أثناء حفظ المعاملة')
    }
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-md, 640px)' } as React.CSSProperties}>
        
        {/* Head */}
        <div className="modal-head">
          <div className="co-ico" style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <Icon name="brief" />
          </div>
          <h3>أضف معاملة تجارية جديدة</h3>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            <Icon name="x" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div className="login-err" style={{ marginBottom: 0 }}>
                {error}
              </div>
            )}

            {/* Dual Searchable Company Input */}
            <div className="field" style={{ position: 'relative', width: '100%' }} ref={autocompleteRef}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label htmlFor="tx-co-search" style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
                  الشركة المرتبطة (اختيار مسجلة أو كتابة يدوية) <span style={{ color: 'var(--bad)' }}>*</span>
                </label>
                {selectedCompany ? (
                  <span style={{ fontSize: '11.5px', color: 'var(--ok)', fontWeight: 700 }}>
                    ✓ شركة مسجلة
                  </span>
                ) : companySearch.trim() ? (
                  <span style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 700 }}>
                    ✎ كتابة يدوية
                  </span>
                ) : null}
              </div>

              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="tx-co-search"
                  type="text"
                  className="input"
                  style={{ width: '100%', minHeight: '44px', fontSize: '14px', padding: '10px 14px' }}
                  value={companySearch}
                  onChange={e => {
                    setCompanySearch(e.target.value)
                    setSelectedCompany(null)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="ابحث عن شركة مسجلة أو اكتب اسم الشركة يدوياً..."
                  autoComplete="off"
                  required
                />
              </div>

              {isDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    maxHeight: '180px',
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

            <div className="field">
              <label htmlFor="tx-type">نوع الخدمة / المعاملة <span style={{ color: 'var(--bad)' }}>* (إلزامي)</span></label>
              <select id="tx-type" name="type" className="input" defaultValue="formation" required>
                {TX_TYPES.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="tx-priority">الأولوية</label>
                <select id="tx-priority" name="priority" className="input" defaultValue="medium">
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="tx-lawyer" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  المحامي المكلّف / المسؤول *
                </label>
                <select id="tx-lawyer" name="lawyer_id" className="input" required defaultValue={activeLawyers[0]?.id || ''}>
                  <option value="" disabled>اختر المحامي المسؤول...</option>
                  {activeLawyers.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="tx-fee">المبلغ / الأتعاب (د.ع)</label>
                <input
                  id="tx-fee"
                  name="amount"
                  type="text"
                  className="input num"
                  value={amount}
                  onChange={e => setAmount(formatNumberWithCommas(e.target.value))}
                  placeholder="250,000"
                />
              </div>

              <div className="field">
                <label htmlFor="tx-client-phone">رقم هاتف المتابعة</label>
                <input
                  id="tx-client-phone"
                  name="client_phone"
                  type="text"
                  className="input num"
                  placeholder="0770XXXXXXX"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="tx-desc">الوصف والتعليقات</label>
              <textarea
                id="tx-desc"
                name="description"
                rows={3}
                className="input"
                placeholder="تفاصيل إضافية عن المعاملة والمستندات..."
              />
            </div>
          </div>

          {/* Foot */}
          <div className="modal-foot">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ المعاملة'}
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
