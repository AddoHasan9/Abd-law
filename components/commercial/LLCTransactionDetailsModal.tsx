'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import { formatNumberWithCommas } from '@/lib/constants'
import { updateLLCTransactionAction } from '@/app/(app)/commercial/llc/actions'
import { deleteTransactionAction } from '@/app/(app)/commercial/actions'
import { LLC_TX_TYPES } from './AddLLCTransactionModal'
import { WORKFLOW_STATUS_LIST } from '@/lib/workflow-status'
import type { TransactionFull, Company } from '@/types/database'

interface Props {
  isOpen: boolean
  onClose: () => void
  transaction: TransactionFull | null
  companies?: Company[]
  lawyers?: Array<{ id: string; name: string }>
  onUpdated?: () => void
  onDeleted?: (txId: string) => void
}

export default function LLCTransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  lawyers = [],
  onUpdated,
  onDeleted,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form Fields
  const [txType, setTxType] = useState('capital-up')
  const [companyName, setCompanyName] = useState('')
  const [managerName, setManagerName] = useState('')
  const [status, setStatus] = useState('new')
  const [txStartDate, setTxStartDate] = useState('')
  const [lacks, setLacks] = useState('')
  const [notes, setNotes] = useState('')
  const [fee, setFee] = useState('')
  const [phone, setPhone] = useState('')
  const [priority, setPriority] = useState('medium')
  const [lawyerId, setLawyerId] = useState('')

  // Specialized Fields
  const [capitalBefore, setCapitalBefore] = useState('')
  const [capitalAfter, setCapitalAfter] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [buyerName, setBuyerName] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen || !transaction) return
    setTxType(transaction.type || 'capital-up')
    setCompanyName(transaction.companies?.name || '')
    setManagerName(transaction.companies?.manager || '')
    setStatus(transaction.status || 'new')
    setTxStartDate(transaction.tx_date || '')
    setLacks(transaction.lacks || '')
    setNotes(transaction.description || '')
    setFee(transaction.fee ? formatNumberWithCommas(transaction.fee) : '')
    setPhone(transaction.phone || '')
    setPriority(transaction.priority || 'medium')
    setLawyerId(transaction.lawyer_id || '')
    setCapitalBefore(transaction.capital_before !== undefined && transaction.capital_before !== null ? formatNumberWithCommas(transaction.capital_before) : '')
    setCapitalAfter(transaction.capital_after !== undefined && transaction.capital_after !== null ? formatNumberWithCommas(transaction.capital_after) : '')
    setSellerName(transaction.seller_name || '')
    setBuyerName(transaction.buyer_name || '')
    setError(null)
  }, [isOpen, transaction])

  useModalBodyLock(isOpen)

  if (!mounted || !isOpen || !transaction) return null

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lawyerId) {
      setError('المحامي المكلّف / المسؤول مطلوب (إلزامي)')
      return
    }

    setLoading(true)
    setError(null)

    const feeNum = fee ? parseFloat(fee.replace(/[^0-9.]/g, '')) : undefined
    const capBeforeNum = capitalBefore ? parseFloat(capitalBefore.replace(/[^0-9.]/g, '')) : null
    const capAfterNum = capitalAfter ? parseFloat(capitalAfter.replace(/[^0-9.]/g, '')) : null

    const res = await updateLLCTransactionAction({
      id: transaction.id,
      type: txType,
      company_id: transaction.company_id || undefined,
      company_name: companyName.trim() || undefined,
      manager_name: managerName.trim() || undefined,
      status,
      tx_date: txStartDate,
      lacks: lacks.trim() || '',
      notes: notes.trim() || '',
      fee: feeNum,
      phone: phone.trim() || '',
      priority,
      lawyer_id: lawyerId,
      capital_before: capBeforeNum,
      capital_after: capAfterNum,
      seller_name: sellerName.trim() || null,
      buyer_name: buyerName.trim() || null,
    })

    setLoading(false)

    if (res.success) {
      if (onUpdated) onUpdated()
      onClose()
    } else {
      setError(res.error || 'فشل تحديث المعاملة')
    }
  }

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذه المعاملة نهائياً؟')) return
    setDeleting(true)
    await deleteTransactionAction(transaction.id)
    setDeleting(false)
    if (onDeleted) onDeleted(transaction.id)
    onClose()
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div
        className="modal"
        style={{
          '--modal-max-w': 'var(--modal-lg, 780px)',
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
            <h3 style={{ margin: 0, fontSize: '16px' }}>
              تفاصيل وتعديل المعاملة: {companyName || 'شركة محدودة'}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              تعديل تفاصيل المعاملة، الحالة، النواقص والبيانات المخصصة
            </span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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

            {/* Row 1: Company Name & 360 link */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="edit-co-name">اسم الشركة *</label>
                <input
                  id="edit-co-name"
                  type="text"
                  className="input"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                />
              </div>

              {transaction.company_id && (
                <Link
                  href={`/commercial/companies/${transaction.company_id}`}
                  className="btn btn-ghost"
                  style={{ fontSize: '12.5px', padding: '9px 14px', whiteSpace: 'nowrap' }}
                  title="فتح ملف الشركة الشامل"
                >
                  <span>ملف 360°</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_left</span>
                </Link>
              )}
            </div>

            {/* Row 2: Transaction Type & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="edit-tx-type">نوع المعاملة *</label>
                <select
                  id="edit-tx-type"
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

              <div className="field">
                <label htmlFor="edit-tx-status">حالة سير العمل *</label>
                <select
                  id="edit-tx-status"
                  className="input"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  required
                >
                  {WORKFLOW_STATUS_LIST.map(st => (
                    <option key={st.key} value={st.key}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
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
                  <label htmlFor="edit-cap-before" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    💰 رأس المال القديم (السابق)
                  </label>
                  <input
                    id="edit-cap-before"
                    type="text"
                    className="input num"
                    value={capitalBefore}
                    onChange={e => setCapitalBefore(formatNumberWithCommas(e.target.value))}
                    placeholder="مثال: 1,000,000"
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="edit-cap-after" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    📈 رأس المال بعد الزيادة (الجديد)
                  </label>
                  <input
                    id="edit-cap-after"
                    type="text"
                    className="input num"
                    value={capitalAfter}
                    onChange={e => setCapitalAfter(formatNumberWithCommas(e.target.value))}
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
                  <label htmlFor="edit-seller-name" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    👤 اسم البائع (المتنازل)
                  </label>
                  <input
                    id="edit-seller-name"
                    type="text"
                    className="input"
                    value={sellerName}
                    onChange={e => setSellerName(e.target.value)}
                    placeholder="اسم بائع الأسهم..."
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="edit-buyer-name" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    🤝 اسم المشتري (المتنازل له)
                  </label>
                  <input
                    id="edit-buyer-name"
                    type="text"
                    className="input"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    placeholder="اسم مشتري الأسهم..."
                  />
                </div>
              </div>
            )}

            {/* Row 3: Manager & Start Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="edit-mgr-name">المدير المفوض</label>
                <input
                  id="edit-mgr-name"
                  type="text"
                  className="input"
                  value={managerName}
                  onChange={e => setManagerName(e.target.value)}
                  placeholder="اسم المدير المفوض..."
                />
              </div>

              <div className="field">
                <label htmlFor="edit-tx-date">تاريخ البدء بالتكليف</label>
                <input
                  id="edit-tx-date"
                  type="date"
                  className="input"
                  value={txStartDate}
                  onChange={e => setTxStartDate(e.target.value)}
                />
              </div>
            </div>

            {/* Row 4: Lacks */}
            <div className="field">
              <label htmlFor="edit-lacks" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined text-[16px] text-amber-500">warning</span>
                <span>النواقص والمستندات المطلوبة</span>
              </label>
              <textarea
                id="edit-lacks"
                className="input"
                rows={2}
                value={lacks}
                onChange={e => setLacks(e.target.value)}
                placeholder="اكتب النواقص والمستندات المطلوبة للمعاملة..."
              />
            </div>

            {/* Row 5: Notes */}
            <div className="field">
              <label htmlFor="edit-notes">ملاحظات وتفاصيل المعاملة</label>
              <textarea
                id="edit-notes"
                className="input"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تفاصيل إضافية عن المعاملة..."
              />
            </div>

            {/* Row 6: Fee, Phone, Priority, Lawyer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-soft)' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="edit-fee" style={{ fontSize: '11.5px' }}>المبلغ / الأتعاب (د.ع)</label>
                <input
                  id="edit-fee"
                  type="text"
                  className="input num"
                  value={fee}
                  onChange={e => setFee(formatNumberWithCommas(e.target.value))}
                  placeholder="250,000"
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="edit-phone" style={{ fontSize: '11.5px' }}>هاتف المتابعة</label>
                <input
                  id="edit-phone"
                  type="text"
                  className="input num"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0770XXXXXXX"
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="edit-priority" style={{ fontSize: '11.5px' }}>الأولوية</label>
                <select
                  id="edit-priority"
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

              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="edit-lawyer" style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent)' }}>
                  المحامي المكلّف / المسؤول *
                </label>
                <select
                  id="edit-lawyer"
                  className="input"
                  value={lawyerId}
                  onChange={e => setLawyerId(e.target.value)}
                  required
                >
                  <option value="">اختر المحامي المسؤول...</option>
                  {(lawyers.length > 0 ? lawyers : [
                    { id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي' },
                  ]).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Foot */}
          <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading || deleting}>
                {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading || deleting}>
                إلغاء
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={loading || deleting}
              style={{ fontSize: '12.5px', padding: '8px 14px' }}
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>{deleting ? 'جاري الحذف...' : 'حذف المعاملة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
