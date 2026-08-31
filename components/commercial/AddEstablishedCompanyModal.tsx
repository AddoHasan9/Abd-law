'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { formatNumberWithCommas } from '@/lib/constants'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import { createEstablishedCompanyAction } from '@/app/(app)/commercial/companies-registry/actions'
import { getActiveLawyersAction } from '@/app/(app)/settings/users/actions'

import type { CompanyWithWorkflow } from '@/types/database'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (company?: CompanyWithWorkflow) => void
}

interface ShareholderInput {
  id: string
  name: string
  share_percentage: string
  share_amount: string
  phone: string
}

interface CompanyIDInput {
  id_type: 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'
  enabled: boolean
  id_number: string
  issue_date: string
  expiry_date: string
  grade?: string
}

const DEFAULT_ID_TEMPLATES: CompanyIDInput[] = [
  { id_type: 'tax_id', enabled: false, id_number: '', issue_date: '', expiry_date: '' },
  { id_type: 'chamber_id', enabled: false, id_number: '', issue_date: '', expiry_date: '', grade: 'الأولى' },
  { id_type: 'importer_id', enabled: false, id_number: '', issue_date: '', expiry_date: '' },
  { id_type: 'planning_id', enabled: false, id_number: '', issue_date: '', expiry_date: '' },
]

const ID_LABELS: Record<string, string> = {
  importer_id: 'هوية مستورد',
  tax_id: 'هوية ضريبية',
  planning_id: 'هوية التخطيط',
  chamber_id: 'هوية الغرفة التجارية',
}

