'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import { createLLCTransactionAction } from '@/app/(app)/commercial/llc/actions'
import type { Company } from '@/types/database'

interface Props {
  isOpen: boolean
  onClose: () => void
  companies: Company[]
  initialType?: string
  lawyers?: Array<{ id: string; name: string }>
  onSuccess?: () => void
}

export const LLC_TX_TYPES = [
  { id: 'capital-up', label: 'زيادة رأس المال' },
  { id: 'share-sale', label: 'بيع أسهم' },
  { id: 'certify', label: 'تصديق الأوراق' },
  { id: 'mgr-renew', label: 'استمرار تعيين مدير مفوض' },
  { id: 'activity', label: 'إضافة وحذف نشاط' },
  { id: 'relocation', label: 'نقل مقر' },
  { id: 'final-acc', label: 'الحسابات الختامية' },
]

export default function AddLLCTransactionModal({
  isOpen,
  onClose,
  companies = [],
  initialType = 'capital-up',
  lawyers = [],
  onSuccess,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [txType, setTxType] = useState(initialType)

  // Dual Company Selection State
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companySearch, setCompanySearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Transaction Fields
  const [managerName, setManagerName] = useState('')
  const [txStartDate, setTxStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [lacks, setLacks] = useState('')
  const [notes, setNotes] = useState('')
  const [fee, setFee] = useState('')
  const [phone, setPhone] = useState('')
  const [priority, setPriority] = useState('medium')
  const [lawyerId, setLawyerId] = useState('')

  // Specialized Fields for Capital Up & Share Sale
  const [capitalBefore, setCapitalBefore] = useState('')
  const [capitalAfter, setCapitalAfter] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [buyerName, setBuyerName] = useState('')

  const autocompleteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setTxType(initialType)
    setSelectedCompany(null)
    setCompanySearch('')
    setManagerName('')
    setTxStartDate(new Date().toISOString().slice(0, 10))
    setLacks('')
    setNotes('')
    setFee('')
    setPhone('')
    setPriority('medium')
    setLawyerId('')
    setCapitalBefore('')
    setCapitalAfter('')
    setSellerName('')
    setBuyerName('')
    setError(null)
  }, [isOpen, initialType])

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
      setError('يرجى اختيار شركة مسجلة أو كتابة اسم الشركة يدوياً')
      return
    }

    setLoading(true)
    setError(null)

    const feeNum = parseFloat(fee.replace(/[^0-9.]/g, '')) || undefined
    const capBeforeNum = parseFloat(capitalBefore.replace(/[^0-9.]/g, '')) || undefined
    const capAfterNum = parseFloat(capitalAfter.replace(/[^0-9.]/g, '')) || undefined

    const res = await createLLCTransactionAction({
      type: txType,
      company_id: selectedCompany?.id,
      company_name: finalCompanyName,
      manager_name: managerName.trim() || undefined,
      tx_date: txStartDate,
      lacks: lacks.trim() || undefined,
      notes: notes.trim() || undefined,
      fee: feeNum,
      phone: phone.trim() || undefined,
      priority,
      lawyer_id: lawyerId || undefined,
      capital_before: capBeforeNum,
      capital_after: capAfterNum,
      seller_name: sellerName.trim() || undefined,
      buyer_name: buyerName.trim() || undefined,
    })

    setLoading(false)

    if (res.success) {
      if (onSuccess) onSuccess()
      onClose()
    } else {
      setError(res.error || 'حدث خطأ أثناء حفظ المعاملة')
    }
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div
        className="modal"
        style={{
          '--modal-max-w': 'var(--modal-md, 640px)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        } as React.CSSProperties}
      >
        {/* Head */}
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
            <h3 style={{ margin: 0, fontSize: '16px' }}>معاملة جديدة — قسم المحدودة</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              إدراج معاملة للشركات المحدودة مع إمكانية ربط شركة مسجلة أو إدخال يدوي
            </span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div
            className="modal-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto',
              padding: '20px',
            }}
          >
            {error && (
              <div className="login-err" style={{ marginBottom: 0 }}>
                {error}
              </div>
            )}

            {/* 1. نوع المعاملة (جميع معاملات المحدودة) */}
            <div className="field">
              <label htmlFor="llc-tx-type">نوع المعاملة *</label>
              <select
                id="llc-tx-type"
                className="input"
                value={txType}
                onChange={e => setTxType(e.target.value)}
                required
              >
                {LLC_TX_TYPES.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. اسم الشركة (اختيار من المسجلة أو كتابة يدوية) */}
            <div className="field" style={{ position: 'relative', width: '100%' }} ref={autocompleteRef}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label htmlFor="llc-co-search" style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
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
                  id="llc-co-search"
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

              {/* Autocomplete Dropdown */}
              {isDropdownOpen && (
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
                        if (c.phone) setPhone(c.phone)
                        if (c.capital) setCapitalBefore(c.capital.toString())
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

            {/* Specialized Section for Capital Up (زيادة رأس المال) */}
            {txType === 'capital-up' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '14px',
                  borderRadius: 'var(--r-md)',
                }}
              >
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="llc-cap-before" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    💰 رأس المال القديم (السابق)
                  </label>
                  <input
                    id="llc-cap-before"
                    type="text"
                    className="input num"
                    value={capitalBefore}
                    onChange={e => setCapitalBefore(e.target.value)}
                    placeholder="مثال: 1,000,000"
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="llc-cap-after" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    📈 رأس المال بعد الزيادة (الجديد) *
                  </label>
                  <input
                    id="llc-cap-after"
                    type="text"
                    className="input num"
                    value={capitalAfter}
                    onChange={e => setCapitalAfter(e.target.value)}
                    placeholder="مثال: 5,000,000"
                  />
                </div>
              </div>
            )}

            {/* Specialized Section for Share Sale (بيع أسهم) */}
            {txType === 'share-sale' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: 'rgba(249, 115, 22, 0.08)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  padding: '14px',
                  borderRadius: 'var(--r-md)',
                }}
              >
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="llc-seller-name" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    👤 اسم البائع (المتنازل) *
                  </label>
                  <input
                    id="llc-seller-name"
                    type="text"
                    className="input"
                    value={sellerName}
                    onChange={e => setSellerName(e.target.value)}
                    placeholder="اسم بائع الأسهم..."
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="llc-buyer-name" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    🤝 اسم المشتري (المتنازل له) *
                  </label>
                  <input
                    id="llc-buyer-name"
                    type="text"
                    className="input"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    placeholder="اسم مشتري الأسهم..."
                  />
                </div>
              </div>
            )}

            {/* 3. اسم المدير المفوض وتاريخ البدء بالتكليف */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="llc-mgr-name">اسم المدير المفوض</label>
                <input
                  id="llc-mgr-name"
                  type="text"
                  className="input"
                  value={managerName}
                  onChange={e => setManagerName(e.target.value)}
                  placeholder="اسم المدير المفوض..."
                />
              </div>

              <div className="field">
                <label htmlFor="llc-start-date">تاريخ البدء بالتكليف *</label>
                <input
                  id="llc-start-date"
                  type="date"
                  className="input"
                  value={txStartDate}
                  onChange={e => setTxStartDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 4. حقل النواقص */}
            <div className="field">
              <label htmlFor="llc-lacks" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined text-[16px] text-amber-500">warning</span>
                <span>النواقص والمستندات المطلوبة (إن وجدت)</span>
              </label>
              <textarea
                id="llc-lacks"
                className="input"
                rows={2}
                value={lacks}
                onChange={e => setLacks(e.target.value)}
                placeholder="اكتب النواقص أو المتطلبات الناقصة للمعاملة (مثال: محضر الاجتماع، كتاب المصرف، براءة الذمة...)"
              />
            </div>

            {/* 5. حقل الملاحظات */}
            <div className="field">
              <label htmlFor="llc-notes">ملاحظات وتفاصيل المعاملة</label>
              <textarea
                id="llc-notes"
                className="input"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تفاصيل إضافية عن المعاملة والتكليف..."
              />
            </div>

            {/* 6. الأتعاب، الهاتف والمحامي المكلف (اختياري) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-soft)' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="llc-fee" style={{ fontSize: '11.5px' }}>المبلغ / الأتعاب (د.ع)</label>
                <input
                  id="llc-fee"
                  type="text"
                  className="input num"
                  value={fee}
                  onChange={e => setFee(e.target.value)}
                  placeholder="250,000"
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="llc-phone" style={{ fontSize: '11.5px' }}>هاتف المتابعة</label>
                <input
                  id="llc-phone"
                  type="text"
                  className="input num"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0770XXXXXXX"
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="llc-priority" style={{ fontSize: '11.5px' }}>الأولوية</label>
                <select
                  id="llc-priority"
                  className="input"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>

              {lawyers.length > 0 && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="llc-lawyer" style={{ fontSize: '11.5px' }}>المحامي المكلف</label>
                  <select
                    id="llc-lawyer"
                    className="input"
                    value={lawyerId}
                    onChange={e => setLawyerId(e.target.value)}
                  >
                    <option value="">غير معين</option>
                    {lawyers.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
