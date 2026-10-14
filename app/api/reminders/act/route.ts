import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile } from '@/lib/auth/require-permission'
import { applyReminderAct, type ReminderAct } from '@/lib/reminders/act'

export const dynamic = 'force-dynamic'

/** يُستدعى من زرّي «تم / إيقاف» داخل إشعار الهاتف (عامل الإشعارات يرسل كوكيز الجلسة) */
export async function POST(req: Request) {
  const profile = await getCurrentUserProfile()
  if (!profile) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { id?: string; act?: ReminderAct } = {}
  try { body = await req.json() } catch { /* جسم غير صالح */ }
  const res = await applyReminderAct(profile, String(body.id || ''), body.act as ReminderAct)
  if (res.success) revalidatePath('/reminders')
  return NextResponse.json(res, { status: res.success ? 200 : 400 })
}
