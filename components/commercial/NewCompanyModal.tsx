import { useState, useEffect } from 'react'
import { Mi } from '@/components/ui/Mi'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { createCompanyFormationAction } from '@/app/(app)/commercial/companies/actions'
import { getActiveLawyersAction } from '@/app/(app)/settings/users/actions'
import { FORMATION_SERVICES, IRAQ_GOVERNORATES, formatNumberWithCommas } from '@/lib/constants'
import FormationServiceChecklist from './FormationServiceChecklist'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function NewCompanyModal({ isOpen, onClose }: Props) {
  useModalBodyLock(isOpen)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // كتاب الحجز والمحافظة
  const [hasReservationLetter, setHasReservationLetter] = useState(false)
  const [reservationGovernorate, setReservationGovernorate] = useState('بغداد')

  // رأس المال والأتعاب
  const [capital, setCapital] = useState('')
  const [fee, setFee] = useState('')
  const [selectedLawyerId, setSelectedLawyerId] = useState('db13125d-3aa1-46ab-9159-8fad18746623')
  const [lawyers, setLawyers] = useState<Array<{ id: string; name: string }>>([
    { id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي' }
  ])

  useEffect(() => {
    setMounted(true)
    async function loadLawyers() {
      const res = await getActiveLawyersAction()
      if (res.success && res.data && res.data.length > 0) {
        setLawyers(res.data)
        if (!selectedLawyerId) {
          setSelectedLawyerId(res.data[0].id)
        }
      }
    }
    loadLawyers()
  }, [selectedLawyerId])

  useModalBodyLock(isOpen)

  // قائمة المساهمين / الشركاء الديناميكية مع عدد الأسهم والنسبة المئوية
  const [shareholders, setShareholders] = useState<Array<{
    id: string
    name: string
    phone: string
    share_amount: string
    share_percentage: string
  }>>([
    { id: '1', name: '', phone: '', share_amount: '', share_percentage: '100' }
  ])

  // مصفوفة الخدمات المفعلة
  const [selectedServices, setSelectedServices] = useState<string[]>(
    FORMATION_SERVICES.filter(s => s.defaultChecked).map(s => s.id)
  )

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

  // إضافة شريك جديد مع حساب الحصة المتبقية تلقائياً
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
        phone: '',
        share_amount: remainingAmount > 0 ? formatNumberWithCommas(remainingAmount) : '',
        share_percentage: remainingPct > 0 ? remainingPct.toString() : '',
      }
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

  // تحديث بيانات الشريك مع الحساب التبادلي التلقائي بين عدد الأسهم والنسبة المئوية
  const updateShareholder = (
    id: string,
    field: 'name' | 'phone' | 'share_amount' | 'share_percentage',
    value: string
  ) => {
    const capNum = parseFloat(capital.replace(/[^0-9.]/g, '')) || 0

    setShareholders(prev =>
      prev.map(sh => {
        if (sh.id !== id) return sh

        if (field === 'share_amount') {
          const formattedAmount = formatNumberWithCommas(value)
          const amountNum = parseFloat(formattedAmount.replace(/[^0-9.]/g, '')) || 0
          let calculatedPct = sh.share_percentage

          if (capNum > 0 && amountNum > 0) {
            const rawPct = (amountNum / capNum) * 100
            calculatedPct = (Math.round(rawPct * 100) / 100).toString()
          } else if (amountNum === 0) {
            calculatedPct = '0'
          }

          return {
            ...sh,
            share_amount: formattedAmount,
            share_percentage: calculatedPct,
          }
        }

        if (field === 'share_percentage') {
          const cleanPct = value.replace(/[^0-9.]/g, '')
          const pctNum = parseFloat(cleanPct) || 0
          let calculatedAmount = sh.share_amount

          if (capNum > 0 && pctNum > 0) {
            const rawAmount = Math.round((pctNum / 100) * capNum)
            calculatedAmount = formatNumberWithCommas(rawAmount)
          } else if (pctNum === 0) {
            calculatedAmount = '0'
          }

          return {
            ...sh,
            share_percentage: cleanPct,
            share_amount: calculatedAmount,
          }
        }

        return { ...sh, [field]: value }
      })
    )
  }

  const toggleService = (id: string) => {
    const svc = FORMATION_SERVICES.find(s => s.id === id)
    if (svc?.locked) return
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name')?.toString()?.trim() || ''
    if (!name) {
      setError('يرجى إدخال اسم الشركة (إلزامي)')
      return
    }

    setLoading(true)

    const lawyer_id = selectedLawyerId || formData.get('lawyer_id')?.toString() || lawyers[0]?.id || 'db13125d-3aa1-46ab-9159-8fad18746623'
    const kind = shareholders.length > 1 ? 'محدودة' : 'فردية'
    const capitalRaw = capital || formData.get('capital')?.toString() || '0'
    const capitalNum = parseFloat(capitalRaw.replace(/[^0-9.]/g, '')) || 0
    const manager = formData.get('manager')?.toString()?.trim() || ''
    const activity = ''
    const phone = formData.get('phone')?.toString()?.trim() || ''
    const address = formData.get('address')?.toString()?.trim() || ''
    const has_reservation_letter = hasReservationLetter
    const reservation_letter_governorate = hasReservationLetter ? reservationGovernorate : ''
    const lacks = formData.get('lacks')?.toString()?.trim() || ''
    const status = formData.get('status')?.toString() || 'progress'
    const feeRaw = formData.get('fee')?.toString() || '0'
    const feeVal = parseFloat(feeRaw.replace(/[^0-9.]/g, '')) || 0
    const currency = formData.get('currency')?.toString() || 'IQD'
    const tx_date = formData.get('tx_date')?.toString() || new Date().toISOString().slice(0, 10)
    const due_date = formData.get('due_date')?.toString() || ''
    const notes = formData.get('notes')?.toString()?.trim() || ''

    let cleanShareholders = shareholders
      .filter(s => s.name.trim())
      .map(s => ({
        name: s.name.trim(),
        phone: s.phone.trim(),
        share_amount: parseFloat(s.share_amount.replace(/[^0-9.]/g, '')) || 0,
        share_percentage: parseFloat(s.share_percentage) || 0,
      }))

    // If no shareholders entered but manager is provided, use manager as single shareholder
    if (cleanShareholders.length === 0 && manager) {
      cleanShareholders = [{
        name: manager,
        phone: phone,
        share_amount: capitalNum,
        share_percentage: 100,
      }]
    }

    const lockedServices = FORMATION_SERVICES.filter(s => s.locked).map(s => s.id)
    const services = Array.from(new Set([...selectedServices, ...lockedServices]))

    const res = await createCompanyFormationAction({
      name,
      kind,
      capital: capitalNum,
      lawyer_id,
      manager,
      activity,
      phone,
      address,
      has_reservation_letter,
      reservation_letter_governorate,
      lacks,
      status,
      fee: feeVal,
      currency,
      services,
      tx_date,
      due_date,
      notes,
      shareholders: cleanShareholders,
    })

    setLoading(false)

    if (res.success) {
      router.refresh()
      onClose()
    } else {
      setError(res.error || 'حدث خطأ أثناء حفظ بيانات تأسيس الشركة')
    }
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-xl, 880px)' } as React.CSSProperties}>
        
        {/* Head */}
        <div className="modal-head">
          <div className="co-ico" style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <Icon name="build" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>تأسيس شركة جديدة</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>إدخال تفاصيل العميل، الأتعاب، المساهمين، والخدمات المشمولة</span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            <Icon name="x" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div className="login-err">
              {error}
            </div>
          )}

          {/* 1. بيانات الشركة الأساسية */}
          <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '16px' }}>
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--accent)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="build" />
              <span>بيانات الشركة والتأسيس</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label htmlFor="modal-co-name">اسم الشركة *</label>
                <input
                  id="modal-co-name"
                  name="name"
                  type="text"
                  required
                  className="input"
                  placeholder="مثال: شركة الرافدين للتجارة العامة والمقاولات م.م"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div className="field">
                  <label htmlFor="modal-co-capital">رأس المال (د.ع) *</label>
                  <input
                    id="modal-co-capital"
                    name="capital"
                    type="text"
                    className="input num"
                    placeholder="50,000,000"
                    value={capital}
                    onChange={e => handleCapitalChange(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="modal-co-mgr">المدير المفوض</label>
                  <input
                    id="modal-co-mgr"
                    name="manager"
                    type="text"
                    className="input"
                    placeholder="اسم المدير المفوض"
                  />
                </div>
              </div>

              {/* عنوان الشركة */}
              <div className="field">
                <label htmlFor="modal-co-address">عنوان الشركة (المقر / المحافظة / المنطقة)</label>
                <input
                  id="modal-co-address"
                  name="address"
                  type="text"
                  className="input"
                  placeholder="مثال: بغداد - الكرادة - شارع العرصات"
                />
              </div>

              {/* كتاب حجز الاسم التجاري */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--line-soft)] flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">bookmark</span>
                    <span className="text-xs font-bold text-[var(--text)]">هل تمتلك الشركة كتاب حجز اسم تجاري؟</span>
                  </div>

                  {/* Toggle Buttons: نعم / لا */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-3)] border border-[var(--line-soft)]">
                    <button
                      type="button"
                      onClick={() => setHasReservationLetter(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        hasReservationLetter
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'text-[var(--text-3)] hover:text-[var(--text)]'
                      }`}
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasReservationLetter(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        !hasReservationLetter
                          ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                          : 'text-[var(--text-3)] hover:text-[var(--text)]'
                      }`}
                    >
                      لا
                    </button>
                  </div>
                </div>

                {/* حقل محافظات العراق عند اختيار نعم */}
                {hasReservationLetter && (
                  <div className="pt-2.5 border-t border-[var(--line-soft)] flex flex-col gap-1.5 animate-fadeIn">
                    <label htmlFor="modal-reservation-gov" className="text-[11.5px] font-bold text-[var(--text-2)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-amber-500">location_on</span>
                      <span>المحافظة الصادر منها كتاب الحجز *</span>
                    </label>
                    <select
                      id="modal-reservation-gov"
                      name="reservation_letter_governorate"
                      value={reservationGovernorate}
                      onChange={e => setReservationGovernorate(e.target.value)}
                      className="input"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    >
                      {IRAQ_GOVERNORATES.map(gov => (
                        <option key={gov} value={gov}>
                          محافظة {gov}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. بيانات الشركاء / المساهمين مع الحساب التلقائي للأسهم والنسب */}
          <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--accent)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="users" />
                  <span>العميل / الشركاء المساهمون ({shareholders.length})</span>
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>(حساب تلقائي لنسبة وعدد الأسهم)</span>
              </div>
              <button
                type="button"
                onClick={addShareholder}
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px dashed var(--accent)', color: 'var(--accent)' }}
              >
                <Icon name="plus" />
                <span>أضف شريكاً إضافياً</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {shareholders.map((sh, idx) => (
                <div
                  key={sh.id}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--line-soft)]"
                >
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="w-4 h-4 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] font-bold inline-flex items-center justify-center">{idx + 1}</span>
                      <span>اسم الشريك / المساهم *</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={sh.name}
                      onChange={e => updateShareholder(sh.id, 'name', e.target.value)}
                      placeholder="الاسم الثلاثي للشريك"
                    />
                  </div>

                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      className="input num"
                      value={sh.phone}
                      onChange={e => updateShareholder(sh.id, 'phone', e.target.value)}
                      placeholder="0770XXXXXXX"
                    />
                  </div>

                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-2)', fontWeight: 600 }}>
                      عدد الأسهم (د.ع)
                    </label>
                    <input
                      type="text"
                      className="input num font-bold"
                      value={sh.share_amount}
                      onChange={e => updateShareholder(sh.id, 'share_amount', e.target.value)}
                      placeholder="مثال: 25,000,000"
                    />
                  </div>

                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 700 }}>
                      النسبة المئوية (%)
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="input num font-extrabold text-[var(--accent)]"
                        style={{ paddingLeft: '24px' }}
                        value={sh.share_percentage}
                        onChange={e => updateShareholder(sh.id, 'share_percentage', e.target.value)}
                        placeholder="50"
                      />
                      <span style={{ position: 'absolute', left: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--accent)' }}>%</span>
                    </div>
                  </div>

                  {shareholders.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeShareholder(sh.id)}
                      className="btn btn-ghost"
                      style={{ color: 'var(--bad)', padding: '8px', marginBottom: '2px' }}
                      title="حذف الشريك"
                    >
                      ✕
                    </button>
                  ) : (
                    <div style={{ width: '28px' }} />
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
                      padding: '12px 16px',
                      borderRadius: 'var(--r-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-3)' }}>إجمالي رأس المال: </span>
                        <strong className="num" style={{ color: 'var(--text)' }}>{capital || '0'} د.ع</strong>
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-3)' }}>المجموع الموزع: </span>
                        <strong className="num" style={{ color: isOver ? 'var(--bad)' : 'var(--accent)' }}>
                          {formatNumberWithCommas(totalAllocatedShares)} د.ع ({totalAllocatedPct}%)
                        </strong>
                      </div>
                      {remainingShares > 0 && (
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-3)' }}>المتبقي غير الموزع: </span>
                          <strong className="num" style={{ color: 'var(--warn, #f59e0b)' }}>
                            {formatNumberWithCommas(remainingShares)} د.ع ({remainingPct}%)
                          </strong>
                        </div>
                      )}
                    </div>

                    <div>
                      {isMatched ? (
                        <span className="tag tag-ok" style={{ fontSize: '11px', fontWeight: 700 }}>
                          ✓ توزيع الحصص مكتمل 100%
                        </span>
                      ) : isOver ? (
                        <span className="tag tag-bad" style={{ fontSize: '11px', fontWeight: 700 }}>
                          <Mi n="warning" />مجموع الحصص يتجاوز 100% ({totalAllocatedPct}%)
                        </span>
                      ) : (
                        <span className="tag" style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          <Mi n="hourglass_top" />متبقي غير موزع: {remainingPct}%
                        </span>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* 3. الأتعاب والخدمات المشمولة */}
          <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '16px' }}>
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--accent)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="wallet" />
              <span>تفاصيل المعاملة والأتعاب والخدمات</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="field">
                  <label htmlFor="modal-tx-status">حالة المعاملة</label>
                  <select id="modal-tx-status" name="status" className="input" defaultValue="progress">
                    <option value="progress">قيد الإنجاز (Under Processing)</option>
                    <option value="done">مكتملة (Completed)</option>
                    <option value="hold">معلقة (Pending)</option>
                    <option value="lacks">نواقص مستندات (Missing Documents)</option>
                    <option value="fees">أُستلمت الأتعاب (Fees Received)</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="modal-tx-fee">المبلغ المستلم / الأتعاب</label>
                  <input
                    id="modal-tx-fee"
                    name="fee"
                    type="text"
                    className="input num"
                    placeholder="1,500,000"
                    value={fee}
                    onChange={e => setFee(formatNumberWithCommas(e.target.value))}
                  />
                </div>

                <div className="field">
                  <label htmlFor="modal-tx-curr">العملة</label>
                  <select id="modal-tx-curr" name="currency" className="input" defaultValue="IQD">
                    <option value="IQD">دينار عراقي (IQD)</option>
                    <option value="USD">دولار أمريكي (USD $)</option>
                  </select>
                </div>
              </div>

              {/* مربعات اختيار الخدمات المشمولة */}
              <FormationServiceChecklist selected={selectedServices} onToggle={toggleService} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="field">
                  <label htmlFor="modal-tx-lawyer" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                    المحامي المكلّف / المسؤول *
                  </label>
                  <select
                    id="modal-tx-lawyer"
                    name="lawyer_id"
                    className="input"
                    value={selectedLawyerId}
                    onChange={e => setSelectedLawyerId(e.target.value)}
                  >
                    {lawyers.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="modal-tx-start">تاريخ بدء المعاملة</label>
                  <input
                    id="modal-tx-start"
                    name="tx_date"
                    type="date"
                    className="input"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="modal-tx-due">تاريخ الإنجاز المتوقع</label>
                  <input
                    id="modal-tx-due"
                    name="due_date"
                    type="date"
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. الملاحظات والنواقص */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div className="field">
              <label htmlFor="modal-co-notes">ملاحظات المعاملة والتفاصيل</label>
              <textarea
                id="modal-co-notes"
                name="notes"
                rows={2}
                className="input"
                placeholder="تفاصيل العقد والملاحظات الخاصة..."
              />
            </div>

            <div className="field">
              <label htmlFor="modal-co-lacks">نواقص المستندات (المطلوبات)</label>
              <textarea
                id="modal-co-lacks"
                name="lacks"
                rows={2}
                className="input"
                placeholder="مثال: صورة قيد الأحوال، الميزانية التدقيقية..."
              />
            </div>
          </div>

          {/* Foot */}
          <div className="modal-foot" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {error && (
              <div className="login-err" style={{ width: '100%', marginBottom: 0 }}>
                <Mi n="warning" />{error}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '160px' }}>
                {loading ? 'جاري التأسيس...' : 'تأسيس الشركة وتوليد سير العمل'}
              </button>
              <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading}>
                إلغاء
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
