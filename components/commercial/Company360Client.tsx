'use client'

import { useState, useMemo, useEffect } from 'react'
import { Mi } from '@/components/ui/Mi'
import { confirmAction } from '@/components/ui/ConfirmDialog'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatMoney, formatDate, formatNumberWithCommas } from '@/lib/constants'
import { Icon } from '@/components/ui/Icon'
import { WorkflowStatus } from '@/components/ui/WorkflowStatus'
import { calculateCompanyStatus } from '@/lib/status-engine'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import type { CompanyWithWorkflow, FinancialStatement, DepositStage, CompanyIDRecord, ReminderItem, UserRole, AccountingBreakdown, Trademark, ViewCompanyTimeline, TaxAssessment } from '@/types/database'
import {
  updateCompanyDetailsAction,
  launchDepositWorkflowAction,
  addCompanyDocumentAction,
  addCompanyAuditLogAction,
  advanceCompanyStepAction,
} from '@/app/(app)/commercial/companies/actions'
import { updateDepositStageStateAction, uploadCompanyBarcodeAction } from '@/app/(app)/commercial/deposits/actions'
import { updateCompanyFSSettingsAction, createFinancialStatementAction } from '@/app/(app)/commercial/financial-statements/actions'
import { updateTransactionStatusAction } from '@/app/(app)/commercial/actions'
import { createTrademarkAction } from '@/app/(app)/commercial/trademarks/actions'
import AddFinancialStatementModal from '@/components/financial-statements/AddFinancialStatementModal'
import AddIDModal from '@/components/commercial/AddIDModal'
import ReminderModal from '@/components/reminders/ReminderModal'
import BarcodeUploader from '@/components/commercial/BarcodeUploader'
import WorkflowTimelineMotion from '@/components/commercial/WorkflowTimelineMotion'
import { usePermissions } from '@/lib/context/UserRoleContext'
import { useDragScroll } from '@/lib/hooks/useDragScroll'

interface Props {
  company: CompanyWithWorkflow
  ids: CompanyIDRecord[]
  financialStatements: FinancialStatement[]
  taxAssessments?: TaxAssessment[]
  deposit: { id: string; started_at: string; deposit_stages: DepositStage[] } | null
  documents: Array<{ id: string; name: string; category: string; url?: string; created_at: string }>
  trademarks: Trademark[]
  timeline: ViewCompanyTimeline[]
  reminders?: ReminderItem[]
  currentUserRole?: UserRole
}

const TIMELINE_EVENT_LABELS: Record<string, string> = {
  company_created: 'تأسيس',
  cert_issued: 'شهادة',
  deposit_started: 'وديعة',
  note: 'نشاط',
}

export const ALL_ID_TYPES: Array<{ type: 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'; label: string; tagClass: string }> = [
  { type: 'tax_id', label: 'هوية ضريبية', tagClass: 'tag-ok' },
  { type: 'chamber_id', label: 'هوية الغرفة التجارية', tagClass: 'tag-orange' },
  { type: 'importer_id', label: 'هوية مستورد', tagClass: 'tag-blue' },
  { type: 'planning_id', label: 'هوية التخطيط', tagClass: 'tag-warn' },
]

type TabType = 'all' | 'workflow' | 'basic' | 'shareholders' | 'manager' | 'deposit' | 'ids' | 'tax' | 'fs' | 'trademarks' | 'docs' | 'notes' | 'timeline'

