'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import { createEstablishedCompanyAction } from '@/app/(app)/commercial/companies-registry/actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (company?: any) => void
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

  // Shareholders
  const [shareholders, setShareholders] = useState<ShareholderInput[]>([
    { id: '1', name: '', share_percentage: '100', share_amount: '', phone: '' },
  ])

  // Financial Statements / Budgets (Years submitted)
  const currentYear = new Date().getFullYear()
  const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5]
  const [selectedFsYears, setSelectedFsYears] = useState<number[]>([currentYear])
  const [customYearInput, setCustomYearInput] = useState('')

  // Company IDs
  const [companyIDs, setCompanyIDs] = useState<CompanyIDInput[]>(DEFAULT_ID_TEMPLATES)

  useEffect(() => {
    setMounted(true)
  }, [])

  useModalBodyLock(isOpen)

  if (!mounted || !isOpen) return null

  const addShareholder = () => {
    setShareholders(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', share_percentage: '', share_amount: '', phone: '' },
    ])
  }

  const removeShareholder = (id: string) => {
    if (shareholders.length <= 1) return
    setShareholders(prev => prev.filter(s => s.id !== id))
  }

  const updateShareholder = (id: string, field: keyof ShareholderInput, val: string) => {
    setShareholders(prev => prev.map(s => (s.id === id ? { ...s, [field]: val } : s)))
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
      manager: manager.trim(),
      manager_phone: managerPhone.trim() || undefined,
      cert_no: certNo.trim() || undefined,
      cert_date: certDate || undefined,
      registrar_no: registrarNo.trim() || undefined,
      tax_no: taxNo.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      shareholders: cleanShareholders,
      fs_years: selectedFsYears,
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
                    type="text"
                    className="input"
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
                      type="text"
                      className="input num"
                      value={registrarNo}
                      onChange={e => setRegistrarNo(e.target.value)}
                      placeholder="مثال: م.ش / 54201"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-tax-no">رقم الشركة في الهيئة العامة للضرائب</label>
                    <input
                      id="est-co-tax-no"
                      type="text"
                      className="input num"
                      value={taxNo}
                      onChange={e => setTaxNo(e.target.value)}
                      placeholder="مثال: 90034182"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-kind">نوع الشركة</label>
                    <select
                      id="est-co-kind"
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
                      type="text"
                      className="input num"
                      value={certNo}
                      onChange={e => setCertNo(e.target.value)}
                      placeholder="مثال: 45290"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-cert-date">تاريخ الشهادة / التأسيس</label>
                    <input
                      id="est-co-cert-date"
                      type="date"
                      className="input"
                      value={certDate}
                      onChange={e => setCertDate(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-capital">رأس المال (د.ع)</label>
                    <input
                      id="est-co-capital"
                      type="text"
                      className="input num"
                      value={capital}
                      onChange={e => setCapital(e.target.value)}
                      placeholder="100,000,000"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label htmlFor="est-co-phone">هاتف الشركة</label>
                    <input
                      id="est-co-phone"
                      type="text"
                      className="input num"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="0770XXXXXXX"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="est-co-address">المقر / العنوان</label>
                    <input
                      id="est-co-address"
                      type="text"
                      className="input"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="بغداد - المنصور - شارع 14 رمضان"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. بيانات المدير المفوض */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="badge" />
                <span>المدير المفوض للشركة *</span>
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label htmlFor="est-mgr-name">اسم المدير المفوض *</label>
                  <input
                    id="est-mgr-name"
                    type="text"
                    className="input"
                    value={manager}
                    onChange={e => setManager(e.target.value)}
                    placeholder="الاسم الثلاثي أو الرباعي للمدير المفوض"
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="est-mgr-phone">هاتف المدير المفوض</label>
                  <input
                    id="est-mgr-phone"
                    type="text"
                    className="input num"
                    value={managerPhone}
                    onChange={e => setManagerPhone(e.target.value)}
                    placeholder="0770XXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* 3. بيانات المساهمين ونسب الأسهم */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Icon name="users" />
                  <span>المساهمون ونسبة الأسهم ({shareholders.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={addShareholder}
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--accent)' }}
                >
                  <Icon name="plus" />
                  <span>إضافة مساهم آخر</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {shareholders.map((sh, idx) => (
                  <div
                    key={sh.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr auto',
                      gap: '10px',
                      alignItems: 'end',
                      background: 'var(--surface)',
                      padding: '12px',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--line-soft)',
                    }}
                  >
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        اسم المساهم ({idx + 1}) *
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={sh.name}
                        onChange={e => updateShareholder(sh.id, 'name', e.target.value)}
                        placeholder="الاسم الثلاثي للشريك المساهم"
                      />
                    </div>

                    <div className="field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        نسبة الأسهم (%)
                      </label>
                      <input
                        type="text"
                        className="input num"
                        value={sh.share_percentage}
                        onChange={e => updateShareholder(sh.id, 'share_percentage', e.target.value)}
                        placeholder="50"
                      />
                    </div>

                    <div className="field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        هاتف المساهم
                      </label>
                      <input
                        type="text"
                        className="input num"
                        value={sh.phone}
                        onChange={e => updateShareholder(sh.id, 'phone', e.target.value)}
                        placeholder="0770XXXXXXX"
                      />
                    </div>

                    {shareholders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeShareholder(sh.id)}
                        className="btn btn-ghost"
                        style={{ color: 'var(--bad)', padding: '6px' }}
                        title="حذف المساهم"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. الميزانيات الخاصة بالشركة (الحسابات الختامية المقدمة) */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="doc" />
                <span>الميزانيات والحسابات الختامية المقدمة</span>
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 12px 0' }}>
                حدد السنوات المالية والميزانيات التي تم إنجازها وتقديمها للشركة مسبقاً:
              </p>

              {/* Year tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
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
                  type="number"
                  className="input num"
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
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', margin: 0 }}>
                        <input
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
                          <label style={{ fontSize: '11px', color: 'var(--text-3)' }}>رقم الوثيقة / الهوية</label>
                          <input
                            type="text"
                            className="input num"
                            value={idItem.id_number}
                            onChange={e => updateIDItem(idItem.id_type, 'id_number', e.target.value)}
                            placeholder="الرقم الرسمي..."
                          />
                        </div>

                        <div className="field" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-3)' }}>تاريخ الإصدار</label>
                          <input
                            type="date"
                            className="input"
                            value={idItem.issue_date}
                            onChange={e => updateIDItem(idItem.id_type, 'issue_date', e.target.value)}
                          />
                        </div>

                        <div className="field" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-3)' }}>تاريخ الانتهاء</label>
                          <input
                            type="date"
                            className="input"
                            value={idItem.expiry_date}
                            onChange={e => updateIDItem(idItem.id_type, 'expiry_date', e.target.value)}
                          />
                        </div>

                        {idItem.id_type === 'chamber_id' && (
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-3)' }}>الدرجة</label>
                            <select
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
