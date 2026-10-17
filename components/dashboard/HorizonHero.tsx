'use client'

/**
 * رأس لوحة التحكم بأسلوب Horizon: تحية كبيرة باسم المستخدم + صندوق «إضافة سريعة».
 * الإضافة حقيقية: تحفظ مهمة (tasks) أو تذكيراً (reminders) بنفس الإجراءات المستخدمة في صفحاتهما،
 * فتنطبق نفس الصلاحيات والتنبيهات. النسخة الحالية «بسيطة»: التاريخ والوقت يُختاران من الحقلين.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/context/UserRoleContext'
import { baghdadNow } from '@/lib/push/time'
import { saveTaskAction } from '@/app/(app)/tasks/actions'
import { createReminderAction } from '@/app/(app)/reminders/actions'

type Kind = 'task' | 'reminder'

const CHIPS = ['مراجعة دائرة', 'تجديد هوية', 'تأسيس شركة', 'إطلاق وديعة']

interface Props {
  /** عدد المهل القريبة/المتأخرة (يظهر في الحبة أعلى التحية) */
  deadlinesCount: number
}

export default function HorizonHero({ deadlinesCount }: Props) {
  const { profile } = usePermissions()
  const router = useRouter()
  const firstName = (profile?.name || '').trim().split(/\s+/)[0] || ''

  // التحية حسب ساعة بغداد — تُحسب بعد التحميل حتى لا يختلف ما يرسمه الخادم عن المتصفح
  const [greet, setGreet] = useState('أهلاً')
  const [today, setToday] = useState('')
  useEffect(() => {
    const now = baghdadNow()
    const h = Number(now.time.slice(0, 2))
    setGreet(h < 12 ? 'صباح الخير' : 'مساء الخير')
    setToday(now.date)
  }, [])

  const [kind, setKind] = useState<Kind>('task')
  const [text, setText] = useState('')
  const [when, setWhen] = useState<'today' | 'tomorrow' | 'none'>('today')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string; href?: string } | null>(null)
  const boxRef = useRef<HTMLInputElement>(null)

  // تاريخ الغد بتوقيت بغداد (من تاريخ اليوم نفسه، فلا يتأثر بمنطقة الجهاز)
  const addDays = (d: string, n: number) => {
    const [y, m, dd] = d.split('-').map(Number)
    const t = new Date(Date.UTC(y, m - 1, dd + n))
    return t.toISOString().slice(0, 10)
  }

  async function submit() {
    const title = text.trim()
    if (!title || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const base = today || baghdadNow().date
      const day = when === 'none' ? null : when === 'tomorrow' ? addDays(base, 1) : base
      const res = kind === 'task'
        ? await saveTaskAction({ title, task_date: day, task_time: day ? (time || null) : null })
        : await createReminderAction({ title, due_date: day || undefined, due_time: day ? (time || undefined) : undefined })
      if (res && res.success) {
        const whenTxt = day === null ? '' : when === 'tomorrow' ? ' لباچر' : ' لليوم'
        setMsg({
          tone: 'ok',
          text: kind === 'task' ? `انضافت المهمة${whenTxt}` : `انضاف التذكير${whenTxt}`,
          href: kind === 'task' ? '/tasks' : '/reminders',
        })
        setText('')
        setTime('')
        router.refresh()
      } else {
        setMsg({ tone: 'err', text: (res && 'error' in res && res.error) || 'تعذّر الحفظ. حاول مجدداً' })
      }
    } catch {
      setMsg({ tone: 'err', text: 'تعذّر الحفظ. تحقق من الاتصال وحاول مجدداً' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="hz-hero" aria-label="الترحيب والإضافة السريعة">
      <span className="hz-pill">
        <b>اليوم</b>
        {deadlinesCount > 0 ? <span><span className="num">{deadlinesCount}</span> مهل تحتاج متابعة</span> : <span>لا توجد مهل قريبة</span>}
      </span>

      <h1 className="hz-greet">
        {greet}{firstName ? <>، <span>{firstName}</span></> : null}
      </h1>
      <p className="hz-sub">كل يومك بمكان واحد: المهام، والمهل، والتذكيرات، وملفات الشركات.</p>

      <form className="hz-box" onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="hz-row">
          <label htmlFor="hz-text" className="sr-only">إضافة سريعة</label>
          <input
            id="hz-text"
            ref={boxRef}
            type="text"
            className="hz-input"
            value={text}
            maxLength={300}
            enterKeyHint="send"
            autoComplete="off"
            onChange={e => { setText(e.target.value); if (msg) setMsg(null) }}
            placeholder={kind === 'task' ? 'أضف مهمة… مثلاً: تصديق وكالة بالخارجية' : 'أضف تذكير… مثلاً: الاتصال بالموكل'}
          />
          <button type="submit" className="hz-send" disabled={!text.trim() || busy} aria-label={kind === 'task' ? 'إضافة المهمة' : 'إضافة التذكير'}>
            <span className="material-symbols-outlined" aria-hidden>{busy ? 'progress_activity' : 'arrow_upward'}</span>
          </button>
        </div>
        <div className="hz-bar">
          <div className="hz-seg" role="radiogroup" aria-label="نوع الإضافة">
            <button type="button" role="radio" aria-checked={kind === 'task'} onClick={() => setKind('task')}>مهمة</button>
            <button type="button" role="radio" aria-checked={kind === 'reminder'} onClick={() => setKind('reminder')}>تذكير</button>
          </div>
          <label className="hz-chip">
            <span className="material-symbols-outlined" aria-hidden>event</span>
            <span className="sr-only">الموعد</span>
            <select value={when} onChange={e => setWhen(e.target.value as typeof when)}>
              <option value="today">اليوم</option>
              <option value="tomorrow">باچر</option>
              <option value="none">بدون تاريخ</option>
            </select>
          </label>
          {when !== 'none' && (
            <label className={`hz-chip${time ? ' has-val' : ''}`}>
              <span className="material-symbols-outlined" aria-hidden>schedule</span>
              {!time && <span className="hz-chip-ph" aria-hidden>الوقت</span>}
              <span className="sr-only">الوقت (اختياري)</span>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </label>
          )}
        </div>
      </form>

      <div className="hz-hint" role="status" aria-live="polite">{msg ? (
        <span className={msg.tone === 'ok' ? 'is-ok' : 'is-err'}>
          {msg.tone === 'ok' ? '✓ ' : ''}{msg.text}
          {msg.href ? <> — <Link href={msg.href} className="link">فتح</Link></> : null}
        </span>
      ) : null}</div>

      <div className="hz-chips" aria-label="اقتراحات سريعة">
        {CHIPS.map(c => (
          <button key={c} type="button" onClick={() => { setText(`${c}: `); setKind('task'); boxRef.current?.focus() }}>{c}</button>
        ))}
      </div>
    </section>
  )
}
