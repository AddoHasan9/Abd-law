'use client'
/**
 * بطاقة الساعة — متوازنة تملأ العرض بثلاث مناطق:
 *   الوقت (أرقام كبيرة واضحة) · شريط «يوم العمل» (مضى/باقي + علامة الآن) · التاريخ (ميلادي + هجري)
 * بتوقيت بغداد، تُرسم بعد التحميل فقط، وتحترم «تقليل الحركة».
 */
import { useEffect, useState } from 'react'

const TZ = 'Asia/Baghdad'
/** ساعات الدوام (بتوقيت بغداد) — تُعدَّل هنا */
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
const label12 = (mins: number) => {
  const h = Math.floor(mins / 60) % 24, h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(mins % 60).padStart(2, '0')}`
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
  const pct = now ? Math.round((done / total) * 100) : 0
  const state = !now ? '' : nowMin < WORK_START ? 'before' : nowMin >= WORK_END ? 'after' : 'during'
  const workText = !now ? '\u00A0'
    : state === 'before' ? `يبدأ الدوام بعد ${hm(WORK_START - nowMin)}`
    : state === 'after' ? 'انتهى دوام اليوم'
    : `مضى ${hm(done)} · باقي ${hm(total - done)}`

  return (
    <section className="hc-card bx-card" aria-label="الوقت والتاريخ بتوقيت بغداد">
      {/* التاريخ */}
      <div className="hc-date">
        <div className="hc-day">{now ? fmtWeekday.format(now) : '\u00A0'}</div>
        <div className="hc-greg">{now ? fmtGreg.format(now) : '\u00A0'}</div>
        <div className="hc-hijri">{now ? `${fmtHijri.format(now).replace(/\s*هـ$/, '')} هـ` : '\u00A0'}</div>
      </div>

      {/* يوم العمل */}
      <div className={`hc-work is-${state || 'idle'}`}>
        <div className="hc-work-head">
          <span>يوم العمل</span>
          <b className="num">{state === 'during' ? `${pct}%` : ''}</b>
        </div>
        <div className="hc-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="نسبة ما مضى من الدوام">
          <span className="hc-fill" style={{ width: `${pct}%` }} />
          {state === 'during' && <span className="hc-now" style={{ insetInlineStart: `${pct}%` }} />}
        </div>
        <div className="hc-work-foot">
          <span className="num">{label12(WORK_START)} ص</span>
          <span className="hc-work-text">{workText}</span>
          <span className="num">{label12(WORK_END)} م</span>
        </div>
      </div>

      {/* الوقت */}
      <div className="hc-time" role="timer" aria-live="off" aria-label={now ? `${h12}:${mm} ${period}` : ''}>
        <div className="hc-digits num">
          <span>{hh}</span><span className="hc-colon">:</span><span>{mm}</span>
        </div>
        <div className="hc-side">
          <span className="hc-period">{period}</span>
          <span className="hc-sec num">{ss}</span>
          <span className="hc-tz">بغداد</span>
        </div>
      </div>
    </section>
  )
}
