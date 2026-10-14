import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/server'
import { VAPID_PUBLIC_KEY, type PushPayload } from './config'

let configured = false
let cronSecret: string | null = null

/** يقرأ المفتاح الخاص وسر الجدولة من app_secrets (لا يقرؤه إلا مفتاح الخادم) */
async function ensureConfigured() {
  if (configured) return
  const admin = createAdminClient()
  const { data, error } = await admin.from('app_secrets').select('key, value').in('key', ['vapid_private_key', 'push_cron_secret'])
  if (error) throw new Error('push secrets unavailable')
  const map = new Map((data || []).map(r => [r.key as string, r.value as string]))
  const priv = process.env.VAPID_PRIVATE_KEY || map.get('vapid_private_key')
  if (!priv) throw new Error('VAPID private key missing')
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@lawyer-office-lexl.vercel.app', VAPID_PUBLIC_KEY, priv)
  cronSecret = process.env.PUSH_CRON_SECRET || map.get('push_cron_secret') || null
  configured = true
}

export async function getCronSecret(): Promise<string | null> {
  await ensureConfigured()
  return cronSecret
}

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

/**
 * يرسل تنبيهاً لأجهزة المستخدمين المحددين (أو كل المشتركين إذا userIds = 'all').
 * الاشتراكات المنتهية (404/410) تُحذف تلقائياً.
 */
export async function sendPush(userIds: string[] | 'all', payload: PushPayload): Promise<{ sent: number; removed: number }> {
  await ensureConfigured()
  const admin = createAdminClient()
  let q = admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth')
  if (userIds !== 'all') {
    if (!userIds.length) return { sent: 0, removed: 0 }
    q = q.in('user_id', userIds)
  }
  const { data: subs } = await q
  let sent = 0
  const dead: string[] = []
  const okIds: string[] = []
  const body = JSON.stringify({ title: payload.title, body: payload.body || '', url: payload.url || '/dashboard', tag: payload.tag, rid: payload.rid })
  await Promise.all(((subs || []) as Sub[]).map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 12, urgency: 'high' })
      sent++
      okIds.push(s.id)
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) dead.push(s.id)
      else console.error('push send failed:', code, (e as Error).message)
    }
  }))
  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead)
  if (okIds.length) await admin.from('push_subscriptions').update({ last_ok_at: new Date().toISOString() }).in('id', okIds)
  return { sent, removed: dead.length }
}
