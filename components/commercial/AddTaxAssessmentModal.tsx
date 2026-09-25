'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import { formatNumberWithCommas } from '@/lib/constants'
import { createTaxAssessmentAction, updateTaxAssessmentAction } from '@/app/(app)/commercial/tax-assessment/actions'
import { getActiveLawyersAction } from '@/app/(app)/settings/users/actions'
import type { Company, TaxAssessment } from '@/types/database'

interface Props {
  isOpen: boolean
  onClose: () => void
  companies: Company[]
  lawyers?: Array<{ id: string; name: string }>
  initialCompanyId?: string
  editingAssessment?: TaxAssessment | null
  onSuccess?: () => void
}

const TAX_BRANCHES = [
  'قسم الشركات',
  'قسم كبار المكلفين',
]

export default function AddTaxAssessmentModal({
  isOpen,
  onClose,
  companies = [],
  lawyers: initialLawyers = [],
  initialCompanyId,
  editingAssessment,
  onSuccess,
}: Props) {
  useModalBodyLock(isOpen)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lawyers, setLawyers] = useState<Array<{ id: string; name: string }>>(
    initialLawyers.length > 0 ? initialLawyers : [{ id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي' }]
  )

  useEffect(() => {
    setMounted(true)
    async function load() {
      const res = await getActiveLawyersAction()
      if (res.success && res.data && res.data.length > 0) {
        setLawyers(res.data)
      }
    }
    load()
  }, [])

  const currentYear = new Date().getFullYear()
  const defaultYear = currentYear - 1 // 2025

  const [companyId, setCompanyId] = useState(initialCompanyId || '')
  const [year, setYear] = useState<number>(defaultYear)
  const [taxBranch, setTaxBranch] = useState('قسم الشركات')
  const [taxFileNumber, setTaxFileNumber] = useState('')
  const [contractsInfo, setContractsInfo] = useState('')
  const [contractsAmount, setContractsAmount] = useState('')
  const [importsInfo, setImportsInfo] = useState('')
  const [importsAmount, setImportsAmount] = useState('')
  const [lawyerId, setLawyerId] = useState('')
  const [txStartDate, setTxStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<'in_progress' | 'auditing' | 'assessed' | 'tax_cleared'>('in_progress')
  const [taxAmountAssessed, setTaxAmountAssessed] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [clearanceLetterNo, setClearanceLetterNo] = useState('')
  const [clearanceDate, setClearanceDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (editingAssessment) {
      setCompanyId(editingAssessment.company_id)
      setYear(editingAssessment.year)
      setTaxBranch(editingAssessment.tax_branch || 'قسم الشركات')
      setTaxFileNumber(editingAssessment.tax_file_number || '')
      setContractsInfo(editingAssessment.contracts_info || '')
      setContractsAmount(editingAssessment.contracts_amount ? formatNumberWithCommas(editingAssessment.contracts_amount) : '')
      setImportsInfo(editingAssessment.imports_info || '')
      setImportsAmount(editingAssessment.imports_amount ? formatNumberWithCommas(editingAssessment.imports_amount) : '')
      setLawyerId(editingAssessment.lawyer_id || '')
      setTxStartDate(editingAssessment.tx_start_date || new Date().toISOString().slice(0, 10))
      setStatus(editingAssessment.status || 'in_progress')
      setTaxAmountAssessed(editingAssessment.tax_amount_assessed ? formatNumberWithCommas(editingAssessment.tax_amount_assessed) : '')
      setReceiptNumber(editingAssessment.receipt_number || '')
      setClearanceLetterNo(editingAssessment.clearance_letter_no || '')
      setClearanceDate(editingAssessment.clearance_date || '')
      setNotes(editingAssessment.notes || '')
    } else {
      setCompanyId(initialCompanyId || (companies[0]?.id || ''))
      setYear(defaultYear)
      setTaxBranch('قسم الشركات')
      setTaxFileNumber('')
      setContractsInfo('')
      setContractsAmount('')
      setImportsInfo('')
      setImportsAmount('')
      setLawyerId(lawyers[0]?.id || '')
      setTxStartDate(new Date().toISOString().slice(0, 10))
      setStatus('in_progress')
      setTaxAmountAssessed('')
      setReceiptNumber('')
      setClearanceLetterNo('')
      setClearanceDate('')
      setNotes('')
    }
    setError(null)
  }, [editingAssessment, initialCompanyId, isOpen, companies, lawyers, defaultYear])

  // When company changes, auto fill tax file number if available
  useEffect(() => {
    if (companyId && !editingAssessment) {
      const co = companies.find(c => c.id === companyId)
      if (co?.tax_no) {
        setTaxFileNumber(co.tax_no)
      }
    }
  }, [companyId, companies, editingAssessment])

  useModalBodyLock(isOpen)

  if (!mounted || !isOpen) return null

  // Generate Year Options starting from 2025 (defaultYear) backwards: 2025, 2024, 2023, 2022...
  const yearOptions: number[] = []
  for (let y = defaultYear; y >= defaultYear - 10; y--) {
    yearOptions.push(y)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) {
      setError('يرجى اختيار الشركة من القائمة')
      return
    }

    if (!lawyerId) {
      setError('المحامي المكلّف / المسؤول مطلوب (إلزامي)')
      return
    }

    setLoading(true)
    setError(null)

    const selectedLawyer = lawyers.find(l => l.id === lawyerId)
    const lawyerName = selectedLawyer?.name || (lawyerId ? 'المحامي المكلف' : undefined)
    const selectedCo = companies.find(c => c.id === companyId)

    const payload = {
      company_id: companyId,
      company_name: selectedCo?.name || undefined,
      year: Number(year),
      tax_branch: taxBranch,
      tax_file_number: taxFileNumber,
      contracts_info: contractsInfo,
      contracts_amount: contractsAmount ? parseFloat(contractsAmount.replace(/[^0-9.]/g, '')) : undefined,
      imports_info: importsInfo,
      imports_amount: importsAmount ? parseFloat(importsAmount.replace(/[^0-9.]/g, '')) : undefined,
      lawyer_id: lawyerId || undefined,
      assigned_lawyer_name: lawyerName,
      tx_start_date: txStartDate,
      status,
      tax_amount_assessed: taxAmountAssessed ? parseFloat(taxAmountAssessed.replace(/[^0-9.]/g, '')) : undefined,
      receipt_number: receiptNumber,
      clearance_letter_no: clearanceLetterNo,
      clearance_date: clearanceDate || undefined,
      notes,
    }

    let res
    if (editingAssessment) {
      res = await updateTaxAssessmentAction(editingAssessment.id, payload)
    } else {
      res = await createTaxAssessmentAction(payload)
    }

    setLoading(false)
    if (res.success) {
      toast.success('تم حفظ ملف التحاسب الضريبي')
      onSuccess?.()
      onClose()
    } else {
      setError(res.error || 'حدث خطأ أثناء حفظ التحاسب الضريبي')
    }
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-lg, 780px)' } as React.CSSProperties}>
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
              flexShrink: 0,
            }}
          >
            <Icon name="doc" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
              {editingAssessment ? 'تعديل ملف التحاسب الضريبي' : 'فتح وإضافة ملف تحاسب ضريبي جديد'}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              متابعة التحاسب عن العقود والاستيرادات وإصدار براءة الذمة الضريبية
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

            {/* 1. Company Selection (Strictly Registered Companies) */}
            <div className="field">
              <label>
                الشركة المعنية (الشركات المدرجة بالنظام) <span style={{ color: 'var(--bad)' }}>*</span>
              </label>
              <select
                value={companyId}
                onChange={e => setCompanyId(e.target.value)}
                className="input"
                required
                disabled={!!editingAssessment}
              >
                <option value="">-- اختر الشركة --</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.kind ? `(${c.kind})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Assessment Year & Start Date Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label>
                  سنة التحاسب الضريبي <span style={{ color: 'var(--bad)' }}>*</span>
                </label>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="input num"
                  style={{ fontWeight: 700, color: 'var(--accent)' }}
                  required
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>
                      سنة {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>
                  تاريخ بدء المهمة والمراجعة <span style={{ color: 'var(--bad)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={txStartDate}
                  onChange={e => setTxStartDate(e.target.value)}
                  className="input num"
                  required
                />
              </div>
            </div>

            {/* 3. Lawyer & Tax Branch Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label>
                  المحامي المكلّف بمتابعة التحاسب <span style={{ color: 'var(--bad)' }}>*</span>
                </label>
                <select
                  value={lawyerId}
                  onChange={e => setLawyerId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">اختر المحامي المسؤول...</option>
                  {(lawyers.length > 0 ? lawyers : [
                    { id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي' },
                  ]).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>الفرع الضريبي (الهيئة العامة للضرائب)</label>
                <select
                  value={taxBranch}
                  onChange={e => setTaxBranch(e.target.value)}
                  className="input"
                >
                  {TAX_BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Tax File Number */}
            <div className="field">
              <label>رقم الإضبارة / الحساب الضريبي في الهيئة</label>
              <input
                type="text"
                placeholder="مثال: 90034182 أو رقم إضبارة الفرع"
                value={taxFileNumber}
                onChange={e => setTaxFileNumber(e.target.value)}
                className="input num"
              />
            </div>

            {/* 5. Contracts & Commitments Details Block */}
            <div style={{ padding: '14px 16px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="doc" style={{ width: '16px', height: '16px' }} />
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>العقود والتعهدات الخاضعة للتحاسب</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>تثبيت تفاصيل العقود المبرمة وجهات التعاقد ومبالغها</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px' }}>تفاصيل العقود المبرمة والجهات</label>
                  <input
                    type="text"
                    placeholder="مثال: عقد تجهيز مع وزارة التجارة، عقد خدمات..."
                    value={contractsInfo}
                    onChange={e => setContractsInfo(e.target.value)}
                    className="input"
                    style={{ height: '36px', fontSize: '12.5px' }}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px' }}>إجمالي مبالغ العقود (د.ع)</label>
                  <input
                    type="text"
                    placeholder="مثال: 50,000,000"
                    value={contractsAmount}
                    onChange={e => setContractsAmount(formatNumberWithCommas(e.target.value))}
                    className="input num"
                    style={{ height: '36px', fontSize: '12.5px' }}
                  />
                </div>
              </div>
            </div>

            {/* 6. Imports & Customs Manifest Block */}
            <div style={{ padding: '14px 16px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="brief" style={{ width: '16px', height: '16px' }} />
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>الاستيرادات والمنافيست الجمركي</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>تثبيت الإجازات الاستيرادية والمنافذ الحدودية والقيم الإجمالية</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px' }}>تفاصيل الإجازات الاستيرادية والمنافذ</label>
                  <input
                    type="text"
                    placeholder="مثال: استيراد قطع غيار عبر منفذ أم قصر، منفذ سفوان..."
                    value={importsInfo}
                    onChange={e => setImportsInfo(e.target.value)}
                    className="input"
                    style={{ height: '36px', fontSize: '12.5px' }}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px' }}>قيمة الاستيرادات الإجمالية</label>
                  <input
                    type="text"
                    placeholder="مثال: 120,000,000"
                    value={importsAmount}
                    onChange={e => setImportsAmount(formatNumberWithCommas(e.target.value))}
                    className="input num"
                    style={{ height: '36px', fontSize: '12.5px' }}
                  />
                </div>
              </div>
            </div>

            {/* 7. Status & Clearance Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label>حالة المعاملة الضريبية</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as typeof status)}
                  className="input"
                  style={{ fontWeight: 700 }}
                >
                  <option value="in_progress">قيد الإجراء والمراجعة</option>
                  <option value="auditing">قيد التدقيق والتخمين</option>
                  <option value="assessed">تم التخمين وتحديد الضريبة</option>
                  <option value="tax_cleared">تم التحاسب وإصدار براءة الذمة ✓</option>
                </select>
              </div>

              <div className="field">
                <label>مبلغ الضريبة المقدرة (د.ع)</label>
                <input
                  type="text"
                  placeholder="مثال: 1,500,000"
                  value={taxAmountAssessed}
                  onChange={e => setTaxAmountAssessed(formatNumberWithCommas(e.target.value))}
                  className="input num"
                />
              </div>
            </div>

            {status === 'tax_cleared' && (
              <div style={{ padding: '14px 16px', borderRadius: '14px', background: 'var(--ok-soft)', border: '1px solid var(--ok)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="check" style={{ width: '16px', height: '16px', color: 'var(--ok)' }} />
                  <span>بيانات براءة الذمة الضريبية الصادرة:</span>
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '12px' }}>رقم كتاب براءة الذمة</label>
                    <input
                      type="text"
                      placeholder="رقم كتاب البراءة"
                      value={clearanceLetterNo}
                      onChange={e => setClearanceLetterNo(e.target.value)}
                      className="input num"
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '12px' }}>رقم وصل الدفع الضريبي</label>
                    <input
                      type="text"
                      placeholder="رقم وصل الدفع"
                      value={receiptNumber}
                      onChange={e => setReceiptNumber(e.target.value)}
                      className="input num"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="field">
              <label>ملاحظات التحاسب الضريبي</label>
              <textarea
                rows={3}
                placeholder="أي تفاصيل إضافية عن اللجنة الضريبية أو ملفات الشركة..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-foot">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              إلغاء
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'جاري الحفظ...' : editingAssessment ? 'حفظ التعديلات' : 'إضافة ملف التحاسب'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
