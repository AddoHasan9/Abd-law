'use client'

/**
 * لوحة Kanban للمعاملات: عمود لكل حالة، اسحب البطاقة لتغيير حالتها.
 * على اللمس: قائمة «نقل إلى» في كل بطاقة (السحب بالإصبع غير عملي).
 * التغيير يظهر فوراً ويُحفظ في الخادم؛ وإذا رُفض (مثل سجل يُدار من قسمه) يرجع لمكانه مع رسالة.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { txType, formatDate } from '@/lib/constants'
import { getWorkflowStatusConfig, normalizeWorkflowStatus, type WorkflowStatusKey } from '@/lib/workflow-status'
import { updateWorkflowStatusAction } from '@/app/(app)/commercial/workflow-actions'
import { showError } from '@/components/ui/ConfirmDialog'
import type { TransactionFull } from '@/types/database'

const COLUMNS: WorkflowStatusKey[] = ['new', 'in_progress', 'under_review', 'waiting_client', 'waiting_government', 'completed']

type Row = TransactionFull & { assigned_lawyer_name?: string | null; company_name?: string | null }

export default function TxBoard({ rows }: { rows: TransactionFull[] }) {
  const router = useRouter()
  const [moved, setMoved] = useState<Record<string, WorkflowStatusKey>>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<WorkflowStatusKey | null>(null)
  const [justMoved, setJustMoved] = useState<string | null>(null)

  const statusOf = (t: Row) => moved[t.id] ?? normalizeWorkflowStatus(t.status)
  const items = (rows as Row[]).filter(t => COLUMNS.includes(statusOf(t)))
  const hiddenCount = rows.length - items.length

  const move = async (t: Row, to: WorkflowStatusKey) => {
    const from = statusOf(t)
    if (from === to) return
    setMoved(m => ({ ...m, [t.id]: to }))
    setJustMoved(t.id)
    const res = await updateWorkflowStatusAction({
      entityId: t.id,
      entityType: 'transaction',
      companyId: t.company_id,
      fromStatus: from,
      toStatus: to,
    }).catch(() => ({ success: false, error: 'تعذّر الاتصال بالخادم' }))
    if (!res.success) {
      setMoved(m => ({ ...m, [t.id]: from }))
      void showError(res.error || 'تعذّر تغيير الحالة', 'لوحة المعاملات')
      return
    }
    router.refresh()
  }

  const open = (t: Row) => {
    if (!t.company_id) return
    const isFormation = t.type === 'formation' || t.type === 'tasis' || txType(t.type).label.includes('تأسيس')
    router.push(isFormation ? `/commercial/companies?id=${t.company_id}` : `/commercial/companies/${t.company_id}`)
  }

  return (
    <div className="kb">
      <div className="kb-board">
        {COLUMNS.map(col => {
          const cfg = getWorkflowStatusConfig(col)
          const cards = items.filter(t => statusOf(t) === col)
          return (
            <section
              key={col}
              className={`kb-col${overCol === col && dragId ? ' is-over' : ''}`}
              aria-label={cfg.label}
              onDragOver={e => { e.preventDefault(); if (overCol !== col) setOverCol(col) }}
              onDragLeave={() => setOverCol(c => (c === col ? null : c))}
              onDrop={e => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain') || dragId
                const t = (rows as Row[]).find(r => r.id === id)
                setDragId(null); setOverCol(null)
                if (t) void move(t, col)
              }}
            >
              <header className="kb-col-head">
                <h3><span className="kb-dot" style={{ background: cfg.text }} aria-hidden />{cfg.label}</h3>
                <span className="kb-count num">{cards.length}</span>
              </header>
              <div className="kb-list">
                {cards.map(t => {
                  const company = t.companies?.name || t.company_name || 'بدون شركة'
                  const lawyer = t.assigned_lawyer_name || t.profiles?.name || null
                  return (
                    <article
                      key={t.id}
                      className={`kb-card${dragId === t.id ? ' is-dragging' : ''}${justMoved === t.id ? ' is-moved' : ''}`}
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setDragId(t.id); setJustMoved(null) }}
                      onDragEnd={() => { setDragId(null); setOverCol(null) }}
                    >
                      <div className="kb-card-top">
                        <span className="kb-type">{txType(t.type).label}</span>
                        <span className="kb-date num">{t.tx_date ? formatDate(t.tx_date) : '—'}</span>
                      </div>
                      <button type="button" className="kb-title" onClick={() => open(t)} disabled={!t.company_id}>{company}</button>
                      <div className="kb-card-foot">
                        <span className="kb-lawyer">
                          <span className="kb-avatar" aria-hidden>{lawyer ? lawyer.trim().slice(0, 1) : '—'}</span>
                          {lawyer || 'غير مكلّف'}
                        </span>
                        <label className="kb-move">
                          <span className="sr-only">نقل «{company}» إلى</span>
                          <select value={statusOf(t)} onChange={e => void move(t, e.target.value as WorkflowStatusKey)}>
                            {COLUMNS.map(c => <option key={c} value={c}>{getWorkflowStatusConfig(c).label}</option>)}
                          </select>
                        </label>
                      </div>
                    </article>
                  )
                })}
                {!cards.length && <div className="kb-empty">أفلت المعاملة هنا</div>}
              </div>
            </section>
          )
        })}
      </div>
      {hiddenCount > 0 && (
        <p className="kb-note">لا تظهر في اللوحة <span className="num">{hiddenCount}</span> معاملة مغلقة أو ملغاة — تجدها في عرض الجدول.</p>
      )}
    </div>
  )
}
