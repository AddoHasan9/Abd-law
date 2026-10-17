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
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string; href?: string } | null>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (today && !date) setDate(today) }, [today, date])

  // Keep the composer compact until the text needs more space.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${Math.min(box.scrollHeight, 160)}px`
  }, [text])

  async function submit() {
    const title = text.trim()
    if (!title || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const when = date || today || null
      const res = kind === 'task'
        ? await saveTaskAction({ title, task_date: when, task_time: time || null })
        : await createReminderAction({ title, due_date: when || undefined, due_time: time || undefined })
      if (res && res.success) {
        const isToday = !when || when === today
        setMsg({
          tone: 'ok',
          text: kind === 'task' ? (isToday ? 'انضافت المهمة لليوم' : 'انضافت المهمة') : 'انضاف التذكير',
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

      <form
        className="hz-box"
        onSubmit={e => { e.preventDefault(); submit() }}
      >
        <label htmlFor="hz-text" className="sr-only">إضافة سريعة</label>
        <textarea
          id="hz-text"
          ref={boxRef}
          value={text}
          maxLength={300}
          rows={2}
          onChange={e => { setText(e.target.value); if (msg) setMsg(null) }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder={kind === 'task'
            ? 'اكتب مهمة… مثل مراجعة وزارة الخارجية'
            : 'اكتب تذكيراً… مثل الاتصال بالموكل'}
        />
        <div className="hz-bar">
          <div className="hz-seg" role="radiogroup" aria-label="نوع الإضافة">
            <button type="button" role="radio" aria-checked={kind === 'task'} onClick={() => setKind('task')}>مهمة</button>
            <button type="button" role="radio" aria-checked={kind === 'reminder'} onClick={() => setKind('reminder')}>تذكير</button>
          </div>
          <button type="submit" className="hz-send" disabled={!text.trim() || busy} aria-label={kind === 'task' ? 'إضافة المهمة' : 'إضافة التذكير'}>
            <span className="material-symbols-outlined" aria-hidden>{busy ? 'progress_activity' : 'arrow_upward'}</span>
          </button>
        </div>
        <div className="hz-when">
          <label className="hz-field" htmlFor="hz-date">
            <span>التاريخ</span>
            <input id="hz-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label className="hz-field" htmlFor="hz-time">
            <span>الوقت <small>اختياري</small></span>
            <input id="hz-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </label>
        </div>
      </form>

      <div className={`hz-hint${msg ? ' has-message' : ''}`} role="status" aria-live="polite">
        {msg ? (
          <span className={msg.tone === 'ok' ? 'is-ok' : 'is-err'}>
            {msg.tone === 'ok' ? '✓ ' : ''}{msg.text}
            {msg.href ? <> — <Link href={msg.href} className="link">فتح</Link></> : null}
          </span>
        ) : null}
      </div>

      <div className="hz-chips" aria-label="اقتراحات سريعة">
        {CHIPS.map(c => (
          <button key={c} type="button" onClick={() => { setText(`${c}: `); setKind('task'); boxRef.current?.focus() }}>{c}</button>
        ))}
      </div>
    </section>
  )
}
