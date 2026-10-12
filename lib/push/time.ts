/** الوقت والتاريخ الحاليان بتوقيت بغداد (الخادم يعمل بتوقيت UTC) */
export function baghdadNow(d = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const g = (t: string) => parts.find(p => p.type === t)?.value || '00'
  const hh = g('hour') === '24' ? '00' : g('hour')
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${hh}:${g('minute')}` }
}

/** هل حان موعد التذكير؟ (تاريخ سابق، أو اليوم وقد حان الوقت أو بلا وقت) */
export function isReminderDue(dueDate: string | null, dueTime: string | null, now = baghdadNow()): boolean {
  if (!dueDate) return false
  if (dueDate < now.date) return true
  if (dueDate > now.date) return false
  return !dueTime || dueTime.slice(0, 5) <= now.time
}
