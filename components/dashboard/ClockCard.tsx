'use client'
/**
 * بطاقة الساعة — النموذج 7: بطاقة بيضاء هادئة + أرقام LED نقطية كحلية (5×7) بتوقيت بغداد.
 * النقاط تتبدّل بنعومة عند تغيّر الرقم، والنقطتان بين الساعة والدقيقة تنبضان.
 * تُرسم بعد التحميل فقط (لا عدم تطابق بين الخادم والمتصفح)، وتحترم «تقليل الحركة».
 */
import { useEffect, useState } from 'react'

const TZ = 'Asia/Baghdad'
const fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const fmtWeekday = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: TZ, weekday: 'long' })
const fmtGreg = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
const fmtHijri = new Intl.DateTimeFormat('ar-IQ-u-ca-islamic-umalqura-nu-latn', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })

// أرقام نقطية 5×7 (1 = نقطة مضاءة)
const GLYPH: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
}

function Dots({ ch }: { ch: string }) {
  const g = GLYPH[ch] || GLYPH['-']
  return (
    <span className="lc-digit" aria-hidden>
      {g.join('').split('').map((b, i) => <i key={i} className={b === '1' ? 'on' : undefined} />)}
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
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const hh = now ? String(h12).padStart(2, '0') : '--'
  const mm = p ? p.minute : '--'
  const ss = p ? p.second : '--'
  const spoken = now ? `${h12}:${mm} ${h24 < 12 ? 'صباحاً' : 'مساءً'}` : ''

  return (
    <section className="lc-card bx-card" aria-label="الوقت والتاريخ بتوقيت بغداد">
      <div className="lc-row" role="timer" aria-live="off" aria-label={spoken}>
        <span className="lc-matrix lc-big">
          <Dots ch={hh[0]} /><Dots ch={hh[1]} />
          <span className="lc-colon" aria-hidden><i /><i /></span>
          <Dots ch={mm[0]} /><Dots ch={mm[1]} />
        </span>
        <span className="lc-side">
          <span className="lc-period">{now ? (h24 < 12 ? 'ص' : 'م') : ''}</span>
          <span className="lc-matrix lc-small"><Dots ch={ss[0]} /><Dots ch={ss[1]} /></span>
        </span>
      </div>
      <div className="lc-foot">
        <div className="min-w-0">
          <div className="lc-day">{now ? fmtWeekday.format(now) : '\u00A0'}</div>
          <div className="lc-date">
            {now ? <>{fmtGreg.format(now)} · {fmtHijri.format(now).replace(/\s*هـ$/, '')} هـ</> : '\u00A0'}
          </div>
        </div>
        <span className="lc-chip">بغداد</span>
      </div>
    </section>
  )
}
