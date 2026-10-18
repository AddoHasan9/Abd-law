'use client'

/**
 * كارت إطلاق الوديعة (النموذج الرابع المطوّر):
 * عدّاد مهلة واضح يتلوّن حسب الإلحاح، خط دوائر حيّ للمحطات الأربع، مربعات للمحطات الثلاث، ومحطة الباركود.
 * المنطق (الصلاحيات، قاعدة الـ15 يوماً، قفل الباركود) كما هو؛ الشكل والحركة فقط تغيّرت.
 */
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Mi } from '@/components/ui/Mi'
import { formatDate, formatMoney } from '@/lib/constants'
import BarcodeUploader from './BarcodeUploader'
import type { DepositStage, Company, Deposit, PenaltyState } from '@/types/database'

type DepositFull = Deposit & { companies: Company | null; deposit_stages: DepositStage[] }

const SHORT: Record<string, string> = {
  submit: 'النظام', advisor: 'المشاور', consultant: 'المشاور', accountant: 'المحاسب', barcode: 'الباركود',
}

interface Props {
  dep: DepositFull
  stages: DepositStage[]
  pen: PenaltyState | null
  isFocused: boolean
  isCompleted: boolean
  canRelease: boolean
  loading: boolean
  savingId: string | null
  justDoneId: string | null
  celebrate: boolean
  editingStageId: string | null
  editDate: string
  setEditDate: (v: string) => void
  onEdit: (stage: DepositStage | null) => void
  onToggle: (stage: DepositStage, state: 'done' | 'idle', atDate?: string) => void
  onUpload: (stageId: string, companyId: string, file: File) => Promise<void>
}

/** مدة المهلة الكلية (من تاريخ الشهادة إلى نهاية المهلة) لرسم الحلقة */
function totalDays(company: Company | null, pen: PenaltyState | null) {
  if (!company?.cert_date || !pen) return 1
  const ms = new Date(pen.due).getTime() - new Date(company.cert_date).getTime()
  return Math.max(1, Math.round(ms / 86400000))
}

function urgency(pen: PenaltyState | null, submitted: boolean, completed: boolean) {
  if (completed) return { tone: 'ok', label: 'أُطلقت الوديعة' }
  if (submitted || !pen) return { tone: 'ok', label: 'أُرسلت · لا غرامة' }
  if (pen.daysLeft <= 0) return { tone: 'bad', label: 'متأخرة' }
  if (pen.daysLeft <= 7) return { tone: 'bad', label: 'مهلة حرجة' }
  if (pen.daysLeft <= 21) return { tone: 'warn', label: 'المهلة تقترب' }
  return { tone: 'ok', label: 'المهلة مريحة' }
}

