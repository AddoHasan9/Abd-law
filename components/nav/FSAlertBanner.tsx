'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { DeadlineItem } from './DeadlineCard'

/**
 * تنبيه عام أعلى كل صفحة عندما تقترب مهلة الحسابات الختامية (30 يوماً فأقل) أو تتأخر،
 * للشركات المكلّف بها المكتب فقط. يمكن إخفاؤه لليوم، ويعود إذا ظهرت شركة جديدة في القائمة.
 */
const WINDOW_DAYS = 30

export function FSAlertBanner({ deadlines }: { deadlines: DeadlineItem[] }) {
  const items = useMemo(
    () => deadlines.filter(d => d.category === 'financial_statement' && d.daysLeft <= WINDOW_DAYS).sort((a, b) => a.daysLeft - b.daysLeft),
    [deadlines],
  )
  const overdue = items.filter(d => d.daysLeft < 0)
  const soon = items.filter(d => d.daysLeft >= 0)
  const signature = items.map(d => d.id).join('|')
  const key = `fs-alert-hidden:${new Date().toISOString().slice(0, 10)}`
  const [hidden, setHidden] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try { setHidden(localStorage.getItem(key) === signature) } catch { setHidden(false) }
  }, [key, signature])

  if (!items.length || hidden) return null

  const hide = () => {
    try { localStorage.setItem(key, signature) } catch {}
    setHidden(true)
  }

  const severity = overdue.length ? 'is-late' : 'is-soon'
  return (
    <div className={`fs-alert ${severity}`} role="alert">
      <div className="fs-alert-row">
        <span className="fs-alert-icon material-symbols-outlined" aria-hidden>{overdue.length ? 'error' : 'schedule'}</span>
        <div className="fs-alert-text">
          <b>الحسابات الختامية</b>
          <span>
            {overdue.length > 0 && <>متأخرة: <b className="num">{overdue.length}</b> {overdue.some(d => (d.amount ?? 0) > 0) ? '(غرامة جارية)' : ''}</>}
            {overdue.length > 0 && soon.length > 0 && ' · '}
            {soon.length > 0 && <>تقترب مهلتها: <b className="num">{soon.length}</b> — أقربها بعد <b className="num">{soon[0].daysLeft}</b> يوم</>}
          </span>
        </div>
        <div className="fs-alert-actions">
          <button type="button" className="btn btn-sm fs-alert-btn" onClick={() => setOpen(v => !v)} aria-expanded={open}>
            {open ? 'إخفاء القائمة' : 'عرض الشركات'}
          </button>
          <button type="button" className="icon-btn fs-alert-close" onClick={hide} aria-label="إخفاء التنبيه لليوم" title="إخفاء لليوم">
            <span className="material-symbols-outlined" aria-hidden>close</span>
          </button>
        </div>
      </div>
      {open && (
        <ul className="fs-alert-list">
          {items.map(d => (
            <li key={d.id}>
              <Link href={d.linkUrl}>
                <span className="min-w-0">
                  <b className="truncate">{d.companyName}</b>
                  <small>{d.title}</small>
                </span>
                <span className={`fs-alert-days ${d.daysLeft < 0 ? 'is-late' : d.daysLeft <= 7 ? 'is-urgent' : ''}`}>
                  {d.daysLeft < 0 ? `متأخرة ${-d.daysLeft} يوم` : d.daysLeft === 0 ? 'اليوم' : `باقي ${d.daysLeft} يوم`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
