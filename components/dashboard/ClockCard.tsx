'use client'
/**
 * بطاقة الساعة والتاريخ — بتوقيت بغداد.
 * أرقام رقمية تتدحرج عند التغيّر، خط ذهبي يمتلئ مع الدقيقة، والتاريخ الميلادي (بأسماء الأشهر العراقية) والهجري.
 * تُرسم بعد التحميل فقط (لا عدم تطابق بين الخادم والمتصفح)، وتحترم «تقليل الحركة».
 */
import { useEffect, useState } from 'react'

const TZ = 'Asia/Baghdad'
const fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const fmtWeekday = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: TZ, weekday: 'long' })
const fmtGreg = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
const fmtHijri = new Intl.DateTimeFormat('ar-IQ-u-ca-islamic-umalqura-nu-latn', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })

function Digit({ d }: { d: number }) {
  return (
    <span className="ck-digit" aria-hidden>
      <span className="ck-strip" style={{ transform: `translateY(${-d * 10}%)` }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <span key={n}>{n}</span>)}
      </span>
    </span>
  )
}

export default function ClockCard() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    // نضبط الإيقاع على بداية كل ثانية حتى لا تتأخر الأرقام
    let t: ReturnType<typeof setTimeout>
    const tick = () => { setNow(new Date()); t = setTimeout(tick, 1000 - (Date.now() % 1000)) }
    t = setTimeout(tick, 1000 - (Date.now() % 1000))
    return () => clearTimeout(t)
  }, [])

  const p = now ? Object.fromEntries(fmtParts.formatToParts(now).map(x => [x.type, x.value])) : null
  const h24 = p ? Number(p.hour) % 24 : 0
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const hh = String(h12).padStart(2, '0')
  const mm = p ? p.minute : '00'
  const ss = p ? p.second : '00'
  const period = h24 < 12 ? 'ص' : 'م'
  const spoken = now ? `${h12}:${mm} ${h24 < 12 ? 'صباحاً' : 'مساءً'}` : ''

  return (
    <section className="ck-card bx-card" aria-label="الوقت والتاريخ بتوقيت بغداد">
      <div className="ck-glow" aria-hidden />
      <div className="ck-time" role="timer" aria-live="off" aria-label={spoken}>
        {now ? (
          <>
            <span className="ck-hm">
              <Digit d={+hh[0]} /><Digit d={+hh[1]} />
              <span className="ck-colon" aria-hidden>:</span>
              <Digit d={+mm[0]} /><Digit d={+mm[1]} />
            </span>
            <span className="ck-side">
              <span className="ck-period">{period}</span>
              <span className="ck-sec"><Digit d={+ss[0]} /><Digit d={+ss[1]} /></span>
            </span>
          </>
        ) : (
          <span className="ck-hm ck-skel" aria-hidden>--:--</span>
        )}
      </div>
      <div className="ck-bar" aria-hidden><span className={ss === '00' ? 'is-reset' : undefined} style={{ width: `${now ? ((+ss + 1) / 60) * 100 : 0}%` }} /></div>
      <div className="ck-date">
        <span className="ck-weekday">{now ? fmtWeekday.format(now) : '\u00A0'}</span>
        <span className="ck-greg">{now ? fmtGreg.format(now) : '\u00A0'}</span>
        <span className="ck-hijri">{now ? `${fmtHijri.format(now).replace(/\s*هـ$/, '')} هـ` : '\u00A0'}</span>
        <span className="ck-place">بغداد</span>
      </div>
    </section>
  )
}