export default function Company360Client({
  company,
  ids = [],
  financialStatements = [],
  taxAssessments = [],
  deposit,
  documents = [],
  trademarks = [],
  timeline = [],
}: Props) {
  const router = useRouter()
  const { can } = usePermissions()
  const canEdit = can('companies', 'edit')
  const canReleaseDeposit = can('deposits', 'release')
  const canCreateDeposit = can('deposits', 'create')
  const canManageIDs = can('government_ids', 'create')
  const canRenewIDs = can('government_ids', 'renew')

  const [activeTab, setActiveTab] = useState<TabType>('all')
  const navTabsScrollRef = useDragScroll<HTMLDivElement>({ speed: 1.4 })

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Local Financial Statements Assignment State (Immediate Sync without refresh)
  const [isFsEnabled, setIsFsEnabled] = useState<boolean>(
    Boolean(company.financial_statements_enabled)
  )

  // إعادة المزامنة مع البيانات الحقيقية القادمة من الخادم بعد أي router.refresh()
  useEffect(() => {
    setIsFsEnabled(Boolean(company.financial_statements_enabled))
  }, [company.financial_statements_enabled])

  // Company Overview Form State
  const [name, setName] = useState(company.name || '')
  const [kind, setKind] = useState(company.kind || 'محدودة')
  const [capital, setCapital] = useState(company.capital ? formatNumberWithCommas(company.capital) : '')
  const [phone, setPhone] = useState(company.phone || '')
  const [activity, setActivity] = useState(company.activity || '')
  const [address, setAddress] = useState(company.address || '')
  const [certNo, setCertNo] = useState(company.cert_no || '')
  const [certDate, setCertDate] = useState(company.cert_date || '')
  const [companyStatusVal, setCompanyStatusVal] = useState(company.status || 'new')

  // Accounting Breakdown Form State
  const accNotes = (company.accounting_notes && typeof company.accounting_notes === 'object' ? company.accounting_notes : null) as AccountingBreakdown | null
  const [accountantFee, setAccountantFee] = useState(accNotes?.accountant_fee ? formatNumberWithCommas(accNotes.accountant_fee) : '')
  const [registrationFee, setRegistrationFee] = useState(accNotes?.registration_fee ? formatNumberWithCommas(accNotes.registration_fee) : '')
  const [govFee, setGovFee] = useState(accNotes?.gov_fee ? formatNumberWithCommas(accNotes.gov_fee) : '')
  const [otherExpenses, setOtherExpenses] = useState(accNotes?.other_expenses ? formatNumberWithCommas(accNotes.other_expenses) : '')

  // Modals state
  const [isFSModalOpen, setIsFSModalOpen] = useState(false)
  const [isIDModalOpen, setIsIDModalOpen] = useState(false)
  const [idModalType, setIdModalType] = useState<'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'>('importer_id')
  const [editingIDRecord, setEditingIDRecord] = useState<CompanyIDRecord | null>(null)
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  useModalBodyLock(isUploadModalOpen, () => setIsUploadModalOpen(false))

  // Upload document form state
  const [docName, setDocName] = useState('')
  const [docCategory, setDocCategory] = useState('Formation')

  // Trademark form state
  const [isTrademarkFormOpen, setIsTrademarkFormOpen] = useState(false)
  const [tmName, setTmName] = useState('')
  const [tmRegNo, setTmRegNo] = useState('')

  const activeManagerObj = company.managers?.find(m => m.active) || company.managers?.[0]
  const activeManagerName = activeManagerObj?.name || company.manager || '—'
  const primaryShareholderName = company.shareholders?.[0]?.name || '—'
  const isDepositReleased = deposit?.deposit_stages?.every(s => s.state === 'done')
  const personInCharge = (company.status === 'established' || isDepositReleased) ? activeManagerName : primaryShareholderName

  // Centralized Calculated Status
  const calculatedStatus = calculateCompanyStatus({
    company: { ...company, financial_statements_enabled: isFsEnabled, status: companyStatusVal },
    depositStages: deposit?.deposit_stages,
    ids,
    financialStatements,
  })

  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    setLoading(true)
    setMsg(null)

    const parseNum = (v: string) => parseFloat(v.replace(/[^0-9.]/g, '')) || 0

    const accounting_notes: AccountingBreakdown = {
      accountant_fee: parseNum(accountantFee),
      registration_fee: parseNum(registrationFee),
      gov_fee: parseNum(govFee),
      other_expenses: parseNum(otherExpenses),
    }

    const res = await updateCompanyDetailsAction(company.id, {
      name,
      kind,
      capital: parseNum(capital),
      phone,
      activity,
      address,
      cert_no: certNo,
      cert_date: certDate,
      accounting_notes,
    })

    await updateTransactionStatusAction(`tx_${company.id}`, companyStatusVal, company.id)

    setLoading(false)
    if (res.success) {
      setMsg({ type: 'ok', text: 'تم حفظ وتحديث بيانات الشركة والتكاليف المالية بنجاح' })
      await addCompanyAuditLogAction(company.id, `تحديث البيانات الأساسية والمالية للشركة: ${name}`)
      router.refresh()
    } else {
      setMsg({ type: 'err', text: res.error || 'فشل التحديث' })
    }
  }

  const handleAssignOfficeFS = async () => {
    if (!canEdit) return
    const isCompanyEstablished = isDepositReleased || company.status === 'established' || Boolean(company.cert_date)
    if (!isCompanyEstablished) {
      setMsg({ type: 'err', text: 'ممنوع تكليف الحسابات الختامية للشركات قيد التأسيس.' })
      return
    }

    setLoading(true)
    setMsg(null)
    const currentYear = new Date().getFullYear()

    const res = await updateCompanyFSSettingsAction(company.id, { financial_statements_enabled: true })

    if (!res.success) {
      setLoading(false)
      setMsg({ type: 'err', text: res.error || 'تعذر تكليف المكتب بالحسابات الختامية' })
      return
    }

    await createFinancialStatementAction({ company_id: company.id, year: currentYear })

    // Confirmed by the server — safe to reflect immediately, button disappears without a page reload
    setIsFsEnabled(true)
    setLoading(false)
    setMsg({ type: 'ok', text: 'تم تكليف المكتب بالحسابات الختامية بنجاح وبدء مسار الميزانيات (Assigned)' })
    router.refresh()
  }

  const handleStepComplete = async (stepId: string, stepOrder: number) => {
    if (!canEdit) return
    setLoading(true)
    try {
      const res = await advanceCompanyStepAction(stepId, 'done')
      if (res.success) {
        setMsg({ type: 'ok', text: `تم إكمال الخطوة ${stepOrder} بنجاح!` })
        router.refresh()
      } else {
        setMsg({ type: 'err', text: res.error || 'تعذر تحديث حالة الخطوة' })
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'تعذر تحديث حالة الخطوة' })
    } finally {
      setLoading(false)
    }
  }

  const handleStepRevert = async (stepId: string, stepOrder: number) => {
    if (!canEdit) return
    setLoading(true)
    try {
      const res = await advanceCompanyStepAction(stepId, 'doing')
      if (res.success) {
        setMsg({ type: 'ok', text: `تمت إعادة فتح الخطوة ${stepOrder} للمتابعة!` })
        router.refresh()
      } else {
        setMsg({ type: 'err', text: res.error || 'تعذر إعادة فتح الخطوة' })
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'تعذر إعادة فتح الخطوة' })
    } finally {
      setLoading(false)
    }
  }

  const handleReleaseDeposit = async () => {
    if (!canCreateDeposit) return
    if (!(await confirmAction({ title: 'إطلاق مسار الوديعة', message: 'سيبدأ مسار إطلاق الوديعة لهذه الشركة.', tone: 'primary', confirmText: 'إطلاق المسار' }))) return
    setLoading(true)
    const res = await launchDepositWorkflowAction(company.id)
    setLoading(false)
    if (res.success) {
      setMsg({ type: 'ok', text: '✓ تم إطلاق مسار الوديعة بنجاح! جاري الانتقال لقسم إطلاق الوديعة...' })
      setTimeout(() => {
        router.push(`/commercial/deposits?company=${company.id}`)
      }, 500)
    } else {
      setMsg({ type: 'err', text: res.error || 'فشل إطلاق الوديعة' })
    }
  }

  const handleToggleDepositStage = async (stageId: string, newState: 'done' | 'idle') => {
    if (!canReleaseDeposit) return
    setLoading(true)
    await updateDepositStageStateAction(stageId, newState)
    setLoading(false)
    router.refresh()
  }

  const handleBarcodeUpload = async (stageId: string, file: File) => {
    if (!canReleaseDeposit) return
    setLoading(true)
    try {
      const compressImage = (f: File): Promise<string> => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = e => {
            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              let width = img.width
              let height = img.height
              const maxDim = 800
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width)
                  width = maxDim
                } else {
                  width = Math.round((width * maxDim) / height)
                  height = maxDim
                }
              }
              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height)
                resolve(canvas.toDataURL('image/jpeg', 0.82))
              } else {
                resolve(e.target?.result as string)
              }
            }
            img.onerror = () => resolve(e.target?.result as string)
            img.src = e.target?.result as string
          }
          reader.onerror = () => resolve('')
          reader.readAsDataURL(f)
        })
      }

      const dataUrl = await compressImage(file)
      await uploadCompanyBarcodeAction(stageId, company.id, dataUrl)
      setMsg({ type: 'ok', text: 'تم إطلاق الوديعة بنجاح' })
    } catch {
      setMsg({ type: 'err', text: 'حدث خطأ أثناء رفع الباركود' })
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docName.trim()) return

    setLoading(true)
    const res = await addCompanyDocumentAction(company.id, {
      name: docName,
      category: docCategory,
    })
    setLoading(false)
    if (res.success) {
      setIsUploadModalOpen(false)
      setDocName('')
      router.refresh()
    }
  }

  const openIDModal = (type: 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id', record?: CompanyIDRecord) => {
    if (!canManageIDs) return
    setIdModalType(type)
    setEditingIDRecord(record || null)
    setIsIDModalOpen(true)
  }

  // السجل الزمني الحقيقي — يأتي مباشرة من جدول company_timeline، الأحدث أولاً، مرقّم للعرض تصاعدياً
  const numberedTimelineEvents = useMemo(() => {
    const chronological = [...(timeline || [])].reverse()
    return chronological.map((ev, idx) => ({
      id: ev.id,
      num: idx + 1,
      title: ev.title,
      date: formatDate(ev.created_at),
      tag: TIMELINE_EVENT_LABELS[ev.event_type] || 'نشاط',
    }))
  }, [timeline])

  const handleAddTrademark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tmName.trim()) return
    setLoading(true)
    const res = await createTrademarkAction({
      company_id: company.id,
      name: tmName,
      registration_no: tmRegNo,
    })
    setLoading(false)
    if (res.success) {
      setIsTrademarkFormOpen(false)
      setTmName('')
      setTmRegNo('')
      router.refresh()
    } else {
      setMsg({ type: 'err', text: res.error || 'تعذر تسجيل العلامة التجارية' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', padding: '24px' }}>
      
      {/* Top Navigation & RBAC Notice */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <Link href="/commercial/companies" style={{ color: 'var(--text-3)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>← العودة لقائمة الشركات</span>
        </Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!canEdit && (
            <span className="tag tag-warn" style={{ fontSize: '11px' }}>
              <Mi n="lock" />وضع العرض فقط (لست أدمن)
            </span>
          )}
          <WorkflowStatus
            status={companyStatusVal}
            entityId={company.id}
            entityType="company"
            readOnly={!canEdit}
            onStatusChange={(newSt) => setCompanyStatusVal(newSt)}
          />
        </div>
      </div>

      {/* 360 Company Card Header */}
      <div className="card card-pad" style={{ background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
              <Icon name="build" style={{ width: '30px', height: '30px' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>{company.name}</h1>
                <span className="tag tag-blue">{company.kind || 'شركة'}</span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>رقم المهمة: <strong>{company.task_no || '—'}</strong></span>
                <span>المسؤول عن الشركة: <strong>{personInCharge}</strong></span>
                <span>رأس المال: <strong>{formatMoney(company.capital || 0)}</strong></span>
                <span>تثبيت الحسابات: <strong>{isFsEnabled ? 'مكلّف (Assigned) ✓' : 'غير مكلّف (Not Assigned)'}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)' }}>حالة المعاملة:</label>
            <WorkflowStatus
              status={companyStatusVal}
              entityId={company.id}
              entityType="company"
              readOnly={!canEdit}
              onStatusChange={(newSt) => setCompanyStatusVal(newSt)}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar (Drag Scrollable) */}
      <div ref={navTabsScrollRef} style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px', overflowX: 'auto', userSelect: 'none' }} className="scrollbar-none">
        {([
          { id: 'all', label: 'عرض الكل (360°)' },
          { id: 'workflow', label: 'مخطط سير العمل' },
          { id: 'basic', label: '1. البيانات الأساسية والمالية' },
          { id: 'shareholders', label: '2. المساهمون' },
          { id: 'manager', label: '3. المدير المفوض' },
          { id: 'deposit', label: '4. إطلاق الوديعة' },
          { id: 'ids', label: '5. الهويات والرخص' },
          { id: 'tax', label: '6. التحاسب الضريبي' },
          { id: 'fs', label: '7. القوائم المالية' },
          { id: 'trademarks', label: '8. العلامات التجارية' },
          { id: 'docs', label: '9. المستندات' },
          { id: 'notes', label: '10. الملاحظات' },
          { id: 'timeline', label: '11. السجل والتايم لاين' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: msg.type === 'ok' ? 'var(--ok-soft)' : 'var(--bad-soft)', color: msg.type === 'ok' ? 'var(--ok)' : 'var(--bad)', fontSize: '13px', fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* Interactive Workflow Stepper & Execution Engine */}
      {(activeTab === 'all' || activeTab === 'workflow') && (
        <WorkflowTimelineMotion
          steps={(company.workflow_steps || []) as any}
          onCompleteStep={handleStepComplete}
          onRevertStep={handleStepRevert}
          isEstablished={company.status === 'established' || Boolean(company.deposit_released) || Boolean(company.cert_date)}
          onTransferToDeposit={() => {
            setActiveTab('deposit')
            setMsg({
              type: 'ok',
              text: 'يرجى مراجعة وتحديث مرحلة إطلاق الوديعة المصرفية.',
            })
          }}
        />
      )}

      {/* Smart Company Summary — نظرة سريعة شاملة خلال ثوانٍ */}
      <div className="card card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', background: 'var(--surface-2)' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, marginBottom: '6px' }}>حالة الشركة</div>
          <span className={`tag ${calculatedStatus.tagClass}`} style={{ fontSize: '12.5px' }}>{calculatedStatus.label}</span>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, marginBottom: '6px' }}>الهويات والرخص</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {ALL_ID_TYPES.map(cat => {
              const has = ids.some(x => x.id_type === cat.type)
              return (
                <span key={cat.type} style={{ fontSize: '12px', color: has ? 'var(--ok)' : 'var(--text-3)' }}>
                  {has ? '✓' : '✗'} {cat.label}
                </span>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, marginBottom: '6px' }}>التحاسب الضريبي</div>
          {taxAssessments.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>غير متحاسبة بعد</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {[...taxAssessments].sort((a, b) => b.year - a.year).map(t => (
                <span key={t.id} style={{ fontSize: '11.5px', color: t.status === 'tax_cleared' ? 'var(--ok)' : '#f59e0b', fontWeight: 700 }}>
                  {t.status === 'tax_cleared' ? '✓' : '⟳'} سنة {t.year} {t.status === 'tax_cleared' ? '(براءة ذمة)' : '(قيد الإجراء)'}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, marginBottom: '6px' }}>الحسابات الختامية</div>
          {!isDepositReleased && company.status !== 'established' && !company.cert_date ? (
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>غير متاح (قيد التأسيس)</span>
          ) : financialStatements.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>لا توجد سنوات مسجلة بعد</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {[...financialStatements].sort((a, b) => a.year - b.year).map(fs => {
                const hasTax = Boolean(fs.date_submitted_tax || fs.tax_submitted)
                const hasReg = Boolean(fs.date_submitted_registrar || fs.registrar_submitted || fs.date_submitted)
                const isFull = hasTax && hasReg
                return (
                  <span key={fs.id} style={{ fontSize: '12px', color: isFull ? 'var(--ok)' : hasTax || hasReg ? 'var(--warn)' : 'var(--text-3)' }}>
                    <Mi n={isFull ? 'check_circle' : hasTax || hasReg ? 'warning' : 'hourglass_top'} />{fs.year} {isFull ? 'مكتملة (الضرائب والمسجل)' : hasTax ? 'مسلّمة للضرائب فقط' : hasReg ? 'مسلّمة للمسجل فقط' : 'قيد الانتظار'}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, marginBottom: '6px' }}>آخر الأحداث</div>
          {numberedTimelineEvents.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>لا يوجد نشاط مسجل بعد</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {[...numberedTimelineEvents].reverse().slice(0, 3).map(ev => (
                <span key={ev.id} style={{ fontSize: '11.5px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: Basic Information & Accounting Breakdown */}
      {(activeTab === 'all' || activeTab === 'basic') && (
        <form onSubmit={handleSaveBasicInfo} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>1. البيانات الأساسية والمالية التفصيلية</h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>رأس المال والأتعاب والرسوم الرسمية</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div className="field">
              <label htmlFor="co360-name">اسم الشركة الرسمية *</label>
              <input id="co360-name" type="text" className="input" value={name} disabled={!canEdit} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="field">
              <label htmlFor="co360-kind">نوع الشركة</label>
              <select id="co360-kind" className="input" value={kind} disabled={!canEdit} onChange={e => setKind(e.target.value)}>
                <option value="محدودة">محدودة (م.م)</option>
                <option value="فردية">فردية (شخص واحد)</option>
                <option value="تضامنية">تضامنية</option>
                <option value="مساهِمة">مساهِمة</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="co360-capital">رأس المال الإجمالي (د.ع)</label>
              <input id="co360-capital" type="text" className="input num" value={capital} disabled={!canEdit} onChange={e => setCapital(formatNumberWithCommas(e.target.value))} placeholder="50,000,000" />
            </div>

            <div className="field">
              <label htmlFor="co360-activity">النشاط التجاري والصناعي</label>
              <input id="co360-activity" type="text" className="input" value={activity} disabled={!canEdit} onChange={e => setActivity(e.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="co360-phone">رقم الهاتف للاتصال</label>
              <input id="co360-phone" type="text" className="input num" value={phone} disabled={!canEdit} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="co360-certno">رقم شهادة التأسيس</label>
              <input id="co360-certno" type="text" className="input num" value={certNo} disabled={!canEdit} onChange={e => setCertNo(e.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="co360-certdate">تاريخ شهادة التأسيس</label>
              <input id="co360-certdate" type="date" className="input" value={certDate} disabled={!canEdit} onChange={e => setCertDate(e.target.value)} />
            </div>
          </div>

          {/* Accounting Expenses & Breakdown Sub-section */}
          <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)' }}>
              تفاصيل التكاليف والأتعاب المحاسبية والرسوم الحكومية
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="field">
                <label style={{ fontSize: '11.5px' }}>أتعاب المحاسب (د.ع)</label>
                <input type="text" className="input num" value={accountantFee} disabled={!canEdit} onChange={e => setAccountantFee(formatNumberWithCommas(e.target.value))} placeholder="0" />
              </div>
              <div className="field">
                <label style={{ fontSize: '11.5px' }}>رسوم التسجيل (د.ع)</label>
                <input type="text" className="input num" value={registrationFee} disabled={!canEdit} onChange={e => setRegistrationFee(formatNumberWithCommas(e.target.value))} placeholder="0" />
              </div>
              <div className="field">
                <label style={{ fontSize: '11.5px' }}>الرسوم الحكومية (د.ع)</label>
                <input type="text" className="input num" value={govFee} disabled={!canEdit} onChange={e => setGovFee(formatNumberWithCommas(e.target.value))} placeholder="0" />
              </div>
              <div className="field">
                <label style={{ fontSize: '11.5px' }}>مصاريف أخرى (د.ع)</label>
                <input type="text" className="input num" value={otherExpenses} disabled={!canEdit} onChange={e => setOtherExpenses(formatNumberWithCommas(e.target.value))} placeholder="0" />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="co360-address">العنوان والموقع الجغرافي</label>
            <input id="co360-address" type="text" className="input" value={address} disabled={!canEdit} onChange={e => setAddress(e.target.value)} />
          </div>

          {canEdit && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات الأساسية والمالية'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* SECTION 2: Shareholders */}
      {(activeTab === 'all' || activeTab === 'shareholders') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>2. المساهمون والشركاء المؤسسون ({company.shareholders?.length || 0})</h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>قيد التأسيس: يُعرض المساهم الرئيسي</span>
          </div>

          {!company.shareholders?.length ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              لا يوجد مساهمون مسجلون تفصيلياً بعد لهذه الشركة.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface-2)_80%,transparent)] text-xs text-[var(--text-2)] font-bold">
                    <th className="py-3 px-4 text-right">اسم المساهم</th>
                    <th className="py-3 px-3 text-center">صفة الشراكة</th>
                    <th className="py-3 px-3 text-center">عدد الأسهم (د.ع)</th>
                    <th className="py-3 px-3 text-center">النسبة المئوية (%)</th>
                    <th className="py-3 px-4 text-center">الجنسية / الهاتف / الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {company.shareholders.map((sh, idx) => (
                    <tr key={sh.id || idx} className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08] transition-colors">
                      <td className="py-3 px-4 font-bold text-[13px] text-[var(--text)]">
                        <div className="flex items-center gap-2">
                          <span>{sh.name}</span>
                          {idx === 0 && <span className="tag tag-ok !text-[10px] !py-0.5 !px-2">المساهم الرئيسي ★</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center align-middle font-medium text-[var(--text-2)]">{idx === 0 ? 'مؤسس أول' : 'شريك مساهم'}</td>
                      <td className="py-3 px-3 text-center align-middle font-bold text-emerald-600 dark:text-emerald-400 num">
                        {sh.share_amount ? `${formatNumberWithCommas(sh.share_amount)} د.ع` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center align-middle font-extrabold text-[var(--accent)] num">
                        {sh.share_percentage !== undefined && sh.share_percentage !== null ? `${sh.share_percentage}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center align-middle text-[var(--text-3)]">{sh.nationality || sh.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Authorized Manager */}
      {(activeTab === 'all' || activeTab === 'manager') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>3. المدير المفوض (سجل company_managers المستقل)</h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>بعد التأسيس وإطلاق الوديعة: يُعرض المدير المفوض</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>المدير المفوض الحالي (النشط)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>{activeManagerName}</div>
              <div style={{ fontSize: '11px', color: 'var(--ok)', marginTop: '4px' }}>✓ مسجل ومصادق عليه في جدول company_managers</div>
            </div>

            {activeManagerObj && (
              <>
                <div style={{ padding: '14px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>رقم الهوية / المستمسك</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>{activeManagerObj.id_number || '—'}</div>
                </div>
                <div style={{ padding: '14px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>رقم هاتف المدير</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>{activeManagerObj.phone || '—'}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: Deposit Release */}
      {(activeTab === 'all' || activeTab === 'deposit') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>4. مسار إطلاق الوديعة والمحطات الأربع الإلزامية</h3>
            {!deposit && canCreateDeposit && (
              <button type="button" onClick={handleReleaseDeposit} className="btn btn-go" style={{ padding: '4px 12px', fontSize: '12px' }}>
                <Icon name="vault" />
                <span>إطلاق مسار الوديعة الآن</span>
              </button>
            )}
          </div>

          {deposit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isDepositReleased && (
                <div style={{ padding: '12px 16px', background: 'var(--ok-soft)', border: '1px solid var(--ok)', borderRadius: 'var(--r-md)', color: 'var(--ok)', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="check" />
                    <span>تم إطلاق الوديعة بنجاح واستكمال رفع الباركود والمحطات الأربع</span>
                  </div>
                  {company.deposit_released_at && (
                    <span className="tag tag-ok" style={{ fontSize: '11px', fontWeight: 700 }}>
                      تاريخ إطلاق الوديعة: {company.deposit_released_at.slice(0, 10)}
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {(deposit.deposit_stages || []).map(st => {
                  const isDone = st.state === 'done'
                  const isBarcode = st.stage_key === 'barcode'
                  return (
                    <div key={st.id} style={{ padding: '12px', background: isDone ? 'var(--ok-soft)' : 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{st.label}</span>
                        <span className={`tag ${isDone ? 'tag-ok' : 'tag-warn'}`}>{isDone ? 'مكتملة ✓' : 'انتظار'}</span>
                      </div>

                      {isBarcode && (
                        <div style={{ marginTop: '4px' }}>
                          <BarcodeUploader
                            stageId={st.id}
                            companyId={company.id}
                            initialBarcodeUrl={st.notes || company.barcode_url || null}
                            disabled={!canReleaseDeposit || loading}
                            onUpload={async (stageId, companyId, file) => {
                              await handleBarcodeUpload(stageId, file)
                            }}
                          />
                        </div>
                      )}

                      {!isBarcode && canReleaseDeposit && (
                        <button type="button" onClick={() => handleToggleDepositStage(st.id, isDone ? 'idle' : 'done')} className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 6px', alignSelf: 'flex-start' }}>
                          {isDone ? 'تراجع' : 'تأكيد الإكتمال'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', color: 'var(--text-3)', textAlign: 'center', fontSize: '13px' }}>
              لم يتم بدء مسار إطلاق الوديعة لهذه الشركة بعد.
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: Data-Driven Government IDs Section */}
      {(activeTab === 'all' || activeTab === 'ids') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>5. هويات ورخص الشركة</h3>
            {canManageIDs && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => openIDModal('importer_id')} className="btn btn-primary" style={{ fontSize: '11px', padding: '3px 8px' }}>هوية مستورد</button>
                <button type="button" onClick={() => openIDModal('tax_id')} className="btn btn-primary" style={{ fontSize: '11px', padding: '3px 8px' }}>هوية ضريبية</button>
                <button type="button" onClick={() => openIDModal('chamber_id')} className="btn btn-go" style={{ fontSize: '11px', padding: '3px 8px' }}>غرفة تجارة</button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {ALL_ID_TYPES.map(cat => {
              const idRec = ids.find(x => x.id_type === cat.type)

              if (!idRec) {
                return (
                  <div key={cat.type} style={{ padding: '14px', background: 'var(--surface-2)', border: '1px dashed var(--line-soft)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={`tag ${cat.tagClass}`} style={{ fontWeight: 700 }}>{cat.label}</span>
                      <span className="tag tag-gray" style={{ fontSize: '10px' }}>غير صادرة بعد</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
                      لم يتم إصدار {cat.label} لهذه الشركة حتى الآن.
                    </div>
                    {canManageIDs && (
                      <button
                        type="button"
                        onClick={() => openIDModal(cat.type)}
                        className="btn btn-ghost"
                        style={{ fontSize: '11px', padding: '4px 8px', alignSelf: 'flex-start', marginTop: '4px', color: 'var(--accent)' }}
                      >
                        + بدء إصدار {cat.label}
                      </button>
                    )}
                  </div>
                )
              }

              const isExpired = idRec.expiry_date && new Date(idRec.expiry_date) < new Date()

              return (
                <div key={cat.type} style={{ padding: '14px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={`tag ${cat.tagClass}`} style={{ fontWeight: 700 }}>{cat.label}</span>
                    <span className={`tag ${isExpired ? 'tag-bad' : 'tag-ok'}`} style={{ fontSize: '10px' }}>
                      {isExpired ? 'منتهية' : 'نشطة ✓'}
                    </span>
                  </div>

                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                    رقم الهوية: {idRec.id_number || '—'}
                  </div>

                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>
                    المدير المفوض: {idRec.manager_name || activeManagerName}
                  </div>

                  {idRec.grade && (
                    <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 700 }}>
                      الدرجة: درجة {idRec.grade}
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    الإصدار: {formatDate(idRec.issue_date)} | الانتهاء: {formatDate(idRec.expiry_date)}
                  </div>

                  {canRenewIDs && (
                    <button
                      type="button"
                      onClick={() => openIDModal(cat.type, idRec)}
                      style={{ marginTop: '4px', border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700, textAlign: 'right', padding: 0 }}
                    >
                      تعديل بيانات الهوية ←
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SECTION 6: Tax Assessment - التحاسب الضريبي */}
      {(activeTab === 'all' || activeTab === 'tax') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined text-[20px] text-amber-500">receipt_long</span>
              <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>6. التحاسب الضريبي وبراءة الذمة ({taxAssessments.length})</h3>
            </div>
            <Link
              href="/commercial/tax-assessment"
              className="btn btn-primary"
              style={{ fontSize: '11.5px', padding: '4px 12px', fontWeight: 700 }}
            >
              <span>فتح قسم التحاسب الضريبي ←</span>
            </Link>
          </div>

          {taxAssessments.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
              <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>
                لم يتم تسجيل أي معاملة تحاسب ضريبي لهذه الشركة بعد في الهيئة العامة للضرائب.
              </div>
              <Link
                href="/commercial/tax-assessment"
                className="btn btn-go"
                style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 700 }}
              >
                <Icon name="plus" />
                <span>إضافة تحاسب ضريبي للشركة</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {taxAssessments.map(t => {
                const isCleared = t.status === 'tax_cleared'
                return (
                  <div
                    key={t.id}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line-soft)',
                      borderRadius: 'var(--r-md)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="num" style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text)' }}>
                        تحاسب سنة {t.year}
                      </span>
                      {isCleared ? (
                        <span className="badge-completed">✓ براءة ذمة</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <span className="w-2.5 h-2.5 border-1.5 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                          <span>قيد الإجراء</span>
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>الفرع الضريبي: <strong style={{ color: 'var(--text)' }}>{t.tax_branch || 'الفرع المختص'}</strong></div>
                      {t.tax_file_number && <div>رقم الإضبارة: <strong className="num text-[var(--accent)]">{t.tax_file_number}</strong></div>}
                      {t.assigned_lawyer_name && <div>المحامي المكلف: <span>{t.assigned_lawyer_name}</span></div>}
                      {t.tx_start_date && <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>بدء المهمة: <span className="num">{formatDate(t.tx_start_date)}</span></div>}
                      {t.contracts_info && <div>عقود خاضعة: <span className="text-amber-400">{t.contracts_info}</span></div>}
                      {t.imports_info && <div>استيرادات: <span className="text-cyan-400">{t.imports_info}</span></div>}
                      {t.clearance_letter_no && (
                        <div style={{ marginTop: '4px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '11px', color: 'var(--ok)' }}>
                          كتاب براءة الذمة: <strong className="num">{t.clearance_letter_no}</strong> ({formatDate(t.clearance_date)})
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

      {/* SECTION 7: Financial Statements Section */}
      {(activeTab === 'all' || activeTab === 'fs') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>7. الحسابات الختامية والميزانيات السنوية</h3>
            <span className={`tag ${isFsEnabled ? 'tag-ok' : 'tag-gray'}`} style={{ fontWeight: 700 }}>
              {isFsEnabled ? 'الحالة: مكلّف بالميزانيات ✓' : 'الحالة: غير مكلّف'}
            </span>
          </div>

          {!isFsEnabled ? (
            <div style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              {!isDepositReleased && company.status !== 'established' && !company.cert_date ? (
                <div style={{ padding: '12px 24px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--r-md)', color: 'var(--bad)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span><Mi n="block" />الحسابات الختامية ممنوعة ومغلقة للشركات قيد التأسيس (متاحة حصرياً بعد اكتمال التأسيس بالكامل وصدور الشهادة الرسمية)</span>
                </div>
              ) : (
                <>
                  <div style={{ color: 'var(--text-3)', fontSize: '13.5px' }}>
                    لم يتم تكليف المكتب بمتابعة الحسابات الختامية والميزانيات لهذه الشركة بعد.
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      disabled={loading}
                      className="btn btn-go"
                      style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 700 }}
                      onClick={handleAssignOfficeFS}
                    >
                      <Icon name="doc" />
                      <span>تكليف المكتب بالحسابات الختامية</span>
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-2)', fontWeight: 700 }}>
                  الميزانيات المسجلة للشركة ({financialStatements.length} سنوات):
                </span>
                <a
                  href={`/commercial/financial-statements?companyId=${company.id}`}
                  className="btn btn-primary"
                  style={{ fontSize: '11.5px', padding: '4px 12px', fontWeight: 700 }}
                >
                  <span>فتح في الحسابات الختامية ←</span>
                </a>
              </div>

              {financialStatements.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-3)', padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
                  <Mi n="hourglass_top" />السنة المالية المستحقة ({new Date().getFullYear() - 1}): قيد المتابعة والتثبيت
                </div>
              ) : (
                financialStatements.map(fs => {
                  const hasTax = Boolean(fs.date_submitted_tax || fs.tax_submitted)
                  const hasReg = Boolean(fs.date_submitted_registrar || fs.registrar_submitted || fs.date_submitted)
                  const isFull = hasTax && hasReg

                  return (
                    <div key={fs.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mi n={isFull ? 'check_circle' : hasTax || hasReg ? 'warning' : 'hourglass_top'} />
                          <strong style={{ fontSize: '13.5px' }}>السنة المالية {fs.year}</strong>
                        </div>
                        <span className={`tag ${isFull ? 'tag-ok' : hasTax || hasReg ? 'tag-warn' : 'tag-gray'}`} style={{ fontSize: '11px' }}>
                          {isFull ? 'مكتملة ومسلّمة للدائرتين ✓' : hasTax ? 'مسلّمة للضرائب فقط' : hasReg ? 'مسلّمة للمسجل فقط' : 'قيد الانتظار'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '11.5px', color: 'var(--text-2)', background: 'var(--surface)', padding: '8px 10px', borderRadius: 'var(--r-sm)' }}>
                        <div>
                          <span style={{ color: 'var(--text-3)' }}><Mi n="account_balance" />الهيئة العامة للضرائب: </span>
                          <strong style={{ color: hasTax ? 'var(--ok)' : 'var(--warn)' }}>
                            {hasTax ? `✓ تم التسليم (${formatDate(fs.date_submitted_tax || fs.date_submitted || '')})` : 'لم تُسلّم بعد (مهلة 31/7)'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-3)' }}><Mi n="domain" />دائرة تسجيل الشركات: </span>
                          <strong style={{ color: hasReg ? 'var(--ok)' : 'var(--warn)' }}>
                            {hasReg ? `✓ تم التسليم (${formatDate(fs.date_submitted_registrar || fs.date_submitted || '')})` : 'لم تُسلّم بعد (مهلة 7/10)'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 7: Trademarks */}
      {(activeTab === 'all' || activeTab === 'trademarks') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>7. العلامات التجارية المسجلة ({trademarks.length})</h3>
            {canEdit && (
              <button type="button" onClick={() => setIsTrademarkFormOpen(v => !v)} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                تسجيل علامة تجارية
              </button>
            )}
          </div>

          {isTrademarkFormOpen && (
            <form onSubmit={handleAddTrademark} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', alignItems: 'end', background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11.5px' }}>اسم العلامة التجارية *</label>
                <input type="text" className="input" value={tmName} onChange={e => setTmName(e.target.value)} required />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11.5px' }}>رقم التسجيل</label>
                <input type="text" className="input num" value={tmRegNo} onChange={e => setTmRegNo(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-go" disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ'}</button>
            </form>
          )}

          {!trademarks.length ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              لا توجد علامات تجارية مسجلة رسمياً باسم الشركة حالياً.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {trademarks.map(tm => (
                <div key={tm.id} style={{ padding: '12px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{tm.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>رقم التسجيل: {tm.registration_no || '—'}</div>
                  <span className={`tag ${tm.status === 'registered' ? 'tag-ok' : tm.status === 'rejected' ? 'tag-bad' : tm.status === 'expired' ? 'tag-gray' : 'tag-warn'}`} style={{ fontSize: '10px', alignSelf: 'flex-start' }}>
                    {tm.status === 'registered' ? 'مسجّلة' : tm.status === 'rejected' ? 'مرفوضة' : tm.status === 'expired' ? 'منتهية' : 'قيد التسجيل'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 8: Documents */}
      {(activeTab === 'all' || activeTab === 'docs') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>8. المستندات والوثائق والأرشيف ({documents.length})</h3>
            {canEdit && (
              <button type="button" onClick={() => setIsUploadModalOpen(true)} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                رفع مستند جديد
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {documents.map(doc => (
              <div key={doc.id} style={{ padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}><Mi n="description" />{doc.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--accent)' }}>الفئة: {doc.category}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>تاريخ الرفع: {formatDate(doc.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 9: Notes */}
      {(activeTab === 'all' || activeTab === 'notes') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>9. الملاحظات ونواقص المستندات</h3>
          </div>
          {company.lacks ? (
            <div style={{ padding: '12px 14px', background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 'var(--r-md)', color: 'var(--warn)', fontSize: '13px', fontWeight: 600 }}>
              <Mi n="warning" />نواقص مستندات الشركة: {company.lacks}
            </div>
          ) : (
            <div style={{ padding: '14px', color: 'var(--text-3)', textAlign: 'center', fontSize: '13px' }}>
              لا توجد ملاحظات أو نواقص مستندات مسجلة على هذه الشركة.
            </div>
          )}
        </div>
      )}

      {/* SECTION 10: Timeline */}
      {(activeTab === 'all' || activeTab === 'timeline') && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', fontWeight: 800 }}>10. السجل الزمني والفعاليات المرقمة ({numberedTimelineEvents.length})</h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>أحداث ومحطات الشركة المتعاقبة</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {numberedTimelineEvents.map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'grid', placeItems: 'center' }}>
                  {ev.num}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{ev.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>تاريخ الحدث: {ev.date}</div>
                </div>
                <span className="tag tag-gray" style={{ fontSize: '10.5px' }}>{ev.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals Integration */}
      {isFSModalOpen && (
        <AddFinancialStatementModal
          isOpen={isFSModalOpen}
          onClose={() => {
            setIsFSModalOpen(false)
            router.refresh()
          }}
          companies={[company]}
          initialCompanyId={company.id}
        />
      )}

      {isIDModalOpen && (
        <AddIDModal
          isOpen={isIDModalOpen}
          onClose={() => {
            setIsIDModalOpen(false)
            setEditingIDRecord(null)
            router.refresh()
          }}
          companies={[company]}
          initialCompany={company}
          initialIdType={idModalType}
          record={editingIDRecord}
        />
      )}

      {isReminderModalOpen && (
        <ReminderModal
          isOpen={isReminderModalOpen}
          onClose={() => {
            setIsReminderModalOpen(false)
            router.refresh()
          }}
          companies={[company]}
          initialCompanyId={company.id}
        />
      )}

      {/* Document Upload Modal */}
      {isUploadModalOpen && (
        <div id="modal-root" className="on">
          <div className="modal-veil" onClick={() => setIsUploadModalOpen(false)} role="presentation" aria-hidden="true" />
          <div className="modal" style={{ '--modal-max-w': 'var(--modal-sm, 480px)' } as React.CSSProperties}>
            <div className="modal-head">
              <h3>رفع مستند جديد للشركة</h3>
              <button type="button" onClick={() => setIsUploadModalOpen(false)} className="icon-btn" aria-label="إغلاق">
                <Icon name="x" />
              </button>
            </div>
            <form onSubmit={handleUploadDoc} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>اسم المستند *</label>
                <input type="text" className="input" value={docName} onChange={e => setDocName(e.target.value)} required placeholder="مثال: عقد تأسيس موثق..." />
              </div>
              <div className="field">
                <label>فئة المستند *</label>
                <select className="input" value={docCategory} onChange={e => setDocCategory(e.target.value)}>
                  <option value="Formation">تأسيس (Formation)</option>
                  <option value="Tax">ضرائب (Tax)</option>
                  <option value="Chamber">غرفة تجارة (Chamber)</option>
                  <option value="Planning">تخطيط (Planning)</option>
                  <option value="Importer">مستورد (Importer)</option>
                  <option value="Financial Statements">حسابات ختامية (Financial Statements)</option>
                  <option value="Contracts">عقود (Contracts)</option>
                </select>
              </div>
              <div className="modal-foot">
                <button type="submit" className="btn btn-primary" disabled={loading}>رفع المستند</button>
                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="btn btn-ghost">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
