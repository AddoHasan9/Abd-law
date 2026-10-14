'use client'
/**
 * بطاقة الساعة — أكبر وأنعم:
 *   أرقام تتدحرج عند التغيّر · نقطتان «تتنفّسان» · خلفية ألوان هادئة تتحرك ببطء
 *   التاريخ (ميلادي + هجري) · شريط «يوم العمل» بألوان متماوجة ونقطة «الآن» تطلق حلقات
 * بتوقيت بغداد، تُرسم بعد التحميل فقط، وتحترم «تقليل الحركة».
 */
import { useEffect, useState } from 'react'

const TZ = 'Asia/Baghdad'
/** ساعات الدوام (بتوقيت بغداد) */
const WORK_START = 8 * 60
const WORK_END = 16 * 60

const fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const fmtWeekday = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: TZ, weekday: 'long' })
const fmtGreg = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
const fmtHijri = new Intl.DateTimeFormat('ar-IQ-u-ca-islamic-umalqura-nu-latn', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })

const hm = (mins: number) => {
  const h = Math.floor(mins / 60), m = mins % 60
  if (!h) return `${m} د`
  return m ? `${h} س ${m} د` : `${h} س`
}

/** رقم يتدحرج: عمود 0-9 ينزلق إلى الرقم الحالي */
function Roll({ d, className = '' }: { d: string; className?: string }) {
  const n = /\d/.test(d) ? Number(d) : null
  return (
    <span className={`cr-roll ${className}`} aria-hidden>
      <span className="cr-strip" style={{ transform: `translateY(${n == null ? 0 : -n * 10}%)` }}>
        {Array.from({ length: 10 }, (_, i) => <span key={i}>{n == null ? '–' : i}</span>)}
      </span>
    </span>
  )
}

export default function ClockCard() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    let t: ReturnType<typeof setTimeout>
    const tick = () => { setNow(new Date()); t = setTimeout(tick, 1000 - (Date.now() % 1000)) }
    t = setTimeout(tick, 1000 - (Date.now() % 1000))
    return () => clearTimeout(t)
  }, [])

  const p = now ? Object.fromEntries(fmtParts.formatToParts(now).map(x => [x.type, x.value])) : null
  const h24 = p ? Number(p.hour) % 24 : 0
  const min = p ? Number(p.minute) : 0
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const hh = now ? String(h12).padStart(2, '0') : '--'
  const mm = p ? p.minute : '--'
  const ss = p ? p.second : '--'
  const period = now ? (h24 < 12 ? 'صباحاً' : 'مساءً') : ''

  // يوم العمل
  const nowMin = h24 * 60 + min
  const total = WORK_END - WORK_START
  const done = Math.min(Math.max(nowMin - WORK_START, 0), total)
  const pct = now ? (done / total) * 100 : 0
  const state = !now ? 'idle' : nowMin < WORK_START ? 'before' : nowMin >= WORK_END ? 'after' : 'during'
  const workText = !now ? '\u00A0'
    : state === 'before' ? `يبدأ الدوام بعد ${hm(WORK_START - nowMin)}`
    : state === 'after' ? 'انتهى دوام اليوم ✓'
    : `مضى ${hm(done)} · باقي ${hm(total - done)}`

  return (
    <section className={`cr-card bx-card${now ? ' is-ready' : ''}`} aria-label="الوقت والتاريخ بتوقيت بغداد">
      <span className="cr-mesh" aria-hidden><i /><i /><i /></span>

      <div className="cr-top">
        {/* الوقت */}
        <div className="cr-time" role="timer" aria-live="off" aria-label={now ? `${h12}:${mm} ${period}` : ''}>
          <div className="cr-digits">
            <Roll d={hh[0]} /><Roll d={hh[1]} />
            <span className="cr-colon" aria-hidden><i /><i /></span>
            <Roll d={mm[0]} /><Roll d={mm[1]} />
          </div>
          <div className="cr-side">
            <span className="cr-period">{period}</span>
            <span className="cr-sec"><Roll d={ss[0]} className="sm" /><Roll d={ss[1]} className="sm" /></span>
          </div>
        </div>

        {/* التاريخ */}
        <div className="cr-date">
          <div className="cr-day">{now ? fmtWeekday.format(now) : '\u00A0'}</div>
          <div className="cr-greg">{now ? fmtGreg.format(now) : '\u00A0'}</div>
          <div className="cr-hijri">{now ? `${fmtHijri.format(now).replace(/\s*هـ$/, '')} هـ` : '\u00A0'}</div>
          <span className="cr-tz">بتوقيت بغداد</span>
        </div>
      </div>

      {/* يوم العمل */}
      <div className={`cr-work is-${state}`}>
        <div className="cr-work-head">
          <span>يوم العمل <small>8:00 ص – 4:00 م</small></span>
          <b className="num">{state === 'during' ? `${Math.round(pct)}%` : state === 'after' ? '100%' : ''}</b>
        </div>
        <div className="cr-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="نسبة ما مضى من الدوام">
          <span className="cr-fill" style={{ width: `${pct}%` }} />
          {state === 'during' && <span className="cr-orb" style={{ insetInlineStart: `${pct}%` }} />}
        </div>
        <div className="cr-work-text">{workText}</div>
      </div>
    </section>
  )
}
