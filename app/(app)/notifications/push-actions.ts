'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/require-permission'
import { sendPush } from '@/lib/push/server'

type SubJSON = { endpoint?: string; keys?: { p256dh?: string; auth?: string } }

/** حفظ اشتراك هذا الجهاز (أو تحديثه) للمستخدم الحالي */
export async function savePushSubscription(sub: SubJSON, userAgent?: string) {
  const profile = await getCurrentUserProfile()
  if (!profile) return { success: false, error: 'سجّل الدخول أولاً' }
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { success: false, error: 'اشتراك غير صالح' }
  if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) return { success: false, error: 'اشتراك غير صالح' }
  const supabase = await createClient()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: profile.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: (userAgent || '').slice(0, 300) || null,
  }, { onConflict: 'endpoint' })
  if (error) {
    console.error('savePushSubscription:', error.message)
    return { success: false, error: 'تعذر حفظ الاشتراك — حاول مرة أخرى' }
  }
  return { success: true }
}

/** إلغاء اشتراك هذا الجهاز */
export async function removePushSubscription(endpoint: string) {
  const profile = await getCurrentUserProfile()
  if (!profile || !endpoint) return { success: false }
  const supabase = await createClient()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', profile.id)
  return { success: true }
}

/** تنبيه تجريبي لأجهزة المستخدم الحالي فقط */
export async function sendTestPush() {
  const profile = await getCurrentUserProfile()
  if (!profile) return { success: false, error: 'سجّل الدخول أولاً' }
  try {
    const res = await sendPush([profile.id], {
      title: 'تنبيه تجريبي ✓',
      body: 'الإشعارات تعمل على هذا الجهاز. ستصلك التذكيرات في موعدها.',
      url: '/reminders',
      tag: 'test',
    })
    if (!res.sent) return { success: false, error: 'لا يوجد جهاز مشترك لحسابك بعد' }
    return { success: true, sent: res.sent }
  } catch (e) {
    console.error('sendTestPush:', e)
    return { success: false, error: 'تعذر إرسال التنبيه' }
  }
}
