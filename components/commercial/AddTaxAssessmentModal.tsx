'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
      onSuccess?.()
      onClose()
    } else {
      setError(res.error || 'حدث خطأ أثناء حفظ التحاسب الضريبي')
    }
  }

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 sm:p-6"
      dir="rtl"
    >
      {/* Outer Card with 100% Contained Overflow & Clean Rounded Frame */}
      <div className="glass-card rounded-[24px] max-w-3xl w-full border border-[var(--border)] shadow-2xl bg-[var(--surface)] text-[var(--text)] flex flex-col max-h-[90vh] overflow-hidden my-auto animate-scale-in">
        
        {/* Fixed Pinned Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[var(--border-soft)] flex-none bg-[var(--surface-2)]/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center flex-none shadow-xs">
              <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[var(--text)] tracking-tight">
                {editingAssessment ? 'تعديل ملف التحاسب الضريبي' : 'فتح وإضافة ملف تحاسب ضريبي جديد'}
              </h3>
              <p className="text-xs text-[var(--text-3)] font-medium mt-0.5">
                متابعة التحاسب عن العقود والاستيرادات وإصدار براءة الذمة الضريبية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text)] transition-colors cursor-pointer text-sm font-bold flex-none"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body with Contained Inset Scrollbar */}
        <form onSubmit={handleSubmit} id="tax-form" className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col gap-5 scrollbar-thin">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Company Selection (Strictly Registered Companies) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-sm font-bold text-[var(--text)] flex items-center gap-1">
              <span>الشركة المعنية (الشركات المدرجة بالنظام)</span>
              <span className="text-[var(--accent)]">*</span>
            </label>
            <select
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              className="input font-bold h-11 text-xs sm:text-sm px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--accent)]"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs sm:text-sm font-bold text-[var(--text)] flex items-center gap-1">
                <span>سنة التحاسب الضريبي</span>
                <span className="text-[var(--accent)]">*</span>
              </label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="input font-black num text-[var(--accent)] h-11 text-xs sm:text-sm px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--accent)]"
                required
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>
                    سنة {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs sm:text-sm font-bold text-[var(--text)] flex items-center gap-1">
                <span>تاريخ بدء المهمة والمراجعة</span>
                <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                type="date"
                value={txStartDate}
                onChange={e => setTxStartDate(e.target.value)}
                className="input num h-11 text-xs sm:text-sm px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--accent)]"
                required
              />
            </div>
          </div>

          {/* 3. Lawyer & Tax Branch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs sm:text-sm font-bold text-[var(--text)] flex items-center gap-1">
                <span>المحامي المكلّف بمتابعة التحاسب</span>
                <span className="text-[var(--accent)]">*</span>
              </label>
              <select
                value={lawyerId}
                onChange={e => setLawyerId(e.target.value)}
                className="input h-11 text-xs sm:text-sm px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--accent)]"
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

            <div className="flex flex-col gap-1.5">
              <label className="text-xs sm:text-sm font-bold text-[var(--text)]">الفرع الضريبي (الهيئة العامة للضرائب)</label>
              <select
                value={taxBranch}
                onChange={e => setTaxBranch(e.target.value)}
                className="input font-bold h-11 text-xs sm:text-sm px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--accent)]"
              >
                {TAX_BRANCHES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Tax File Number */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-sm font-bold text-[var(--text)]">رقم الإضبارة / الحساب الضريبي في الهيئة</label>
            <input
              type="text"
              placeholder="مثال: 90034182 أو رقم إضبارة الفرع"
              value={taxFileNumber}
              onChange={e => setTaxFileNumber(e.target.value)}
              className="input num h-11 text-xs sm:text-sm px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--accent)]"
            />
          </div>

          {/* 5. Contracts & Commitments Details Block */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border-soft)] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center flex-none">
                <span className="material-symbols-outlined text-[16px]">contract</span>
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-[var(--text)]">العقود والتعهدات الخاضعة للتحاسب</span>
                <p className="text-[11px] text-[var(--text-3)] m-0">تثبيت تفاصيل العقود المبرمة وجهات التعاقد ومبالغها</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-2)]">تفاصيل العقود المبرمة والجهات</label>
                <input
                  type="text"
                  placeholder="مثال: عقد تجهيز مع وزارة التجارة، عقد خدمات..."
                  value={contractsInfo}
                  onChange={e => setContractsInfo(e.target.value)}
                  className="input text-xs sm:text-sm h-10 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-2)]">إجمالي مبالغ العقود (د.ع)</label>
                <input
                  type="text"
                  placeholder="مثال: 50,000,000"
                  value={contractsAmount}
                  onChange={e => setContractsAmount(formatNumberWithCommas(e.target.value))}
                  className="input num text-xs sm:text-sm h-10 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                />
              </div>
            </div>
          </div>

          {/* 6. Imports & Customs Manifest Block */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border-soft)] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center flex-none">
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-[var(--text)]">الاستيرادات والمنافيست الجمركي</span>
                <p className="text-[11px] text-[var(--text-3)] m-0">تثبيت الإجازات الاستيرادية والمنافذ الحدودية والقيم الإجمالية</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-2)]">تفاصيل الإجازات الاستيرادية والمنافذ</label>
                <input
                  type="text"
                  placeholder="مثال: استيراد قطع غيار عبر منفذ أم قصر، منفذ سفوان..."
                  value={importsInfo}
                  onChange={e => setImportsInfo(e.target.value)}
                  className="input text-xs sm:text-sm h-10 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-2)]">قيمة الاستيرادات الإجمالية</label>
                <input
                  type="text"
                  placeholder="مثال: 120,000,000"
                  value={importsAmount}
                  onChange={e => setImportsAmount(formatNumberWithCommas(e.target.value))}
                  className="input num text-xs sm:text-sm h-10 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                />
              </div>
            </div>
          </div>

          {/* 7. Status & Clearance Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs sm:text-sm font-bold text-[var(--text)]">حالة المعاملة الضريبية</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as typeof status)}
                className="input font-bold h-11 text-xs sm:text-sm px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--accent)]"
              >
                <option value="in_progress">قيد الإجراء والمراجعة</option>
                <option value="auditing">قيد التدقيق والتخمين</option>
                <option value="assessed">تم التخمين وتحديد الضريبة</option>
                <option value="tax_cleared">تم التحاسب وإصدار براءة الذمة ✓</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs sm:text-sm font-bold text-[var(--text)]">مبلغ الضريبة المقدرة (د.ع)</label>
              <input
                type="text"
                placeholder="مثال: 1,500,000"
                value={taxAmountAssessed}
                onChange={e => setTaxAmountAssessed(formatNumberWithCommas(e.target.value))}
                className="input num h-11 text-xs sm:text-sm px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {status === 'tax_cleared' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col gap-3">
              <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>بيانات براءة الذمة الضريبية الصادرة:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">رقم كتاب براءة الذمة</label>
                  <input
                    type="text"
                    placeholder="رقم كتاب البراءة"
                    value={clearanceLetterNo}
                    onChange={e => setClearanceLetterNo(e.target.value)}
                    className="input num text-xs sm:text-sm h-10 px-3 rounded-lg bg-[var(--surface)] border border-emerald-500/25"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">تاريخ كتاب براءة الذمة</label>
                  <input
                    type="date"
                    value={clearanceDate}
                    onChange={e => setClearanceDate(e.target.value)}
                    className="input num text-xs sm:text-sm h-10 px-3 rounded-lg bg-[var(--surface)] border border-emerald-500/25"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">رقم وصل الدفع الضريبي</label>
                  <input
                    type="text"
                    placeholder="رقم وصل الدفع"
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                    className="input num text-xs sm:text-sm h-10 px-3 rounded-lg bg-[var(--surface)] border border-emerald-500/25"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-sm font-bold text-[var(--text)]">ملاحظات التحاسب الضريبي</label>
            <textarea
              rows={3}
              placeholder="أي تفاصيل إضافية عن اللجنة الضريبية أو ملفات الشركة..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input text-xs sm:text-sm p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--accent)]"
            />
          </div>
        </form>

        {/* Fixed Pinned Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-[var(--border-soft)] bg-[var(--surface-2)]/40 flex-none">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[var(--text-2)] hover:text-[var(--text)] cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="tax-form"
            disabled={loading}
            className="btn btn-primary px-7 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 text-white"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{loading ? 'جاري الحفظ...' : editingAssessment ? 'حفظ التعديلات' : 'إضافة ملف التحاسب'}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
