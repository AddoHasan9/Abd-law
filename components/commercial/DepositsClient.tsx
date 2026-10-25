'use client'

import { dataUrlToBlob } from '@/components/ui/AttachmentField'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { runAction } from '@/components/ui/ConfirmDialog'
import { Mi } from '@/components/ui/Mi'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import { penaltyState } from '@/lib/constants'
import { updateDepositStageStateAction, uploadCompanyBarcodeAction } from '@/app/(app)/commercial/deposits/actions'
import DepositCard from './DepositCard'
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
  /** المحطة التي تُحفظ الآن، وآخر محطة اكتملت (لحركة الإكمال)، والوديعة التي أُطلقت للتو (للاحتفال) */
  const [savingId, setSavingId] = useState<string | null>(null)
  const [justDoneId, setJustDoneId] = useState<string | null>(null)
  const [celebrateId, setCelebrateId] = useState<string | null>(null)
  useEffect(() => {
    if (!justDoneId) return
    const t = setTimeout(() => setJustDoneId(null), 1600)
    return () => clearTimeout(t)
  }, [justDoneId])
  useEffect(() => {
    if (!celebrateId) return
    const t = setTimeout(() => setCelebrateId(null), 1600)
    return () => clearTimeout(t)
  }, [celebrateId])

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
    setSavingId(stage.id)
    if (newState === 'done' && stage.state !== 'done') setJustDoneId(stage.id)
    await runAction(updateDepositStageStateAction(stage.id, newState, atDate), 'إطلاق الوديعة · الحفظ')
    setSavingId(null)
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
      await runAction(uploadCompanyBarcodeAction(stageId, targetCompanyId, dataUrlToBlob(dataUrl)), 'إطلاق الوديعة · رفع الملف')
      
      // Update local optimistic state
      setDepositsList(prev =>
        prev.map(dep => ({
          ...dep,
          deposit_stages: dep.deposit_stages.map((s: DepositStage) =>
            s.id === stageId ? { ...s, state: 'done', at_date: new Date().toISOString().slice(0, 10), notes: dataUrl } : s
          ),
        }))
      )
      setJustDoneId(stageId)
      const released = depositsList.find(d => d.deposit_stages.some(s => s.id === stageId))
      if (released) setCelebrateId(released.id)
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
    // الإطلاق يُحسب من الإطلاق الفعلي فقط؛ حالة الشركة «مؤسسة» قد تأتي من إكمال معاملة التأسيس قبل إطلاق الوديعة
    const isReleased = Boolean(dep.companies?.deposit_released) || (dep as { status?: string }).status === 'released'

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
      <PageHeader icon="account_balance" tone="blue" title="إطلاق الودائع" subtitle="متابعة مراحل إطلاق الوديعة المصرفية لكل شركة: الإرسال، المشاور، المحاسب، والباركود" />

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
          <span><Mi n="my_location" />تم تحديد الشركة المطلوبة وتصديرها للأعلى لمتابعة مسار الوديعة</span>
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
            text="يمكنك إطلاق الوديعة لأي شركة صادرة الشهادة من صفحة «تأسيس الشركات»."
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {visible.map(dep => {
            const company = dep.companies
            const stages = [...(dep.deposit_stages || [])].sort((a, b) => a.stage_order - b.stage_order)
            const isSubmitted = stages.find(s => s.stage_key === 'submit')?.state === 'done'
            return (
              <DepositCard
                key={dep.id}
                dep={dep}
                stages={stages}
                pen={company ? penaltyState(company, isSubmitted) : null}
                isFocused={selectedCompanyFocus === dep.company_id}
                isCompleted={getDepositStatusInfo(dep).isFullyCompleted}
                canRelease={canRelease}
                loading={loading}
                savingId={savingId}
                justDoneId={justDoneId}
                celebrate={celebrateId === dep.id}
                editingStageId={editingStageId}
                editDate={editDate}
                setEditDate={setEditDate}
                onEdit={stage => {
                  setEditingStageId(stage ? stage.id : null)
                  if (stage) setEditDate(stage.at_date || new Date().toISOString().slice(0, 10))
                }}
                onToggle={handleToggleStage}
                onUpload={handleBarcodeUpload}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

