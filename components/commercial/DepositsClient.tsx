'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import { formatDate, formatMoney, penaltyState } from '@/lib/constants'
import { updateDepositStageStateAction, uploadCompanyBarcodeAction } from '@/app/(app)/commercial/deposits/actions'
import BarcodeUploader from './BarcodeUploader'
import { usePermissions } from '@/lib/context/UserRoleContext'
import type { Deposit, DepositStage, Company } from '@/types/database'

type DepositFull = Deposit & {
  companies: Company | null
  deposit_stages: DepositStage[]
}

interface Props {
  deposits: DepositFull[]
  companyId?: string
}

export default function DepositsClient({ deposits = [], companyId }: Props) {
  const router = useRouter()
  const { can } = usePermissions()
  const canRelease = can('deposits', 'release')
  const [depositsList, setDepositsList] = useState<DepositFull[]>(deposits)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setDepositsList(deposits)
  }, [deposits])

  const handleToggleStage = async (stage: DepositStage, newState: 'done' | 'idle', atDate?: string) => {
    const targetDate = newState === 'done' ? (atDate || new Date().toISOString().slice(0, 10)) : null

    // 1. Optimistic Local State Update
    setDepositsList(prev =>
      prev.map(dep => ({
        ...dep,
        deposit_stages: dep.deposit_stages.map((s: DepositStage) =>
          s.id === stage.id ? { ...s, state: newState, at_date: targetDate } : s
        ),
      }))
    )

    setLoading(true)
    await updateDepositStageStateAction(stage.id, newState, atDate)
    setLoading(false)
    setEditingStageId(null)
    router.refresh()
  }

  const [notification, setNotification] = useState<string | null>(null)

  const compressImageFile = (file: File): Promise<string> => {
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
      reader.readAsDataURL(file)
    })
  }

  const handleBarcodeUpload = async (stageId: string, targetCompanyId: string, file: File) => {
    setLoading(true)
    try {
      const dataUrl = await compressImageFile(file)
      await uploadCompanyBarcodeAction(stageId, targetCompanyId, dataUrl)
      
      // Update local optimistic state
      setDepositsList(prev =>
        prev.map(dep => ({
          ...dep,
          deposit_stages: dep.deposit_stages.map((s: DepositStage) =>
            s.id === stageId ? { ...s, state: 'done', at_date: new Date().toISOString().slice(0, 10), notes: dataUrl } : s
          ),
        }))
      )
      setNotification('تم إطلاق الوديعة بنجاح!')
      setTimeout(() => setNotification(null), 8000)
    } catch {
      setNotification('حدث خطأ أثناء رفع مستند الوديعة')
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  const [filterTab, setFilterTab] = useState<'all' | 'completed'>('all')
  const [selectedCompanyFocus, setSelectedCompanyFocus] = useState<string | null>(companyId || null)

  const getDepositStatusInfo = (dep: DepositFull) => {
    const stages = dep.deposit_stages || []
    const submitStage = stages.find(s => s.stage_key === 'submit')
    const barcodeStage = stages.find(s => s.stage_key === 'barcode')
    const isSubmitted = submitStage?.state === 'done'
    const isBarcodeDone = barcodeStage?.state === 'done' || Boolean(dep.companies?.barcode_url) || Boolean(barcodeStage?.notes)
    const doneCount = stages.filter(s => s.state === 'done').length
    const companyStatus = dep.companies?.status
    const isReleased = Boolean(dep.companies?.deposit_released) || (dep as { status?: string }).status === 'released' || companyStatus === 'established'

    const isFullyCompleted = (isSubmitted && isBarcodeDone && doneCount >= 4) || isReleased

    if (!isFullyCompleted) {
      return { isFullyCompleted: false, isWithin24h: false, hoursRemaining: 0 }
    }

    const completionDateStr = dep.companies?.deposit_released_at || barcodeStage?.at_date || barcodeStage?.created_at || dep.started_at
    const completedTimestamp = new Date(completionDateStr).getTime()
    const nowTimestamp = Date.now()
    const elapsedMs = Math.max(0, nowTimestamp - completedTimestamp)
    const elapsedHours = elapsedMs / (1000 * 60 * 60)
    const isWithin24h = elapsedHours <= 24
    const hoursRemaining = Math.max(1, Math.ceil(24 - elapsedHours))

    return { isFullyCompleted: true, isWithin24h, hoursRemaining }
  }

  const completedDeposits = depositsList.filter(d => getDepositStatusInfo(d).isFullyCompleted)

  let filteredByTab = depositsList
  if (filterTab === 'completed') {
    filteredByTab = completedDeposits
  }

  // If a company is focused, sort it to the very top so it's highlighted and immediately visible
  const visible = [...filteredByTab].sort((a, b) => {
    if (selectedCompanyFocus) {
      if (a.company_id === selectedCompanyFocus) return -1
      if (b.company_id === selectedCompanyFocus) return 1
    }
    return 0
  })

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in-up">
      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--r-md)',
            background: 'var(--ok-soft)',
            border: '1px solid var(--ok)',
            color: 'var(--ok)',
            fontWeight: 800,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="check" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} style={{ border: 'none', background: 'none', color: 'var(--ok)', cursor: 'pointer', fontWeight: 800 }}>
            ✕
          </button>
        </div>
      )}

      {/* Focus Banner if routed from specific company */}
      {selectedCompanyFocus && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 'var(--r-md)',
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <span>🎯 تم تحديد الشركة المطلوبة وتصديرها للأعلى لمتابعة مسار الوديعة</span>
          <button
            type="button"
            onClick={() => {
              setSelectedCompanyFocus(null)
              router.replace('/commercial/deposits')
            }}
            className="btn btn-ghost"
            style={{ fontSize: '12px', padding: '2px 8px' }}
          >
            إلغاء التحديد
          </button>
        </div>
      )}

      <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="page-title">إدارة إطلاق الوديعة والمحطات الأربع الإلزامية</h2>
          <span className="count-note num">إجمالي الودائع المسجلة: {depositsList.length} شركة</span>
        </div>

        {/* Filter Tabs — الكل (افتراضي) والمكتملة والمطلقة */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`btn ${filterTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '13px', padding: '7px 16px', fontWeight: 700 }}
          >
            <span>الكل</span>
            <span className="nav-num" style={{ marginRight: '6px' }}>{depositsList.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('completed')}
            className={`btn ${filterTab === 'completed' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '13px', padding: '7px 16px', fontWeight: 700 }}
          >
            <span>المكتملة والمطلقة</span>
            <span className="nav-num" style={{ marginRight: '6px' }}>{completedDeposits.length}</span>
          </button>
        </div>
      </div>

      {!visible.length ? (
        <div className="card">
          <Empty
            icon="vault"
            title="لا توجد ودائع في هذا القسم"
            text="يمكنك إطلاق الوديعة لأي شركة صادرة الشهادة من صفحة «الشركات وتأسيسها»."
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '12px', alignItems: 'start' }}>
          {visible.map(dep => {
            const company = dep.companies
            const statusInfo = getDepositStatusInfo(dep)
            const isDepositFullyCompleted = statusInfo.isFullyCompleted
            
            // Ensure 4 stages exist
            const stages = [...(dep.deposit_stages || [])].sort((a, b) => a.stage_order - b.stage_order)
            const submitStage = stages.find(s => s.stage_key === 'submit')
            const advisorStage = stages.find(s => s.stage_key === 'advisor' || s.stage_key === 'consultant')
            const accountantStage = stages.find(s => s.stage_key === 'accountant')

            const isSubmitted = submitStage?.state === 'done'
            const isAdvisorDone = advisorStage?.state === 'done'
            const isAccountantDone = accountantStage?.state === 'done'
            const arePriorStagesDone = Boolean(isSubmitted && isAdvisorDone && isAccountantDone)

            const doneCount = stages.filter(s => s.state === 'done').length
            const pen = company ? penaltyState(company, isSubmitted) : null
            const isFocused = selectedCompanyFocus === dep.company_id

            return (
              <div
                key={dep.id}
                className={`card transition-all duration-200 ${isFocused ? 'ring-2 ring-[var(--accent)]' : ''}`}
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'var(--surface)',
                  border: isFocused
                    ? '2px solid var(--accent)'
                    : isDepositFullyCompleted
                    ? '1px solid rgba(16, 185, 129, 0.25)'
                    : '1px solid var(--line-soft)',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                  position: 'relative',
                }}
              >
                {/* Deposit Card Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isDepositFullyCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--accent-soft)',
                        color: isDepositFullyCompleted ? 'var(--ok)' : 'var(--accent)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        fontSize: '14px',
                        marginTop: '2px',
                      }}
                    >
                      <Icon name={isDepositFullyCompleted ? 'check' : 'vault'} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '13.5px',
                          color: 'var(--text)',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                        }}
                        title={company?.name ?? '—'}
                      >
                        {company?.name ?? '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>
                        أُطلقت بتاريخ <span className="num">{formatDate(dep.started_at)}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '2px 7px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      background: isDepositFullyCompleted
                        ? 'rgba(16, 185, 129, 0.1)'
                        : doneCount
                        ? 'var(--accent-soft)'
                        : 'rgba(245, 158, 11, 0.1)',
                      color: isDepositFullyCompleted
                        ? 'var(--ok)'
                        : doneCount
                        ? 'var(--accent)'
                        : '#d97706',
                      border: isDepositFullyCompleted
                        ? '1px solid rgba(16, 185, 129, 0.2)'
                        : '1px solid var(--line-soft)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isDepositFullyCompleted ? 'أُطلقت الوديعة ✓' : `${doneCount}/4 محطات`}
                  </span>
                </div>

                {/* 4 Mandatory Stages */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {stages.map((stage: DepositStage) => {
                    const isDone = stage.state === 'done'
                    const isEditing = editingStageId === stage.id
                    const isSubmitStage = stage.stage_key === 'submit'
                    const isBarcodeStage = stage.stage_key === 'barcode'
                    const isLockedByShareholderRule = isSubmitStage && pen?.canSubmitYet === false
                    const isBarcodeLocked = isBarcodeStage && !arePriorStagesDone && !isDone

                    return (
                      <div
                        key={stage.id}
                        style={{
                          background: 'var(--surface-2)',
                          border: isDone ? '1px solid rgba(16, 185, 129, 0.18)' : '1px solid var(--line-soft)',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <span
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: isDone ? 'var(--ok)' : 'var(--surface-3)',
                                color: isDone ? '#fff' : 'var(--text-3)',
                                fontSize: '9px',
                                display: 'grid',
                                placeItems: 'center',
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {isDone ? '✓' : stage.stage_order}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--text)' }}>
                              {stage.label}
                            </span>
                          </div>

                          <span
                            style={{
                              fontSize: '9.5px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: isDone ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-3)',
                              color: isDone ? 'var(--ok)' : 'var(--text-3)',
                            }}
                          >
                            {isDone ? 'مكتملة ✓' : 'انتظار'}
                          </span>
                        </div>

                        {/* Date info if done */}
                        {isDone && stage.at_date && (
                          <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                            تاريخ الإكمال: <span className="num">{formatDate(stage.at_date)}</span>
                          </div>
                        )}

                        {/* Barcode/PDF Upload Controls for Stage 4 */}
                        {isBarcodeStage && company && (
                          <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {isBarcodeLocked && (
                              <div style={{ fontSize: '10.5px', color: 'var(--warn)', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 6px', borderRadius: '4px' }}>
                                🔒 يلزم إكمال المحطات الثلاث الأولى (الإرسال، المشاور، المحاسب) لرفع الباركود.
                              </div>
                            )}

                            <BarcodeUploader
                              stageId={stage.id}
                              companyId={company.id}
                              initialBarcodeUrl={stage.notes || company.barcode_url || null}
                              disabled={!canRelease || loading || isBarcodeLocked}
                              onUpload={async (stId, compId, file) => {
                                await handleBarcodeUpload(stId, compId, file)
                              }}
                            />
                          </div>
                        )}

                        {/* Lock Warning for 15-day shareholder rule */}
                        {isLockedByShareholderRule && !isDone && (
                          <div style={{ fontSize: '10.5px', color: 'var(--bad)', background: 'var(--bad-soft)', padding: '3px 6px', borderRadius: '4px' }}>
                            ⚠️ شركة شركاء: يلزم انتظار {pen?.daysUntilSubmitAllowed} يوماً للإرسال.
                          </div>
                        )}

                        {/* Stage Controls: Complete / Undo / Edit */}
                        {!isBarcodeStage && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '1px', flexWrap: 'wrap' }}>
                            {canRelease ? (
                              !isDone ? (
                                <button
                                  type="button"
                                  disabled={loading || isLockedByShareholderRule}
                                  onClick={() => handleToggleStage(stage, 'done')}
                                  className="btn btn-go"
                                  style={{ fontSize: '10.5px', padding: '1px 6px', height: '22px' }}
                                >
                                  ✓ إكمال المحطة
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleToggleStage(stage, 'idle')}
                                    className="btn btn-ghost"
                                    style={{ fontSize: '10px', padding: '1px 5px', height: '22px', color: 'var(--bad)' }}
                                  >
                                    ↺ تراجع
                                  </button>

                                  {!isEditing ? (
                                    <button
                                      type="button"
                                      disabled={loading}
                                      onClick={() => {
                                        setEditingStageId(stage.id)
                                        setEditDate(stage.at_date || new Date().toISOString().slice(0, 10))
                                      }}
                                      className="btn btn-ghost"
                                      style={{ fontSize: '10px', padding: '1px 5px', height: '22px' }}
                                    >
                                      تعديل التاريخ
                                    </button>
                                  ) : (
                                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                      <input
                                        type="date"
                                        className="input"
                                        value={editDate}
                                        onChange={e => setEditDate(e.target.value)}
                                        style={{ padding: '1px 4px', fontSize: '10.5px', height: '22px' }}
                                      />
                                      <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => handleToggleStage(stage, 'done', editDate)}
                                        className="btn btn-primary"
                                        style={{ fontSize: '9.5px', padding: '1px 5px', height: '22px' }}
                                      >
                                        حفظ
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingStageId(null)}
                                        className="btn btn-ghost"
                                        style={{ fontSize: '9.5px', padding: '1px 4px', height: '22px' }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </>
                              )
                            ) : (
                              <span style={{ fontSize: '10px', color: 'var(--text-3)', padding: '2px 4px' }}>
                                {isDone ? 'تم اعتمادها رسمياً' : 'قيد المتابعة الإدارية'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Footer Micro-Bar */}
                {isDepositFullyCompleted ? (
                  <div
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--ok)' }}>
                      ✓ تم إطلاق الوديعة بنجاح
                    </span>

                    <a
                      href={`/commercial/companies-registry`}
                      className="text-[10.5px] font-bold text-[var(--accent)] hover:underline"
                    >
                      فتح بسجل الشركات ←
                    </a>
                  </div>
                ) : isSubmitted ? (
                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.06)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '10.5px',
                      color: 'var(--text-2)',
                    }}
                  >
                    <span className="material-symbols-outlined text-sky-500 text-[14px]">info</span>
                    <span>أُرسلت على النظام · بانتظار رفع الباركود لإكمال الإطلاق.</span>
                  </div>
                ) : pen ? (
                  <div className={`pen${pen.level === 'late' ? ' late' : pen.level === 'soon' ? ' warn' : ''}`} style={{ padding: '6px 8px' }}>
                    <Icon name={pen.level === 'late' ? 'alert' : 'clock'} />
                    <div>
                      <div className="pen-main" style={{ fontSize: '11px' }}>{pen.label}</div>
                      <div className="pen-sub" style={{ fontSize: '10px' }}>
                        تنتهي المهلة بتاريخ {formatDate(pen.due)}
                        {pen.amount > 0 ? ` · متراكم ${formatMoney(pen.amount)}` : ''}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