export default function DepositCard(p: Props) {
  const { dep, stages, pen, isCompleted, canRelease, loading } = p
  const company = dep.companies
  const flow = stages.filter(s => s.stage_key !== 'barcode')
  const barcode = stages.find(s => s.stage_key === 'barcode')
  const submit = stages.find(s => s.stage_key === 'submit')
  const submitted = submit?.state === 'done'
  const priorDone = flow.length > 0 && flow.every(s => s.state === 'done')
  const barcodeDone = barcode?.state === 'done' || Boolean(company?.barcode_url) || Boolean(barcode?.notes)
  const doneCount = stages.filter(s => s.state === 'done').length
  const isDone = (s: DepositStage) => (s.stage_key === 'barcode' ? barcodeDone : s.state === 'done')

  // الدائرة الحالية = أول محطة غير مكتملة بالترتيب
  const firstOpen = stages.findIndex(s => !isDone(s))
  const cur = isCompleted ? -1 : firstOpen
  const nowName = cur === -1 ? 'اكتمل الإطلاق' : stages[cur]?.label ?? ''
  const n = stages.length
  const seg = n > 1 ? 1 / (n - 1) : 1
  const fill = firstOpen === -1 ? 1 : Math.max(firstOpen - 1, 0) * seg

  const u = urgency(pen, submitted, isCompleted)
  const total = totalDays(company, pen)
  const left = pen ? Math.max(pen.daysLeft, 0) : 0
  const R = 44, C = 2 * Math.PI * R
  const ratio = isCompleted || submitted || !pen ? 1 : Math.min(1, left / total)

  // قصاصات الاحتفال عند إطلاق الوديعة
  const cardRef = useRef<HTMLDivElement>(null)
  const [bits, setBits] = useState<{ x: number; y: number; r: number; c: number; d: number }[]>([])
  useEffect(() => {
    if (!p.celebrate) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setBits(Array.from({ length: 34 }, (_, k) => {
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 140
      return { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, r: Math.random() * 720 - 360, c: k % 4, d: Math.random() * 0.08 }
    }))
    const t = setTimeout(() => setBits([]), 1400)
    return () => clearTimeout(t)
  }, [p.celebrate])

  const dateTools = (stage: DepositStage) =>
    p.editingStageId === stage.id ? (
      <div className="dpc-edit">
        <input type="date" className="input num" value={p.editDate} onChange={e => p.setEditDate(e.target.value)} aria-label="تاريخ الإكمال" />
        <div className="dpc-edit-row">
          <button type="button" className="dpc-mini dpc-mini--go" disabled={loading} onClick={() => p.onToggle(stage, 'done', p.editDate)}>حفظ</button>
          <button type="button" className="dpc-mini" onClick={() => p.onEdit(null)}>إلغاء</button>
        </div>
      </div>
    ) : (
      <div className="dpc-tools">
        <button type="button" className="dpc-mini" disabled={loading} onClick={() => p.onToggle(stage, 'idle')}>تراجع</button>
        <button type="button" className="dpc-mini" disabled={loading} onClick={() => p.onEdit(stage)}>التاريخ</button>
      </div>
    )

  return (
    <div
      ref={cardRef}
      className={`card dpc dpc--${u.tone}${p.isFocused ? ' dpc--focus' : ''}${isCompleted ? ' dpc--released' : ''}`}
    >
      {/* الرأس */}
      <div className="dpc-head">
        <div className="dpc-ico"><Icon name={isCompleted ? 'check' : 'vault'} /></div>
        <div className="dpc-title">
          <b title={company?.name ?? '—'}>{company?.name ?? '—'}</b>
          <small>بدأت المتابعة <span className="num">{formatDate(dep.started_at)}</span></small>
        </div>
        <span className={`dpc-count num${isCompleted ? ' is-ok' : ''}`}>{isCompleted ? '✓ مطلقة' : `${doneCount}/${n}`}</span>
      </div>

      {/* عدّاد المهلة */}
      <div className="dpc-hero">
        <div className={`dpc-ring${u.tone === 'bad' && !submitted && !isCompleted ? ' is-hot' : ''}`}>
          <svg viewBox="0 0 104 104" aria-hidden>
            <circle className="bg" cx="52" cy="52" r={R} />
            <circle className="fg" cx="52" cy="52" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} />
          </svg>
          <div>
            {isCompleted || submitted || !pen ? (
              <span className="dpc-ring-ok"><Icon name="check" /></span>
            ) : pen.daysLeft > 0 ? (
              <><b className="num">{pen.daysLeft}</b><small>يوم متبقٍ</small></>
            ) : (
              <><b className="num">{pen.daysLate}</b><small>يوم تأخير</small></>
            )}
          </div>
        </div>
        <div className="dpc-hinfo">
          <span className="dpc-u"><i />{u.label}</span>
          {isCompleted ? (
            <b>تم إطلاق الوديعة بنجاح</b>
          ) : submitted || !pen ? (
            <b>بانتظار إكمال المحطات</b>
          ) : (
            <>
              <b className="num">تنتهي المهلة {formatDate(pen.due)}</b>
              {pen.amount > 0 && <small className="num dpc-fine">غرامة متراكمة {formatMoney(pen.amount)}{pen.capped ? ' (بلغت السقف)' : ''}</small>}
            </>
          )}
          {!isCompleted && pen && !pen.canSubmitYet && (
            <small className="num">الإرسال متاح بعد {pen.daysUntilSubmitAllowed} يوم (شركة شركاء)</small>
          )}
        </div>
      </div>

      {/* خط الدوائر الحيّ */}
      <div className="dpc-prog">
        <div className="dpc-ph">
          <span>تقدّم الإطلاق</span>
          <span key={nowName} className="dpc-now">الآن: <b>{nowName}</b></span>
        </div>
        <div className="dl" style={{ ['--n' as string]: n }}>
          <div className="dl-tr" />
          {firstOpen > 0 && (
            <div className="dl-flow" style={{
              insetInlineStart: `calc(var(--d) / 2 + (100% - var(--d)) * ${(firstOpen - 1) * seg})`,
              width: `calc((100% - var(--d)) * ${seg})`,
            }} />
          )}
          <div className="dl-fl" style={{ width: `calc((100% - var(--d)) * ${firstOpen === 0 ? 0 : fill})` }} />
          <div className="dl-sp">
            {stages.map((s, i) => {
              const st = isDone(s) ? 'done' : i === cur ? 'cur' : 'todo'
              const tip = `${i + 1}. ${s.label}${st === 'done' ? ' · مكتملة' : st === 'cur' ? ' · الآن' : ''}`
              return (
                <div key={s.id} className={`dl-s is-${st}${p.justDoneId === s.id ? ' is-just' : ''}`} style={{ ['--k' as string]: i }}>
                  <span className="dl-tip">{tip}</span>
                  <div className="dl-o" tabIndex={0} aria-label={tip}>
                    {st === 'done' ? <Mi n="check" /> : i + 1}
                  </div>
                  <span className="dl-l">{SHORT[s.stage_key] ?? s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* المحطات */}
      <div className="dpc-tiles">
        {flow.map(stage => {
          const done = stage.state === 'done'
          const isCur = stages[cur]?.id === stage.id
          const locked = stage.stage_key === 'submit' && pen?.canSubmitYet === false && !done
          const saving = p.savingId === stage.id
          const editing = p.editingStageId === stage.id
          return (
            <div
              key={stage.id}
              className={`dpc-tile${done ? ' is-done' : isCur ? ' is-cur' : ''}${p.justDoneId === stage.id ? ' is-just' : ''}${editing ? ' is-wide' : ''}`}
            >
              <span className="dpc-n">{done ? <Mi n="check" /> : stage.stage_order}</span>
              <b>{stage.label}</b>
              {done ? (
                <>
                  <span className="dpc-dt num">{formatDate(stage.at_date)}</span>
                  {canRelease ? dateTools(stage) : <span className="dpc-note">تم اعتمادها</span>}
                </>
              ) : !canRelease ? (
                <span className="dpc-note">قيد المتابعة</span>
              ) : locked ? (
                <span className="dpc-lockline num"><Mi n="lock" />بعد {pen?.daysUntilSubmitAllowed} يوم</span>
              ) : (
                <button
                  type="button"
                  className={`dpc-go${isCur ? '' : ' is-soft'}`}
                  disabled={loading}
                  onClick={() => p.onToggle(stage, 'done')}
                >
                  {saving ? <span className="dpc-spin" aria-hidden /> : <Mi n="check" />}
                  {saving ? 'حفظ…' : 'إكمال'}
                </button>
              )}
            </div>
          )
        })}

        {barcode && company && (
          <div className={`dpc-tile is-wide${barcodeDone ? ' is-done' : priorDone ? ' is-cur' : ''}${p.justDoneId === barcode.id ? ' is-just' : ''}`}>
            <div className="dpc-tile-row">
              <span className="dpc-n">{barcodeDone ? <Mi n="check" /> : barcode.stage_order}</span>
              <b>{barcode.label}</b>
            </div>
            {!priorDone && !barcodeDone && (
              <div className="dpc-lock"><Mi n="lock" />أكمل المحطات الثلاث الأولى لرفع الباركود.</div>
            )}
            <BarcodeUploader
              stageId={barcode.id}
              companyId={company.id}
              initialBarcodeUrl={barcode.notes || company.barcode_url || null}
              disabled={!canRelease || loading || (!priorDone && !barcodeDone)}
              onUpload={p.onUpload}
            />
          </div>
        )}
      </div>

      {isCompleted && (
        <div className="dpc-released">
          <Icon name="check" />
          <div>أُطلقت الوديعة<small>تم إكمال جميع المحطات</small></div>
          <a href="/commercial/companies-registry">سجل الشركات ←</a>
        </div>
      )}

      {bits.length > 0 && (
        <div className="dpc-confetti" aria-hidden>
          {bits.map((b, k) => (
            <i key={k} className={`c${b.c}`} style={{
              ['--x' as string]: `${b.x}px`, ['--y' as string]: `${b.y}px`, ['--r' as string]: `${b.r}deg`, animationDelay: `${b.d}s`,
            }} />
          ))}
        </div>
      )}
    </div>
  )
}