const CHAMBER_GRADES = ['ممتازة', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة']

export default function AddEstablishedCompanyModal({ isOpen, onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Basic Company Information
  const [name, setName] = useState('')
  const [kind, setKind] = useState('محدودة')
  const [capital, setCapital] = useState('')
  const [registrarNo, setRegistrarNo] = useState('')
  const [taxNo, setTaxNo] = useState('')
  const [certNo, setCertNo] = useState('')
  const [certDate, setCertDate] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  // Authorized Manager (Saved strictly in company_managers)
  const [manager, setManager] = useState('')
  const [managerPhone, setManagerPhone] = useState('')
  const [lawyerId, setLawyerId] = useState('')

  // Shareholders
  const [shareholders, setShareholders] = useState<ShareholderInput[]>([
    { id: '1', name: '', share_percentage: '100', share_amount: '', phone: '' },
  ])

  // Financial Statements / Budgets (Years submitted) - Default Disabled unless commissioned
  const currentYear = new Date().getFullYear()
  const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5]
  const [enableFinancialStatements, setEnableFinancialStatements] = useState(false)
  const [selectedFsYears, setSelectedFsYears] = useState<number[]>([])
  const [customYearInput, setCustomYearInput] = useState('')

  // Company IDs
  const [companyIDs, setCompanyIDs] = useState<CompanyIDInput[]>(DEFAULT_ID_TEMPLATES)
  const [lawyers, setLawyers] = useState<Array<{ id: string; name: string }>>([
    { id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي' }
  ])

  useEffect(() => {
    setMounted(true)
    async function loadLawyers() {
      const res = await getActiveLawyersAction()
      if (res.success && res.data && res.data.length > 0) {
        setLawyers(res.data)
      }
    }
    loadLawyers()
  }, [])

  useModalBodyLock(isOpen)

  if (!mounted || !isOpen) return null

  // معالجة تغيير رأس المال وتحديث نسب وأسهم الشركاء
  const handleCapitalChange = (rawVal: string) => {
    const formatted = formatNumberWithCommas(rawVal)
    setCapital(formatted)
    const capNum = parseFloat(formatted.replace(/[^0-9.]/g, '')) || 0

    if (shareholders.length === 1) {
      setShareholders(prev => [
        {
          ...prev[0],
          share_amount: formatted,
          share_percentage: capNum > 0 ? '100' : prev[0].share_percentage,
        }
      ])
    } else if (capNum > 0) {
      setShareholders(prev =>
        prev.map(sh => {
          const pct = parseFloat(sh.share_percentage) || 0
          if (pct > 0) {
            const calculatedAmount = Math.round((pct / 100) * capNum)
            return { ...sh, share_amount: formatNumberWithCommas(calculatedAmount) }
          }
          return sh
        })
      )
    }
  }

  const addShareholder = () => {
    const capNum = parseFloat(capital.replace(/[^0-9.]/g, '')) || 0
    const totalAllocatedPct = shareholders.reduce((sum, s) => sum + (parseFloat(s.share_percentage) || 0), 0)
    const remainingPct = Math.max(0, Math.round((100 - totalAllocatedPct) * 100) / 100)
    const remainingAmount = capNum > 0 && remainingPct > 0 ? Math.round((remainingPct / 100) * capNum) : 0

    setShareholders(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        share_percentage: remainingPct > 0 ? remainingPct.toString() : '',
        share_amount: remainingAmount > 0 ? formatNumberWithCommas(remainingAmount) : '',
        phone: '',
      },
    ])
  }

  const removeShareholder = (id: string) => {
    if (shareholders.length <= 1) return
    setShareholders(prev => {
      const filtered = prev.filter(s => s.id !== id)
      if (filtered.length === 1 && capital) {
        return [{ ...filtered[0], share_amount: capital, share_percentage: '100' }]
      }
      return filtered
    })
  }

  const updateShareholder = (id: string, field: keyof ShareholderInput, val: string) => {
    const capNum = parseFloat(capital.replace(/[^0-9.]/g, '')) || 0

    setShareholders(prev =>
      prev.map(s => {
        if (s.id !== id) return s

        if (field === 'share_amount') {
          const formattedAmount = formatNumberWithCommas(val)
          const amountNum = parseFloat(formattedAmount.replace(/[^0-9.]/g, '')) || 0
          let calculatedPct = s.share_percentage

          if (capNum > 0 && amountNum > 0) {
            const rawPct = (amountNum / capNum) * 100
            calculatedPct = (Math.round(rawPct * 100) / 100).toString()
          } else if (amountNum === 0) {
            calculatedPct = '0'
          }

          return {
            ...s,
            share_amount: formattedAmount,
            share_percentage: calculatedPct,
          }
        }

        if (field === 'share_percentage') {
          const cleanPct = val.replace(/[^0-9.]/g, '')
          const pctNum = parseFloat(cleanPct) || 0
          let calculatedAmount = s.share_amount

          if (capNum > 0 && pctNum > 0) {
            const rawAmount = Math.round((pctNum / 100) * capNum)
            calculatedAmount = formatNumberWithCommas(rawAmount)
          } else if (pctNum === 0) {
            calculatedAmount = '0'
          }

          return {
            ...s,
            share_percentage: cleanPct,
            share_amount: calculatedAmount,
          }
        }

        return { ...s, [field]: val }
      })
    )
  }

  const toggleFsYear = (yr: number) => {
    setSelectedFsYears(prev =>
      prev.includes(yr) ? prev.filter(y => y !== yr) : [...prev, yr].sort((a, b) => b - a)
    )
  }

  const addCustomYear = () => {
    const yr = parseInt(customYearInput.trim(), 10)
    if (yr && yr > 1990 && yr <= currentYear + 1) {
      if (!selectedFsYears.includes(yr)) {
        setSelectedFsYears(prev => [...prev, yr].sort((a, b) => b - a))
      }
      setCustomYearInput('')
    }
  }

  const updateIDItem = (type: string, field: keyof CompanyIDInput, val: string | boolean | null) => {
    setCompanyIDs(prev =>
      prev.map(item => (item.id_type === type ? { ...item, [field]: val } : item))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('يرجى إدخال اسم الشركة (إلزامي)')
      return
    }

    if (!manager.trim()) {
      setError('يرجى إدخال اسم المدير المفوض للشركة (إلزامي)')
      return
    }

    if (!lawyerId.trim()) {
      setError('المحامي المكلّف / المسؤول مطلوب (إلزامي)')
      return
    }

    setLoading(true)
    setError(null)

    const cleanShareholders = shareholders
      .filter(s => s.name.trim())
      .map(s => ({
        name: s.name.trim(),
        share_percentage: parseFloat(s.share_percentage) || undefined,
        share_amount: parseFloat(s.share_amount.replace(/[^0-9.]/g, '')) || undefined,
        phone: s.phone.trim() || undefined,
      }))

    const activeIDs = companyIDs
      .filter(id => id.enabled)
      .map(id => ({
        id_type: id.id_type,
        id_number: id.id_number.trim() || undefined,
        issue_date: id.issue_date || undefined,
        expiry_date: id.expiry_date || undefined,
        grade: id.id_type === 'chamber_id' ? id.grade : undefined,
      }))

    const capitalNum = parseFloat(capital.replace(/[^0-9.]/g, '')) || 0

    const res = await createEstablishedCompanyAction({
      name: name.trim(),
      kind: shareholders.length > 1 ? 'محدودة' : kind,
      capital: capitalNum,
      lawyer_id: lawyerId,
      manager: manager.trim(),
      manager_phone: managerPhone.trim() || undefined,
      cert_no: certNo.trim() || undefined,
      cert_date: certDate || undefined,
      registrar_no: registrarNo.trim() || undefined,
      tax_no: taxNo.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      shareholders: cleanShareholders,
      financial_statements_enabled: enableFinancialStatements,
      fs_years: enableFinancialStatements ? selectedFsYears : [],
      ids: activeIDs,
    })

    setLoading(false)

    if (res.success) {
      if (onSuccess) onSuccess(res.company)
      onClose()
    } else {
      setError(res.error || 'حدث خطأ أثناء حفظ بيانات الشركة')
    }
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div
        className="modal"
        style={{
          '--modal-max-w': 'var(--modal-xl, 880px)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        } as React.CSSProperties}
      >
        {/* Modal Head */}
        <div className="modal-head">
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="build2" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>إضافة شركة متأسسة إلى قسم الشركات</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              تسجيل بيانات الشركة كاملة لتكون مرجعاً تلقائياً في كافة المعاملات والخدمات
            </span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div
            className="modal-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
              overflowY: 'auto',
              padding: '22px',
            }}
          >
            {error && (
              <div className="login-err" style={{ marginBottom: 0 }}>
                {error}
              </div>
            )}

            {/* 1. بيانات الشركة الأساسية */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="build" />
                <span>بيانات وهوية الشركة الرسمية</span>
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="field">
                  <label htmlFor="est-co-name">اسم الشركة الكامل *</label>
                  <input
                    id="est-co-name"
                    name="company_name"
                    type="text"
                    className="input"
                    autoComplete="organization"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثال: شركة النور للمقاولات والتجارة العامة محدودة المسؤولية"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div className="field">
                    <label htmlFor="est-co-reg-no">رقم الشركة في مسجل الشركات</label>
                    <input
                      id="est-co-reg-no"
                      name="registrar_no"
                      type="text"
                      className="input num"
                      autoComplete="off"
                      value={registrarNo}
                      onChange={e => setRegistrarNo(e.target.value)}
                      placeholder="مثال: م.ش / 54201"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-tax-no">رقم الشركة في الهيئة العامة للضرائب</label>
                    <input
                      id="est-co-tax-no"
                      name="tax_no"
                      type="text"
                      className="input num"
                      autoComplete="off"
                      value={taxNo}
                      onChange={e => setTaxNo(e.target.value)}
                      placeholder="مثال: 90034182"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-kind">نوع الشركة</label>
                    <select
                      id="est-co-kind"
                      name="company_kind"
                      className="input"
                      value={kind}
                      onChange={e => setKind(e.target.value)}
                    >
                      <option value="محدودة">محدودة المسؤولية (م.م)</option>
                      <option value="فردية">مشروع فردي</option>
                      <option value="تضامنية">تضامنية</option>
                      <option value="مساهمة">مساهمة خاصة</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div className="field">
                    <label htmlFor="est-co-cert-no">رقم شهادة التأسيس</label>
                    <input
                      id="est-co-cert-no"
                      name="cert_no"
                      type="text"
                      className="input num"
                      autoComplete="off"
                      value={certNo}
                      onChange={e => setCertNo(e.target.value)}
                      placeholder="مثال: 45290"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-cert-date">تاريخ الشهادة / التأسيس</label>
                    <input
                      id="est-co-cert-date"
                      name="cert_date"
                      type="date"
                      className="input"
                      autoComplete="off"
                      value={certDate}
                      onChange={e => setCertDate(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-capital">رأس المال (د.ع) *</label>
                    <input
                      id="est-co-capital"
                      name="capital"
                      type="text"
                      className="input num"
                      autoComplete="off"
                      value={capital}
                      onChange={e => handleCapitalChange(e.target.value)}
                      placeholder="100,000,000"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label htmlFor="est-co-phone">هاتف الشركة</label>
                    <input
                      id="est-co-phone"
                      name="company_phone"
                      type="text"
                      className="input num"
                      autoComplete="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="0770XXXXXXX"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-address">المقر / العنوان</label>
                    <input
                      id="est-co-address"
                      name="company_address"
                      type="text"
                      className="input"
                      autoComplete="street-address"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="بغداد - المنصور - شارع 14 رمضان"
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="est-co-lawyer" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                    المحامي المكلّف / المسؤول *
                  </label>
                  <select
                    id="est-co-lawyer"
                    name="lawyer_id"
                    className="input"
                    value={lawyerId || (lawyers[0]?.id || '')}
                    onChange={e => setLawyerId(e.target.value)}
                    required
                  >
                    <option value="" disabled>اختر المحامي المسؤول...</option>
                    {lawyers.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. بيانات المدير المفوض */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="badge" />
                <span>المدير المفوض للشركة *</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="field sm:col-span-2">
                  <label htmlFor="est-mgr-name">اسم المدير المفوض *</label>
                  <input
                    id="est-mgr-name"
                    name="manager_name"
                    type="text"
                    className="input"
                    autoComplete="name"
                    value={manager}
                    onChange={e => setManager(e.target.value)}
                    placeholder="الاسم الثلاثي أو الرباعي للمدير المفوض"
                    required
                  />
                </div>

                <div className="field sm:col-span-1">
                  <label htmlFor="est-mgr-phone">هاتف المدير المفوض</label>
                  <input
                    id="est-mgr-phone"
                    name="manager_phone"
                    type="text"
                    className="input num"
                    autoComplete="tel"
                    value={managerPhone}
                    onChange={e => setManagerPhone(e.target.value)}
                    placeholder="0770XXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* 3. بيانات المساهمين ونسب الأسهم مع الحساب التلقائي */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Icon name="users" />
                    <span>المساهمون والشركاء ({shareholders.length})</span>
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>(حساب تلقائي لنسبة وعدد الأسهم)</span>
                </div>
                <button
                  type="button"
                  onClick={addShareholder}
                  className="btn btn-ghost"
                  style={{ fontSize: '11.5px', padding: '4px 10px', color: 'var(--accent)', border: '1px dashed var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Icon name="plus" />
                  <span>إضافة مساهم آخر</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {shareholders.map((sh, idx) => (
                  <div
                    key={sh.id}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end bg-[var(--surface)] p-2.5 rounded-xl border border-[var(--line-soft)]"
                  >
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label htmlFor={`sh-name-${sh.id}`} style={{ fontSize: '11px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="w-4 h-4 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[9.5px] font-bold inline-flex items-center justify-center">{idx + 1}</span>
                        <span>اسم المساهم *</span>
                      </label>
                      <input
                        id={`sh-name-${sh.id}`}
                        name={`shareholder_name_${idx}`}
                        type="text"
                        className="input"
                        autoComplete="name"
                        style={{ padding: '6px 10px', fontSize: '12.5px' }}
                        value={sh.name}
                        onChange={e => updateShareholder(sh.id, 'name', e.target.value)}
                        placeholder="الاسم الثلاثي"
                        required
                      />
                    </div>

                    <div className="field" style={{ marginBottom: 0 }}>
                      <label htmlFor={`sh-phone-${sh.id}`} style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        هاتف المساهم
                      </label>
                      <input
                        id={`sh-phone-${sh.id}`}
                        name={`shareholder_phone_${idx}`}
                        type="text"
                        className="input num"
                        autoComplete="tel"
                        style={{ padding: '6px 10px', fontSize: '12.5px' }}
                        value={sh.phone}
                        onChange={e => updateShareholder(sh.id, 'phone', e.target.value)}
                        placeholder="0770XXXXXXX"
                      />
                    </div>

                    <div className="field" style={{ marginBottom: 0 }}>
                      <label htmlFor={`sh-amount-${sh.id}`} style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 600 }}>
                        عدد الأسهم (د.ع)
                      </label>
                      <input
                        id={`sh-amount-${sh.id}`}
                        name={`shareholder_amount_${idx}`}
                        type="text"
                        className="input num font-bold"
                        autoComplete="off"
                        style={{ padding: '6px 10px', fontSize: '12.5px' }}
                        value={sh.share_amount}
                        onChange={e => updateShareholder(sh.id, 'share_amount', e.target.value)}
                        placeholder="50,000,000"
                      />
                    </div>

                    <div className="field" style={{ marginBottom: 0 }}>
                      <label htmlFor={`sh-pct-${sh.id}`} style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                        النسبة (%)
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          id={`sh-pct-${sh.id}`}
                          name={`shareholder_percentage_${idx}`}
                          type="text"
                          className="input num font-extrabold text-[var(--accent)]"
                          autoComplete="off"
                          style={{ padding: '6px 20px 6px 8px', fontSize: '12.5px' }}
                          value={sh.share_percentage}
                          onChange={e => updateShareholder(sh.id, 'share_percentage', e.target.value)}
                          placeholder="50"
                        />
                        <span style={{ position: 'absolute', left: '6px', fontSize: '11px', fontWeight: 800, color: 'var(--accent)' }}>%</span>
                      </div>
                    </div>

                    {shareholders.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeShareholder(sh.id)}
                        className="btn btn-ghost"
                        style={{ color: 'var(--bad)', padding: '6px', marginBottom: '2px' }}
                        title="حذف المساهم"
                      >
                        ✕
                      </button>
                    ) : (
                      <div style={{ width: '24px' }} />
                    )}
                  </div>
                ))}

                {/* بطاقة ملخص توزيع الأسهم ورأس المال التلقائي */}
                {(() => {
                  const capNum = parseFloat(capital.replace(/[^0-9.]/g, '')) || 0
                  const totalAllocatedShares = shareholders.reduce((sum, s) => sum + (parseFloat(s.share_amount.replace(/[^0-9.]/g, '')) || 0), 0)
                  const totalAllocatedPct = Math.round(shareholders.reduce((sum, s) => sum + (parseFloat(s.share_percentage) || 0), 0) * 100) / 100
                  const remainingShares = Math.max(0, capNum - totalAllocatedShares)
                  const remainingPct = Math.max(0, Math.round((100 - totalAllocatedPct) * 100) / 100)
                  const isMatched = capNum > 0 && Math.abs(totalAllocatedPct - 100) < 0.05
                  const isOver = totalAllocatedPct > 100

                  return (
                    <div
                      style={{
                        background: isMatched
                          ? 'rgba(16, 185, 129, 0.06)'
                          : isOver
                          ? 'rgba(239, 68, 68, 0.06)'
                          : 'var(--surface-3)',
                        border: `1px solid ${
                          isMatched
                            ? 'rgba(16, 185, 129, 0.25)'
                            : isOver
                            ? 'rgba(239, 68, 68, 0.25)'
                            : 'var(--line-soft)'
                        }`,
                        padding: '10px 14px',
                        borderRadius: 'var(--r-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        marginTop: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '11.5px' }}>
                          <span style={{ color: 'var(--text-3)' }}>إجمالي رأس المال: </span>
                          <strong className="num" style={{ color: 'var(--text)' }}>{capital || '0'} د.ع</strong>
                        </div>
                        <div style={{ fontSize: '11.5px' }}>
                          <span style={{ color: 'var(--text-3)' }}>الموزع: </span>
                          <strong className="num" style={{ color: isOver ? 'var(--bad)' : 'var(--accent)' }}>
                            {formatNumberWithCommas(totalAllocatedShares)} د.ع ({totalAllocatedPct}%)
                          </strong>
                        </div>
                        {remainingShares > 0 && (
                          <div style={{ fontSize: '11.5px' }}>
                            <span style={{ color: 'var(--text-3)' }}>المتبقي: </span>
                            <strong className="num" style={{ color: 'var(--warn, #f59e0b)' }}>
                              {formatNumberWithCommas(remainingShares)} د.ع ({remainingPct}%)
                            </strong>
                          </div>
                        )}
                      </div>

                      <div>
                        {isMatched ? (
                          <span className="tag tag-ok" style={{ fontSize: '10.5px', fontWeight: 700 }}>
                            ✓ توزيع الحصص مكتمل 100%
                          </span>
                        ) : isOver ? (
                          <span className="tag tag-bad" style={{ fontSize: '10.5px', fontWeight: 700 }}>
                            ⚠️ يتجاوز 100% ({totalAllocatedPct}%)
                          </span>
                        ) : (
                          <span className="tag" style={{ fontSize: '10.5px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            ⏳ متبقي: {remainingPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* 4. الميزانيات الخاصة بالشركة (الحسابات الختامية) */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="doc" />
                  <span>الحسابات الختامية والميزانيات</span>
                </h4>

                {/* Toggle switch for commissioning the office */}
                <label htmlFor="est-co-fs-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    id="est-co-fs-toggle"
                    name="enable_financial_statements"
                    type="checkbox"
                    checked={enableFinancialStatements}
                    onChange={e => {
                      const val = e.target.checked
                      setEnableFinancialStatements(val)
                      if (!val) setSelectedFsYears([])
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: enableFinancialStatements ? 'var(--accent)' : 'var(--text-3)' }}>
                    تكليف المكتب بالحسابات الختامية
                  </span>
                </label>
              </div>

              {!enableFinancialStatements ? (
                <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                  المكتب غير مكلّف بالحسابات الختامية لهذه الشركة حالياً (لن تظهر الشركة في المهل القانونية أو قسم الميزانيات إلا بعد التكليف).
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--line-soft)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-2)', margin: 0 }}>
                    حدد السنوات المالية والميزانيات المنجزة سابقاً لهذه الشركة إن وجدت:
                  </p>

                  {/* Year tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availableYears.map(yr => {
                      const selected = selectedFsYears.includes(yr)
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => toggleFsYear(yr)}
                          className={`btn ${selected ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: '12px', padding: '6px 14px' }}
                        >
                          {selected ? '✓ ' : '+ '} ميزانية {yr}
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom Year Adder */}
                  <div style={{ display: 'flex', gap: '8px', maxWidth: '300px' }}>
                    <input
                      id="est-co-custom-fs-year"
                      name="custom_fs_year"
                      type="number"
                      className="input num"
                      autoComplete="off"
                      value={customYearInput}
                      onChange={e => setCustomYearInput(e.target.value)}
                      placeholder="سنة سابقة أخرى (مثال: 2019)"
                      style={{ fontSize: '12.5px' }}
                    />
                    <button
                      type="button"
                      onClick={addCustomYear}
                      className="btn btn-ghost"
                      style={{ fontSize: '12px' }}
                    >
                      إضافة سنة
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. الهويات الموجودة بالشركة */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="stamp" />
                <span>الهويات والرقيمات الصادرة للشركة</span>
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 14px 0' }}>
                قم بتفعيل وإدخال بيانات الهويات المتوفرة للشركة حالياً:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {companyIDs.map(idItem => (
                  <div
                    key={idItem.id_type}
                    style={{
                      background: 'var(--surface)',
                      padding: '12px 14px',
                      borderRadius: 'var(--r-sm)',
                      border: idItem.enabled ? '1px solid var(--accent)' : '1px solid var(--line-soft)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: idItem.enabled ? '10px' : '0' }}>
                      <label htmlFor={`est-id-toggle-${idItem.id_type}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', margin: 0 }}>
                        <input
                          id={`est-id-toggle-${idItem.id_type}`}
                          name={`id_enabled_${idItem.id_type}`}
                          type="checkbox"
                          checked={idItem.enabled}
                          onChange={e => updateIDItem(idItem.id_type, 'enabled', e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                        />
                        <span>{ID_LABELS[idItem.id_type]}</span>
                      </label>
                      {idItem.enabled && (
                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                          مفعلة
                        </span>
                      )}
                    </div>

                    {idItem.enabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--line-soft)' }}>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label htmlFor={`est-id-num-${idItem.id_type}`} style={{ fontSize: '11px', color: 'var(--text-3)' }}>رقم الوثيقة / الهوية</label>
                          <input
                            id={`est-id-num-${idItem.id_type}`}
                            name={`id_number_${idItem.id_type}`}
                            type="text"
                            className="input num"
                            autoComplete="off"
                            value={idItem.id_number}
                            onChange={e => updateIDItem(idItem.id_type, 'id_number', e.target.value)}
                            placeholder="الرقم الرسمي..."
                          />
                        </div>

                        <div className="field" style={{ marginBottom: 0 }}>
                          <label htmlFor={`est-id-issue-${idItem.id_type}`} style={{ fontSize: '11px', color: 'var(--text-3)' }}>تاريخ الإصدار</label>
                          <input
                            id={`est-id-issue-${idItem.id_type}`}
                            name={`id_issue_date_${idItem.id_type}`}
                            type="date"
                            className="input"
                            autoComplete="off"
                            value={idItem.issue_date}
                            onChange={e => updateIDItem(idItem.id_type, 'issue_date', e.target.value)}
                          />
                        </div>

                        <div className="field" style={{ marginBottom: 0 }}>
                          <label htmlFor={`est-id-expiry-${idItem.id_type}`} style={{ fontSize: '11px', color: 'var(--text-3)' }}>تاريخ الانتهاء</label>
                          <input
                            id={`est-id-expiry-${idItem.id_type}`}
                            name={`id_expiry_date_${idItem.id_type}`}
                            type="date"
                            className="input"
                            autoComplete="off"
                            value={idItem.expiry_date}
                            onChange={e => updateIDItem(idItem.id_type, 'expiry_date', e.target.value)}
                          />
                        </div>

                        {idItem.id_type === 'chamber_id' && (
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label htmlFor="est-id-chamber-grade" style={{ fontSize: '11px', color: 'var(--text-3)' }}>الدرجة</label>
                            <select
                              id="est-id-chamber-grade"
                              name="chamber_grade"
                              className="input"
                              value={idItem.grade || 'الأولى'}
                              onChange={e => updateIDItem(idItem.id_type, 'grade', e.target.value)}
                            >
                              {CHAMBER_GRADES.map(g => (
                                <option key={g} value={g}>
                                  درجة {g}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Modal Foot */}
          <div className="modal-foot">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الحفظ والتسجيل...' : 'حفظ الشركة في قسم الشركات'}
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
