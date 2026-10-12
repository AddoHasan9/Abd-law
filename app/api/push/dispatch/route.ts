import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCronSecret, sendPush } from '@/lib/push/server'
import { baghdadNow, isReminderDue } from '@/lib/push/time'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * يُستدعى كل 5 دقائق من جدولة Supabase (pg_cron).
 * 1) التذكيرات التي حان موعدها (بتوقيت بغداد) ⇒ إشعار داخل النظام + تنبيه لهاتف صاحب التذكير.
 * 2) إشعارات النظام الجديدة التي لم تُرسل بعد ⇒ تنبيه للهاتف.
 */
export async function POST(req: Request) {
  const secret = await getCronSecret().catch(() => null)
  if (!secret || req.headers.get('x-push-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  const now = baghdadNow()
  const twoDaysAgo = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10)
  let reminders = 0, silenced = 0, notifications = 0, devices = 0

  // 1) التذكيرات
  const { data: due } = await admin
    .from('reminders')
    .select('id, title, notes, due_date, due_time, owner_id, company_id')
    .eq('alert_sent', false).eq('is_completed', false).eq('is_archived', false)
    .lte('due_date', now.date)
    .limit(100)
  for (const r of due || []) {
    if (!isReminderDue(r.due_date, r.due_time, now)) continue
    // تذكير قديم جداً (لم يُنبَّه عنه سابقاً): يُعلَّم بصمت حتى لا يصل سيل تنبيهات عند التفعيل
    if (r.due_date < twoDaysAgo) {
      await admin.from('reminders').update({ alert_sent: true }).eq('id', r.id)
      silenced++
      continue
    }
    const title = `تذكير: ${r.title}`
    const body = r.notes || (r.due_time ? `الموعد ${r.due_time.slice(0, 5)}` : 'حان موعد التذكير')
    await admin.from('notifications').insert({
      user_id: r.owner_id, title, description: body, type: 'reminder_alert',
      related_company_id: r.company_id, link_url: '/reminders', is_read: false, pushed_at: new Date().toISOString(),
    })
    const res = await sendPush(r.owner_id ? [r.owner_id] : 'all', { title, body, url: '/reminders', tag: `reminder-${r.id}` })
    devices += res.sent
    await admin.from('reminders').update({ alert_sent: true }).eq('id', r.id)
    reminders++
  }

  // 2) إشعارات النظام الجديدة (آخر ساعتين فقط، لم تُرسل بعد)
  const since = new Date(Date.now() - 2 * 3600e3).toISOString()
  const { data: pending } = await admin
    .from('notifications')
    .select('id, title, description, link_url, user_id')
    .is('pushed_at', null).gte('created_at', since)
    .order('created_at', { ascending: true }).limit(50)
  for (const n of pending || []) {
    // نعلّم أولاً حتى لا يُرسل مرتين إن تزامن استدعاءان
    const { data: claimed } = await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', n.id).is('pushed_at', null).select('id')
    if (!claimed?.length) continue
    const res = await sendPush(n.user_id ? [n.user_id] : 'all', { title: n.title, body: n.description || '', url: n.link_url || '/notifications', tag: `n-${n.id}` })
    devices += res.sent
    notifications++
  }

  return NextResponse.json({ ok: true, at: `${now.date} ${now.time}`, reminders, silenced, notifications, devices })
}
