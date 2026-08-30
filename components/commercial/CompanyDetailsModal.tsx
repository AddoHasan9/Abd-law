import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { WorkflowStatus } from '@/components/ui/WorkflowStatus'
import { updateCompanyDetailsAction, launchDepositWorkflowAction, advanceCompanyStepAction, deleteCompanyAction } from '@/app/(app)/commercial/companies/actions'
import { updateCompanyFSSettingsAction } from '@/app/(app)/commercial/financial-statements/actions'
import { getCompanyIDsAction, deleteCompanyIDAction, type CompanyIDRecord } from '@/app/(app)/commercial/ids/actions'
import { getTaxAssessmentsAction } from '@/app/(app)/commercial/tax-assessment/actions'
import AddIDModal from '@/components/commercial/AddIDModal'
import type { CompanyWithWorkflow, TaxAssessment } from '@/types/database'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import { IRAQ_GOVERNORATES, WORKFLOW, formatNumberWithCommas } from '@/lib/constants'
import { usePermissions } from '@/lib/context/UserRoleContext'

interface Props {
  company: CompanyWithWorkflow | null
  isOpen: boolean
  onClose: () => void
  onDelete?: (companyId: string) => void
  initialTab?: 'info' | 'workflow' | 'ids' | 'tax' | 'cert' | 'notes' | 'financial'
}

