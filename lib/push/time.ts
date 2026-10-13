/** الوقت والتاريخ الحاليان بتوقيت بغداد (الخادم يعمل بتوقيت UTC) */
export function baghdadNow(d = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const g = (t: string) => parts.find(p => p.type === t)?.value || '00'
  const hh = g('hour') === '24' ? '00' : g('hour')
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${hh}:${g('minute')}` }
}

export type ReminderRepeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'

export const REPEAT_OPTIONS: { value: ReminderRepeat; label: string; short: string }[] = [
  { value: 'none', label: 'مرة واحدة', short: '' },
  { value: 'daily', label: 'يومياً', short: 'يومياً' },
  { value: 'weekdays', label: 'أيام الدوام (الأحد–الخميس)', short: 'أيام الدوام' },
  { value: 'weekly', label: 'أسبوعياً (نفس اليوم)', short: 'أسبوعياً' },
  { value: 'monthly', label: 'شهرياً (نفس التاريخ)', short: 'شهرياً' },
  { value: 'yearly', label: 'سنوياً', short: 'سنوياً' },
]

export function repeatShort(r: string | null | undefined): string {
  return REPEAT_OPTIONS.find(o => o.value === r)?.short || ''
}

/** تذكير بتاريخ وبلا وقت يُنبَّه عنه 9:00 صباحاً (لا منتصف الليل) */
export const DEFAULT_ALERT_TIME = '09:00'

function alertTime(dueTime: string | null | undefined): string {
  return (dueTime && /^\d{2}:\d{2}/.test(dueTime)) ? dueTime.slice(0, 5) : DEFAULT_ALERT_TIME
}

/** هل حان موعد التذكير؟ (بتوقيت بغداد) */
export function isReminderDue(dueDate: string | null, dueTime: string | null, now = baghdadNow()): boolean {
  if (!dueDate) return false
  if (dueDate < now.date) return true
  if (dueDate > now.date) return false
  return alertTime(dueTime) <= now.time
}

// ── حساب الموعد التالي (تواريخ بصيغة YYYY-MM-DD بلا مناطق زمنية) ──
function parse(d: string) { const [y, m, day] = d.split('-').map(Number); return { y, m, day } }
function fmt(y: number, m: number, d: number) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
function daysInMonth(y: number, m: number) { return new Date(Date.UTC(y, m, 0)).getUTCDate() }
function addDays(d: string, n: number) {
  const { y, m, day } = parse(d)
  const t = new Date(Date.UTC(y, m - 1, day + n))
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}
function weekday(d: string) { const { y, m, day } = parse(d); return new Date(Date.UTC(y, m - 1, day)).getUTCDay() } // 0 = الأحد
function addMonths(d: string, n: number, anchorDay: number) {
  const { y, m } = parse(d)
  const total = (y * 12 + (m - 1)) + n
  const ny = Math.floor(total / 12), nm = (total % 12) + 1
  return fmt(ny, nm, Math.min(anchorDay, daysInMonth(ny, nm)))
}

function step(d: string, rule: ReminderRepeat, anchorDay: number): string {
  switch (rule) {
    case 'daily': return addDays(d, 1)
    case 'weekdays': { let n = addDays(d, 1); while ([5, 6].includes(weekday(n))) n = addDays(n, 1); return n } // الجمعة والسبت عطلة
    case 'weekly': return addDays(d, 7)
    case 'monthly': return addMonths(d, 1, anchorDay)
    case 'yearly': return addMonths(d, 12, anchorDay)
    default: return d
  }
}

/**
 * أول موعد قادم (بعد الآن بتوقيت بغداد) لتذكير متكرر.
 * الشهري/السنوي: نفس يوم الشهر؛ في شهر أقصر يُستخدم آخر يوم فيه (مثلاً 31 ⇒ 30)، ويستمر من هذا اليوم.
 */
export function nextOccurrence(dueDate: string, dueTime: string | null, rule: ReminderRepeat, now = baghdadNow()): string | null {
  if (rule === 'none') return null
  const anchorDay = parse(dueDate).day
  const t = alertTime(dueTime)
  let d = step(dueDate, rule, anchorDay)
  // نتخطى المواعيد الفائتة (مثلاً إن توقف الخادم أياماً) — حد أمان للحلقة
  for (let i = 0; i < 4000 && (d < now.date || (d === now.date && t <= now.time)); i++) d = step(d, rule, anchorDay)
  return d
}