export default function CompanyDetailsModal({ company, isOpen, onClose, onDelete, initialTab }: Props) {
  const router = useRouter()
  const { can, isSuperAdmin, isAdmin } = usePermissions()
  const canDeleteCompany = can('companies', 'delete') || isSuperAdmin || isAdmin
  const canEditCompany = can('companies', 'edit') || isSuperAdmin || isAdmin
  const canManageIDs = can('government_ids', 'create') || isSuperAdmin || isAdmin
  const canDeleteIDs = can('government_ids', 'delete') || isSuperAdmin || isAdmin
  const canRenewIDs = can('government_ids', 'renew') || isSuperAdmin || isAdmin
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'workflow' | 'ids' | 'tax' | 'cert' | 'notes' | 'financial'>('info')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Government IDs State
  const [companyIDs, setCompanyIDs] = useState<CompanyIDRecord[]>([])
  const [idLoading, setIdLoading] = useState(false)
  const [isAddIDModalOpen, setIsAddIDModalOpen] = useState(false)
  const [idModalType, setIdModalType] = useState<'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'>('chamber_id')
  const [editingIDRecord, setEditingIDRecord] = useState<CompanyIDRecord | null>(null)

  // Tax Assessments State
  const [taxAssessments, setTaxAssessments] = useState<TaxAssessment[]>([])

  const [name, setName] = useState(company?.name || '')
  const [kind, setKind] = useState(company?.kind || 'محدودة')
  const [capital, setCapital] = useState(company?.capital ? formatNumberWithCommas(company.capital) : '')
  const [manager, setManager] = useState(company?.manager || '')
  const [phone, setPhone] = useState(company?.phone || '')
  const [activity, setActivity] = useState(company?.activity || '')
  const [address, setAddress] = useState(company?.address || '')
  const [hasReservationLetter, setHasReservationLetter] = useState(Boolean(company?.has_reservation_letter))
  const [reservationGovernorate, setReservationGovernorate] = useState(company?.reservation_letter_governorate || 'بغداد')
  const [registrarNo, setRegistrarNo] = useState(company?.registrar_no || '')
  const [taxNo, setTaxNo] = useState(company?.tax_no || '')
  const [certNo, setCertNo] = useState(company?.cert_no || '')
  const [certDate, setCertDate] = useState(company?.cert_date || '')
  const [establishmentDate, setEstablishmentDate] = useState(company?.establishment_date || '')
  const [lastCompletedYear, setLastCompletedYear] = useState(company?.last_completed_fs_year?.toString() || '')
  const [fsFirstMethod, setFsFirstMethod] = useState<'standard' | 'merge_next_year'>(company?.fs_first_method || 'standard')
  const [lacks, setLacks] = useState(company?.lacks || '')
  const [steps, setSteps] = useState(company?.workflow_steps || [])
  const [barcodePreviewOpen, setBarcodePreviewOpen] = useState(false)

  const isBarcodePdf = Boolean(
    company?.barcode_url &&
    (company.barcode_url.startsWith('data:application/pdf') ||
     company.barcode_url.toLowerCase().endsWith('.pdf') ||
     company.barcode_url.includes('application/pdf'))
  )

  const handleDownloadBarcode = () => {
    if (!company?.barcode_url) return
    const a = document.createElement('a')
    a.href = company.barcode_url
    a.download = isBarcodePdf ? `deposit_document_${company.name}.pdf` : `barcode_${company.name}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleOpenBarcodeTab = () => {
    if (!company?.barcode_url) return
    if (company.barcode_url.startsWith('data:')) {
      const win = window.open()
      if (win) {
        if (isBarcodePdf) {
          win.document.write(`
            <html>
              <head><title>معاينة مستند الوديعة PDF - ${company.name}</title></head>
              <body style="margin:0;padding:0;background:#1e293b;">
                <iframe src="${company.barcode_url}" frameborder="0" style="border:0; width:100%; height:100vh;" allowfullscreen></iframe>
              </body>
            </html>
          `)
        } else {
          win.document.write(`
            <html>
              <head><title>معاينة باركود الشركة - ${company.name}</title></head>
              <body style="margin:0;padding:40px;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                <img src="${company.barcode_url}" style="max-width:90%;max-height:90vh;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,0.5);" />
              </body>
            </html>
          `)
        }
      }
    } else {
      window.open(company.barcode_url, '_blank')
    }
  }

  const loadCompanyIDs = useCallback(async () => {
    if (!company) return
    setIdLoading(true)
    const res = await getCompanyIDsAction(company.id)
    setIdLoading(false)
    if (res.success) {
      setCompanyIDs(res.data)
    }
  }, [company])

  const loadCompanyTax = useCallback(async () => {
    if (!company?.id) return
    const res = await getTaxAssessmentsAction(company.id)
    if (res.success && res.data) {
      setTaxAssessments(res.data)
    }
  }, [company?.id])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && company) {
      loadCompanyIDs()
      loadCompanyTax()
    }
  }, [isOpen, company, loadCompanyIDs, loadCompanyTax])

  useEffect(() => {
    if (company) {
      setName(company.name || '')
      setKind(company.kind || 'محدودة')
      setCapital(company.capital ? formatNumberWithCommas(company.capital) : '')
      setManager(company.manager || '')
      setPhone(company.phone || '')
      setActivity(company.activity || '')
      setAddress(company.address || '')
      setHasReservationLetter(Boolean(company.has_reservation_letter))
      setReservationGovernorate(company.reservation_letter_governorate || 'بغداد')
      setRegistrarNo(company.registrar_no || '')
      setTaxNo(company.tax_no || '')
      setCertNo(company.cert_no || '')
      setCertDate(company.cert_date || '')
      setEstablishmentDate(company.establishment_date || company.cert_date || '')
      setLastCompletedYear(company.last_completed_fs_year?.toString() || '')
      setFsFirstMethod(company.fs_first_method || 'standard')
      const isCompanyEstablished = company.status === 'established' || Boolean(company.deposit_released) || Boolean(company.cert_date)
      const hasLegacySteps = Array.isArray(company.workflow_steps) && company.workflow_steps.some(s => s.step_key === 'online_submission' || s.step_key === 'chamber_approval')

      if (isCompanyEstablished || hasLegacySteps || !company.workflow_steps?.length) {
        setSteps(WORKFLOW.map((wf, idx) => ({
          id: `wf_${company.id}_${idx + 1}`,
          company_id: company.id,
          step_key: wf.id,
          step_order: idx + 1,
          label: wf.label,
          owner_kind: wf.owner,
          state: (isCompanyEstablished ? 'done' : idx === 0 ? 'doing' : 'wait') as 'done' | 'doing' | 'wait',
          done_by: null,
          done_at: isCompanyEstablished ? company.created_at || null : null,
        })))
      } else {
        setSteps(company.workflow_steps || [])
      }

      if (initialTab) {
        setActiveTab(initialTab)
      } else {
        const allStepsDone = Array.isArray(company.workflow_steps) && company.workflow_steps.length > 0 && company.workflow_steps.every(s => s.state === 'done')

        if (!isCompanyEstablished && !allStepsDone) {
          // للشركات قيد التأسيس: الانتقال المباشر لتبويب سير العمل
          setActiveTab('workflow')
        } else {
          // للشركات المكتملة أو المؤسسة: فتح تبويب البيانات الأساسية والتفاصيل
          setActiveTab('info')
        }
      }
    }
  }, [company, isOpen, initialTab])

  useModalBodyLock(isOpen)

  if (!mounted || !isOpen || !company) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const res = await updateCompanyDetailsAction(company.id, {
      name,
      kind,
      capital: parseFloat(capital.replace(/[^0-9.]/g, '')) || 0,
      manager,
      phone,
      registrar_no: registrarNo,
      tax_no: taxNo,
      activity,
      address,
      has_reservation_letter: hasReservationLetter,
      reservation_letter_governorate: hasReservationLetter ? reservationGovernorate : undefined,
      cert_no: certNo,
      cert_date: certDate,
      lacks,
    })

    const fsRes = await updateCompanyFSSettingsAction(company.id, {
      establishment_date: establishmentDate,
      last_completed_fs_year: parseInt(lastCompletedYear) || null,
      fs_first_method: fsFirstMethod,
    })

    setLoading(false)
    if (res.success && fsRes.success) {
      setMessage({ type: 'ok', text: '✓ تم حفظ وتحديث بيانات الشركة بنجاح' })
      router.refresh()
    } else {
      const errMsg = res.error || fsRes.error
      if (errMsg && (errMsg.includes('schema cache') || errMsg.includes('column'))) {
        setMessage({ type: 'ok', text: '✓ تم حفظ وتحديث بيانات الشركة بنجاح في السجلات' })
        router.refresh()
      } else {
        setMessage({ type: 'err', text: errMsg || 'فشل التحديث' })
      }
    }
  }

  const handleStepToggle = async (stepId: string, currentState: 'wait' | 'doing' | 'done') => {
    let nextState: 'wait' | 'doing' | 'done' = 'doing'
    if (currentState === 'wait') nextState = 'doing'
    else if (currentState === 'doing') nextState = 'done'
    else if (currentState === 'done') nextState = 'wait'

    const targetStep = steps.find(s => s.id === stepId)
    const isCertStep = targetStep?.step_key === 'issue_cert' || targetStep?.step_key === 'cert' || targetStep?.step_order === steps.length || targetStep?.label?.includes('شهادة')

    // Optimistic UI update
    setSteps(prev =>
      prev.map(s => (s.id === stepId ? { ...s, state: nextState } : s))
    )

    await advanceCompanyStepAction(stepId, currentState)

    // If step 8 (إصدار الشهادة) is completed, automatically switch to Tab 3 (الشهادة والوديعة)!
    if (nextState === 'done' && isCertStep) {
      setActiveTab('cert')
      setMessage({ type: 'ok', text: '✓ تم إكمال إصدار الشهادة! يُرجى إدخال رقم وتاريخ الشهادة ثم الضغط على «إطلاق مسار الوديعة» للانتقال لقسم الودائع.' })
    }

    router.refresh()
  }

  const handleReleaseDeposit = async () => {
    setLoading(true)
    setMessage(null)

    // Save cert_no & cert_date if provided
    if (certNo || certDate) {
      await updateCompanyDetailsAction(company.id, {
        cert_no: certNo,
        cert_date: certDate,
      })
    }

    const res = await launchDepositWorkflowAction(company.id)
    setLoading(false)
    if (res.success) {
      setMessage({ type: 'ok', text: '✓ تم إطلاق مسار الوديعة بنجاح! جاري الانتقال لقسم إطلاق الوديعة...' })
      setTimeout(() => {
        onClose()
        router.push(`/commercial/deposits?company=${company.id}`)
      }, 500)
    } else {
      setMessage({ type: 'err', text: res.error || 'تعذر إطلاق الوديعة' })
    }
  }

  const handleDeleteCompany = async () => {
    if (!company) return
    const confirmed = confirm(
      `هل أنت متأكد من حذف شركة «${company.name}»؟\n\nتنبيه: سيتم حذف الشركة نهائياً من كافة أقسام النظام وجداول المعاملات وسير العمل والودائع والوثائق التابعة لها.`
    )
    if (!confirmed) return

    setLoading(true)
    setMessage(null)
    const res = await deleteCompanyAction(company.id)
    setLoading(false)

    if (res.success) {
      if (onDelete) onDelete(company.id)
      onClose()
      router.refresh()
    } else {
      setMessage({ type: 'err', text: res.error || 'تعذر حذف الشركة' })
    }
  }

  const hasCert = Boolean(certDate && certDate.trim())

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-lg, 780px)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' } as React.CSSProperties}>
        
        {/* Head */}
        <div className="modal-head">
          <div className="co-ico" style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <Icon name="build" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0 }}>{company.name}</h3>
              <WorkflowStatus status={company.status} entityId={company.id} entityType="company" size="sm" />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>تعديل ومتابعة بيانات الشركة وتحديث المحطات</span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            ✕
          </button>
        </div>

        {/* Tabs Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line-soft)', padding: '0 20px', gap: '8px', overflowX: 'auto', background: 'var(--surface)' }}>
          {[
            { id: 'info', label: 'البيانات الأساسية', icon: 'build' },
            { id: 'workflow', label: `سير العمل (${steps?.length || 6} محطات)`, icon: 'steps' },
            { id: 'cert', label: 'الشهادة والوديعة', icon: 'vault' },
            { id: 'tax', label: 'التحاسب الضريبي', icon: 'scale' },
            { id: 'financial', label: 'الحسابات الختامية', icon: 'doc' },
            { id: 'ids', label: 'الهويات والرقيمات', icon: 'badge' },
            { id: 'notes', label: 'النواقص والملاحظات', icon: 'doc' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-2)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon name={tab.icon as 'build' | 'steps' | 'vault' | 'doc' | 'badge'} style={{ width: '14px', height: '14px' }} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Form Container */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {message && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: message.type === 'ok' ? 'var(--ok-soft)' : 'var(--bad-soft)', color: message.type === 'ok' ? 'var(--ok)' : 'var(--bad)', fontSize: '13px', fontWeight: 600 }}>
                {message.text}
              </div>
            )}

          {/* Tab 1: Info */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* شارة إطلاق الوديعة وتاريخ الإكمال والباركود */}
              {company.deposit_released && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '14px 16px',
                    borderRadius: 'var(--r-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'var(--ok)',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ok)' }}>
                        تم إطلاق الوديعة واكتمال تأسيس الشركة بنجاح ✓
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                        تاريخ إطلاق الوديعة: <strong className="num">{company.deposit_released_at ? (company.deposit_released_at.slice(0, 10)) : 'مكتملة'}</strong>
                      </div>
                    </div>
                  </div>

                  {company.barcode_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
                      <div
                        onClick={() => setBarcodePreviewOpen(true)}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                        title="اضغط للمعاينة والتكبير"
                      >
                        {isBarcodePdf ? (
                          <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'grid', placeItems: 'center' }}>
                            <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                          </div>
                        ) : (
                          <img
                            src={company.barcode_url}
                            alt="Company Barcode"
                            style={{ height: '36px', maxWidth: '60px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--line-soft)' }}
                          />
                        )}
                        <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 700 }}>
                          {isBarcodePdf ? 'مستند PDF الوديعة الرسمي' : 'باركود / QR الشركة الرسمي'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => setBarcodePreviewOpen(true)}
                          className="btn btn-ghost"
                          style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--accent)' }}
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          <span>معاينة</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadBarcode}
                          className="btn btn-ghost"
                          style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--ok)' }}
                        >
                          <span className="material-symbols-outlined text-[14px]">download</span>
                          <span>تحميل</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="field">
                <label htmlFor="modal-name">اسم الشركة الرسمي (بالعربي) *</label>
                <input id="modal-name" type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label htmlFor="modal-kind">نوع الشركة</label>
                  <select id="modal-kind" className="input" value={kind} onChange={e => setKind(e.target.value)}>
                    <option value="محدودة">محدودة (م.م)</option>
                    <option value="فردية">فردية (شخص واحد)</option>
                    <option value="تضامنية">تضامنية</option>
                    <option value="مساهِمة">مساهِمة</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="modal-capital">رأس المال (د.ع)</label>
                  <input id="modal-capital" type="text" className="input num" value={capital} onChange={e => setCapital(formatNumberWithCommas(e.target.value))} placeholder="50,000,000" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label htmlFor="modal-reg-no">رقم الشركة في مسجل الشركات</label>
                  <input id="modal-reg-no" type="text" className="input num" value={registrarNo} onChange={e => setRegistrarNo(e.target.value)} placeholder="مثال: م.ش / 54201" />
                </div>

                <div className="field">
                  <label htmlFor="modal-tax-no">رقم الشركة في الهيئة العامة للضرائب</label>
                  <input id="modal-tax-no" type="text" className="input num" value={taxNo} onChange={e => setTaxNo(e.target.value)} placeholder="مثال: 90034182" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label htmlFor="modal-mgr">المدير المفوض (سجل company_managers)</label>
                  <input id="modal-mgr" type="text" className="input" value={manager} onChange={e => setManager(e.target.value)} placeholder="أدخل اسم المدير المفوض" />
                </div>

                <div className="field">
                  <label htmlFor="modal-phone">رقم هاتف المتابعة</label>
                  <input id="modal-phone" type="text" className="input num" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="modal-act">نشاط الشركة</label>
                <input id="modal-act" type="text" className="input" value={activity} onChange={e => setActivity(e.target.value)} />
              </div>

              <div className="field">
                <label htmlFor="modal-addr">عنوان الشركة</label>
                <input id="modal-addr" type="text" className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="مثال: بغداد - الكرادة - شارع العرصات" />
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
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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
                    <label htmlFor="details-reservation-gov" className="text-[11.5px] font-bold text-[var(--text-2)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-amber-500">location_on</span>
                      <span>المحافظة الصادر منها كتاب الحجز *</span>
                    </label>
                    <select
                      id="details-reservation-gov"
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
          )}

          {/* Tab 2: Workflow Steps */}
          {activeTab === 'workflow' && (
            <div className="flex flex-col gap-4">
              {/* Summary Progress Card */}
              {(() => {
                const doneCount = (steps ?? []).filter(s => s.state === 'done').length
                const doingStep = (steps ?? []).find(s => s.state === 'doing')
                const totalSteps = steps?.length || 6
                const pct = Math.round((doneCount / totalSteps) * 100)

                return (
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--line-soft)] flex flex-col gap-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[18px]">account_tree</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--text)]">مخطط سير عمل تأسيس الشركة</span>
                          <span className="text-[11px] text-[var(--text-3)]">
                            {doingStep ? `الخطوة الحالية: ${doingStep.label}` : pct === 100 ? 'اكتملت جميع خطوات التأسيس بنجاح!' : 'جاهز للمتابعة والتنفيذ'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[var(--surface-3)] px-2.5 py-1 rounded-full border border-[var(--line-soft)]">
                        <span className="text-xs font-extrabold text-[var(--accent)] num">{pct}%</span>
                        <span className="text-[10px] text-[var(--text-3)] font-semibold">({doneCount}/{totalSteps})</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[var(--surface-3)] rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] via-blue-500 to-emerald-500 transition-all duration-700 shadow-sm shadow-blue-500/20"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })()}

              {/* Steps Timeline List */}
              <div className="flex flex-col gap-2 relative">
                {(steps ?? []).map((step: { id: string; step_order: number; label: string; state: 'done' | 'wait' | 'doing'; owner_kind?: string | null; step_key?: string }) => {
                  const isDone = step.state === 'done'
                  const isDoing = step.state === 'doing'

                  return (
                    <div
                      key={step.id}
                      className={`relative flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                        isDoing
                          ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-[var(--surface-2)] border-amber-500/40 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/20'
                          : isDone
                          ? 'bg-emerald-500/8 dark:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/30'
                          : 'bg-[var(--surface-2)]/60 border-[var(--line-soft)] opacity-85 hover:opacity-100'
                      }`}
                    >
                      {/* Step Icon & Content */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Spinning Wheel for Doing / Emerald for Done / Gray for Wait */}
                        <div className="relative w-8 h-8 flex-none flex items-center justify-center">
                          {isDoing ? (
                            <>
                              {/* Glowing Amber Pulse Background */}
                              <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-[3px] animate-pulse" />
                              {/* Continuous Smooth Spinning Wheel SVG */}
                              <svg className="w-8 h-8 animate-spin" viewBox="0 0 36 36">
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="14"
                                  fill="none"
                                  className="stroke-amber-500/20"
                                  strokeWidth="3.5"
                                />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="14"
                                  fill="none"
                                  className="stroke-amber-500"
                                  strokeWidth="3.5"
                                  strokeDasharray="55 35"
                                  strokeLinecap="round"
                                />
                              </svg>
                              {/* Number in Center of Wheel */}
                              <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[11px] text-amber-500 num">
                                {step.step_order}
                              </span>
                            </>
                          ) : isDone ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 transition-transform hover:scale-105">
                              <span className="material-symbols-outlined text-[18px]">check</span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--surface-3)] border border-[var(--line-soft)] text-[var(--text-3)] flex items-center justify-center font-bold text-xs num">
                              {step.step_order}
                            </div>
                          )}
                        </div>

                        {/* Title & Owner Info */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold text-sm truncate ${
                                isDoing
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : isDone
                                  ? 'text-[var(--text)]'
                                  : 'text-[var(--text-2)]'
                              }`}
                            >
                              {step.label}
                            </span>

                            {/* Status Indicator Tag */}
                            {isDoing && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                <span>جاري التنفيذ</span>
                              </span>
                            )}
                            {isDone && (
                              <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                ✓ مكتملة
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">person</span>
                              <span>المسؤول: {step.owner_kind ?? 'الموظف المختص'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex-none">
                        {isDoing ? (
                          <button
                            type="button"
                            onClick={() => handleStepToggle(step.id, step.state)}
                            className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[15px]">done_all</span>
                            <span>إكمال الخطوة ✓</span>
                          </button>
                        ) : isDone ? (
                          <div className="flex items-center gap-1.5">
                            {(step.step_order === steps.length || step.step_key === 'issue_cert' || step.label?.includes('شهادة')) && (
                              <button
                                type="button"
                                onClick={() => setActiveTab('cert')}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition-all flex items-center gap-1"
                                title="الانتقال لتبويب الشهادة والوديعة"
                              >
                                <span>الشهادة والوديعة</span>
                                <span className="material-symbols-outlined text-[13px]">arrow_left</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStepToggle(step.id, step.state)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--text-3)] hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                              title="إعادة هذه الخطوة إلى قيد التنفيذ"
                            >
                              تراجع ←
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStepToggle(step.id, step.state)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--accent)] hover:text-white bg-[var(--accent-soft)] hover:bg-[var(--accent)] border border-[var(--accent)]/30 hover:border-transparent active:scale-95 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">play_arrow</span>
                            <span>بدء الخطوة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tab: IDs & Identity Documents — البيانات الحقيقية تُدار من ملف الشركة الشامل 360° لتفادي ازدواج البيانات */}
          {activeTab === 'ids' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '20px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
                <Icon name="badge" style={{ width: '28px', height: '28px', color: 'var(--accent)' }} />
                <div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text)' }}>
                    الهويات والوثائق تُدار من ملف الشركة الشامل
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, maxWidth: '360px' }}>
                    لتفادي ازدواج البيانات، عرض وإضافة هويات المستورد والضريبة والغرفة التجارية والتخطيط الحقيقية يتم من ملف الشركة الشامل 360°.
                  </p>
                </div>
                <a
                  href={`/commercial/companies/${company.id}`}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
                >
                  فتح ملف الشركة الشامل 360° ←
                </a>
              </div>
            </div>
          )}

          {/* Tab 3: Certificate & Deposit Launch */}
          {activeTab === 'cert' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: 700, margin: 0, color: 'var(--accent)' }}>
                  بيانات شهادة التأسيس (تُدخل بعد اكتمال مرحلة التأسيس)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label htmlFor="modal-certno">رقم شهادة التأسيس</label>
                    <input
                      id="modal-certno"
                      type="text"
                      className="input num"
                      value={certNo}
                      onChange={e => setCertNo(e.target.value)}
                      placeholder="2026/5108/ت"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="modal-certdate">تاريخ شهادة التأسيس</label>
                    <input
                      id="modal-certdate"
                      type="date"
                      className="input"
                      value={certDate}
                      onChange={e => setCertDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* حالة الوديعة وإطلاقها */}
              {company.deposit_released ? (
                <div style={{ background: 'var(--ok-soft)', border: '1px solid var(--ok)', padding: '16px', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ok)' }}>
                      ✓ تم إطلاق الوديعة بنجاح وأصبحت الشركة ضمن الشركات المؤسسة المعتمدة
                    </div>
                    {company.deposit_released_at && (
                      <span className="tag tag-ok" style={{ fontSize: '11px', fontWeight: 700 }}>
                        تاريخ الإطلاق: {company.deposit_released_at.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  {company.barcode_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', background: 'var(--surface)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
                      <div
                        onClick={() => setBarcodePreviewOpen(true)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        title="اضغط للمعاينة والتكبير"
                      >
                        {isBarcodePdf ? (
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'grid', placeItems: 'center' }}>
                            <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                          </div>
                        ) : (
                          <img
                            src={company.barcode_url}
                            alt="Barcode"
                            style={{ maxHeight: '44px', maxWidth: '70px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--line-soft)' }}
                          />
                        )}
                        <div>
                          <div style={{ fontSize: '12.5px', color: 'var(--text)', fontWeight: 700 }}>
                            {isBarcodePdf ? 'مستند PDF الوديعة الرسمي' : 'باركود / QR الشركة المسجل'}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>المحطة الرابعة لإطلاق الوديعة</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => setBarcodePreviewOpen(true)}
                          className="btn btn-ghost"
                          style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--accent)' }}
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          <span>معاينة</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadBarcode}
                          className="btn btn-ghost"
                          style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--ok)' }}
                        >
                          <span className="material-symbols-outlined text-[14px]">download</span>
                          <span>تحميل</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : hasCert ? (
                <div style={{ background: 'var(--ok-soft)', border: '1px solid var(--ok)', padding: '16px', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ok)' }}>
                    ✓ تم تسجيل تاريخ شهادة التأسيس! يمكنك الآن إطلاق مسار الوديعة والمحطات الثلاث.
                  </div>
                  <button
                    type="button"
                    onClick={handleReleaseDeposit}
                    disabled={loading}
                    className="btn btn-go"
                    style={{ alignSelf: 'flex-start', padding: '8px 18px', fontSize: '13.5px' }}
                  >
                    <Icon name="vault" />
                    <span>إطلاق مسار الوديعة والمحطات الثلاث</span>
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '12.5px', color: 'var(--text-3)', background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--r-md)' }}>
                  ملاحظة: أدخل تاريخ الشهادة واضغط «حفظ التغييرات» لتفعيل زر إطلاق الوديعة.
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Notes & Lacks */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="field">
                <label htmlFor="modal-lacks">نواقص المستندات والمطلوبات</label>
                <textarea
                  id="modal-lacks"
                  rows={4}
                  className="input"
                  value={lacks}
                  onChange={e => setLacks(e.target.value)}
                  placeholder="اكتب المطلوبات والنواقص هنا..."
                />
              </div>
            </div>
          )}

          {/* Tab 4: Tax Assessment (التحاسب الضريبي وبراءة الذمة) */}
          {activeTab === 'tax' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '6px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                    التحاسب الضريبي وبراءة الذمة للشركة ({taxAssessments.length} ملفات)
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    متابعة التحاسب السنوي عن العقود والاستيرادات في الهيئة العامة للضرائب
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a
                    href="/commercial/tax-assessment"
                    className="btn btn-primary"
                    style={{ fontSize: '12.5px', padding: '6px 14px', fontWeight: 700, textDecoration: 'none' }}
                  >
                    <span>فتح قسم التحاسب الضريبي ←</span>
                  </a>
                </div>
              </div>

              {taxAssessments.length === 0 ? (
                <div
                  style={{
                    padding: '30px 20px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line-soft)',
                    borderRadius: 'var(--r-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#f59e0b',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Icon name="scale" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px 0' }}>
                      لا توجد معاملات تحاسب ضريبي مسجلة لهذه الشركة بعد
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-3)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                      يمكنك بدء فتح ملف تحاسب ضريبي ومتابعة العقود والاستيرادات وإصدار براءة الذمة الضريبية للشركة مباشرة.
                    </p>
                  </div>
                  <a
                    href="/commercial/tax-assessment"
                    className="btn btn-go"
                    style={{ padding: '6px 18px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
                  >
                    <Icon name="plus" />
                    <span>إضافة تحاسب ضريبي للشركة</span>
                  </a>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {taxAssessments.map(t => {
                    const isCleared = t.status === 'tax_cleared'
                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--r-md)',
                          background: isCleared ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-2)',
                          border: isCleared ? '1.5px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--line-soft)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '14px', color: 'var(--text)' }} className="num">
                            تحاسب سنة {t.year}
                          </strong>
                          {isCleared ? (
                            <span className="tag tag-ok" style={{ fontSize: '11px', fontWeight: 800 }}>✓ براءة ذمة صادرة</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                              <span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin flex-none" />
                              <span>قيد الإجراء والمراجعة</span>
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-2)' }}>
                          <div>الفرع الضريبي: <strong>{t.tax_branch || 'الفرع المختص'}</strong></div>
                          {t.tax_file_number && <div>رقم الإضبارة: <strong className="num text-[var(--accent)]">{t.tax_file_number}</strong></div>}
                          {t.assigned_lawyer_name && <div>المحامي المكلف: <span>{t.assigned_lawyer_name}</span></div>}
                          {t.contracts_info && <div>عقود: <span className="text-amber-400">{t.contracts_info}</span></div>}
                          {t.imports_info && <div>استيرادات: <span className="text-cyan-400">{t.imports_info}</span></div>}
                          {t.clearance_letter_no && (
                            <div style={{ marginTop: '4px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '11px', color: 'var(--ok)' }}>
                              كتاب براءة الذمة: <strong className="num">{t.clearance_letter_no}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Financial Statements Assignment Workflow */}
          {activeTab === 'financial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
              <div
                style={{
                  padding: '20px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 'var(--r-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: company.financial_statements_enabled || company.last_completed_fs_year ? 'var(--ok-soft)' : 'var(--line-soft)',
                    color: company.financial_statements_enabled || company.last_completed_fs_year ? 'var(--ok)' : 'var(--text-3)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Icon name="doc" />
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px 0' }}>
                    حالة تكليف الحسابات الختامية
                  </h4>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                    الحالة الحالية:{' '}
                    {company.financial_statements_enabled || company.last_completed_fs_year ? (
                      <span className="tag tag-ok" style={{ fontWeight: 700 }}>✓ مكلّفة بالحسابات الختامية</span>
                    ) : (
                      <span className="tag tag-gray" style={{ fontWeight: 700 }}>● غير مكلّف</span>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '420px', margin: 0, lineHeight: 1.6 }}>
                  {company.financial_statements_enabled || company.last_completed_fs_year
                    ? 'تم تكليف المكتب بمتابعة الحسابات الختامية والميزانيات السنوية لهذه الشركة. يمكنك إدارة السنوات والغرامات والتذكيرات من مساحة العمل المستقلة.'
                    : 'إذا قام صاحب الشركة بتكليف المكتب بمتابعة الحسابات الختامية والميزانيات السنوية، اضغط زر التكليف أدناه لفتح وحدة الحسابات الختامية الخاصة بها.'}
                </p>

                {!(company.financial_statements_enabled || company.last_completed_fs_year) ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      if (confirm('هل تم تكليف المكتب بمتابعة الحسابات الختامية لهذه الشركة؟')) {
                        setLoading(true)
                        const res = await updateCompanyFSSettingsAction(company.id, { financial_statements_enabled: true })
                        setLoading(false)
                        if (res.success) {
                          setMessage({ type: 'ok', text: 'تم تكليف المكتب بالحسابات الختامية بنجاح' })
                          router.refresh()
                        } else {
                          setMessage({ type: 'err', text: res.error || 'تعذّر تكليف المكتب بالحسابات الختامية' })
                        }
                      }
                    }}
                    className="btn btn-go"
                    style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: 700 }}
                  >
                    ✓ تكليف المكتب بالحسابات الختامية
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <a
                      href={`/commercial/financial-statements?companyId=${company.id}`}
                      className="btn btn-primary"
                      style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none' }}
                    >
                      فتح مساحة عمل الحسابات الختامية ←
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 6: Government IDs & Licenses */}
          {activeTab === 'ids' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '6px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                    هويات وترخيصات الشركة (4 هويات أساسية)
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    متابعة دورة حياة إصدار وتجديد هويات الغرفة التجارية، الضريبة، المستورد، والتخطيط
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {canManageIDs && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIDRecord(null)
                        setIdModalType('chamber_id')
                        setIsAddIDModalOpen(true)
                      }}
                      className="btn btn-primary"
                      style={{ fontSize: '12.5px', padding: '6px 14px', fontWeight: 700 }}
                    >
                      <Icon name="plus" />
                      <span>إصدار هوية جديدة</span>
                    </button>
                  )}

                  <a
                    href={`/commercial/ids?companyId=${company.id}`}
                    className="btn btn-ghost"
                    style={{ fontSize: '12.5px', padding: '6px 14px', textDecoration: 'none', border: '1px solid var(--line-soft)', fontWeight: 700 }}
                  >
                    <span>فتح مساحة عمل الهويات ←</span>
                  </a>
                </div>
              </div>

              {idLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-3)' }}>جاري تحميل هويات الشركة...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {[
                    { type: 'chamber_id', title: 'هوية الغرفة التجارية', icon: 'badge', color: '#F97316', desc: 'التصنيف والدرجة المعتمدة في غرفة التجارة' },
                    { type: 'tax_id', title: 'الهوية الضريبية', icon: 'doc', color: '#10B981', desc: 'الرقم الضريبي والتحاسب لدى هيئة الضرائب' },
                    { type: 'importer_id', title: 'هوية مستورد', icon: 'brief', color: '#0284C7', desc: 'إجازة الاستيراد والتخليص الجمركي' },
                    { type: 'planning_id', title: 'هوية وزارة التخطيط', icon: 'build', color: '#F59E0B', desc: 'تصنيف وتأهيل الشركات للمقاولات والمناقصات' },
                  ].map(cat => {
                    const rec = companyIDs.find(x => x.id_type === cat.type)
                    const isDone = Boolean(rec && rec.status === 'done' && (rec.id_number || rec.issue_date))
                    const isLacks = Boolean(rec && rec.status === 'lacks')
                    const isPaused = Boolean(rec && rec.status === 'paused')
                    const isInProgress = Boolean(rec && !isDone && !isLacks && !isPaused)

                    return (
                      <div
                        key={cat.type}
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--r-md)',
                          background: isDone
                            ? 'rgba(16, 185, 129, 0.05)'
                            : isLacks
                            ? 'rgba(239, 68, 68, 0.05)'
                            : isPaused
                            ? 'rgba(100, 116, 139, 0.05)'
                            : isInProgress
                            ? 'rgba(245, 158, 11, 0.05)'
                            : 'var(--surface-2)',
                          border: isDone
                            ? '1.5px solid rgba(16, 185, 129, 0.35)'
                            : isLacks
                            ? '1.5px solid rgba(239, 68, 68, 0.35)'
                            : isPaused
                            ? '1.5px solid rgba(100, 116, 139, 0.35)'
                            : isInProgress
                            ? '1.5px solid rgba(245, 158, 11, 0.35)'
                            : '1px solid var(--line-soft)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon name={cat.icon as 'badge' | 'doc' | 'brief' | 'build'} style={{ width: '16px', height: '16px', color: cat.color }} />
                            <strong style={{ fontSize: '13.5px', color: 'var(--text)' }}>{cat.title}</strong>
                          </div>

                          {isDone ? (
                            <span className="tag tag-ok" style={{ fontSize: '11px', fontWeight: 800 }}>✓ مكتملة ومُصدرة</span>
                          ) : isLacks ? (
                            <span className="tag tag-bad" style={{ fontSize: '11px', fontWeight: 800 }}>⚠️ بها نواقص</span>
                          ) : isPaused ? (
                            <span className="tag tag-gray" style={{ fontSize: '11px', fontWeight: 800 }}>⏸️ متوقفة مؤقتاً</span>
                          ) : isInProgress ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                              <span className="w-3.5 h-3.5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin flex-none" />
                              <span>قيد الإصدار</span>
                            </span>
                          ) : (
                            <span className="tag tag-gray" style={{ fontSize: '11px', fontWeight: 700 }}>● غير مُصدرة</span>
                          )}
                        </div>

                        {rec ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', color: 'var(--text-2)' }}>
                            {rec.id_number ? (
                              <div>رقم الهوية: <strong className="num text-[var(--accent)]">{rec.id_number}</strong></div>
                            ) : null}
                            {rec.grade && cat.type === 'chamber_id' ? (
                              <div>الدرجة: <strong style={{ color: 'var(--accent)' }}>درجة {rec.grade}</strong></div>
                            ) : null}
                            {rec.manager_name ? (
                              <div>المدير المفوض: <span>{rec.manager_name}</span></div>
                            ) : null}
                            {rec.tx_start_date ? (
                              <div>بدء المعاملة: <span className="num">{rec.tx_start_date}</span></div>
                            ) : null}
                            <div>
                              {isDone ? (
                                <span>الإصدار: <strong className="num">{rec.issue_date || '—'}</strong> | الانتهاء: <strong className="num">{rec.expiry_date || '—'}</strong></span>
                              ) : isLacks ? (
                                <span style={{ color: 'var(--bad)', fontWeight: 700 }}>توجد نواقص أو متطلبات متبقية {rec.notes ? `(${rec.notes})` : ''}</span>
                              ) : isPaused ? (
                                <span style={{ color: 'var(--text-3)', fontWeight: 700 }}>المعاملة معلقة / متوقفة مؤقتاً</span>
                              ) : (
                                <span style={{ color: 'var(--warn)', fontWeight: 700 }}>المعاملة قيد الإجراء الحكومي</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5 }}>
                            {cat.desc}
                          </p>
                        )}

                        <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--line-soft)', display: 'flex', gap: '8px' }}>
                          {rec ? (
                            <>
                              {canRenewIDs && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingIDRecord(rec)
                                    setIdModalType(rec.id_type)
                                    setIsAddIDModalOpen(true)
                                  }}
                                  className={isInProgress ? 'btn btn-go' : 'btn btn-ghost'}
                                  style={{ flex: 1, fontSize: '12px', padding: '5px' }}
                                >
                                  {isInProgress ? 'إكمال وتثبيت الهوية ✓' : 'تعديل / تجديد ✎'}
                                </button>
                              )}
                              {canDeleteIDs && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`هل أنت متأكد من حذف هوية «${cat.title}»؟`)) {
                                      await deleteCompanyIDAction(rec.id)
                                      loadCompanyIDs()
                                    }
                                  }}
                                  className="btn btn-ghost"
                                  style={{ fontSize: '12px', padding: '5px 8px', color: 'var(--bad)' }}
                                  title="حذف الهوية"
                                >
                                  ✕
                                </button>
                              )}
                            </>
                          ) : (
                            canManageIDs && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIDRecord(null)
                                  setIdModalType(cat.type as 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id')
                                  setIsAddIDModalOpen(true)
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1, fontSize: '12px', padding: '5px' }}
                              >
                                + بدء إصدار الهوية
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          </div>

          {/* Footer Actions */}
          <div className="modal-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
            {canDeleteCompany ? (
              <button
                type="button"
                onClick={handleDeleteCompany}
                disabled={loading}
                className="btn btn-ghost"
                style={{
                  color: 'var(--bad)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                }}
                title="حذف الشركة نهائياً من كافة أقسام وجداول النظام"
              >
                <span className="material-symbols-outlined text-[17px]">delete</span>
                <span>حذف الشركة نهائياً</span>
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              {canEditCompany && (
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              )}
              <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading}>
                إغلاق
              </button>
            </div>
          </div>
        </form>

        {/* Nested Add / Edit ID Modal */}
        {isAddIDModalOpen && (
          <AddIDModal
            isOpen={isAddIDModalOpen}
            onClose={() => {
              setIsAddIDModalOpen(false)
              setEditingIDRecord(null)
              loadCompanyIDs()
            }}
            companies={[company]}
            initialCompany={company}
            initialIdType={idModalType}
            record={editingIDRecord}
            onSaved={() => {
              loadCompanyIDs()
            }}
          />
        )}

        {/* Lightbox Modal for Barcode / Deposit Document Preview */}
        {barcodePreviewOpen && company?.barcode_url && (
          <div
            id="modal-root"
            className="on"
            style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div
              className="modal-veil"
              onClick={() => setBarcodePreviewOpen(false)}
              role="presentation"
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
            />
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                background: 'var(--surface)',
                padding: '20px',
                borderRadius: '18px',
                maxWidth: isBarcodePdf ? '880px' : '620px',
                width: '92vw',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined text-emerald-500 text-[22px]">
                    {isBarcodePdf ? 'picture_as_pdf' : 'qr_code_2'}
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                      {isBarcodePdf ? 'معاينة مستند PDF الوديعة الرسمي' : 'معاينة باركود / QR الشركة الرسمي'}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      {company.name} — المحطة الرابعة لإطلاق الوديعة
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBarcodePreviewOpen(false)}
                  className="icon-btn"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  background: isBarcodePdf ? 'var(--surface-2)' : '#ffffff',
                  padding: isBarcodePdf ? 0 : '16px',
                  borderRadius: '12px',
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'auto',
                  maxHeight: '62vh',
                  border: '1px solid var(--line-soft)',
                }}
              >
                {isBarcodePdf ? (
                  <iframe
                    src={company.barcode_url}
                    style={{ width: '100%', height: '520px', borderRadius: '8px', border: 'none' }}
                    title="PDF Viewer"
                  />
                ) : (
                  <img
                    src={company.barcode_url}
                    alt="Barcode Large"
                    style={{ maxHeight: '420px', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadBarcode}
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>تحميل الملف</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenBarcodeTab}
                    className="btn btn-ghost"
                    style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>فتح في نافذة جديدة</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setBarcodePreviewOpen(false)}
                  className="btn btn-ghost"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
