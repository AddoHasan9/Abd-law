import { createAdminClient } from '@/lib/supabase/server'

export type ReminderAct = 'stop' | 'done'

/**
 * إيقاف تكرار تذكير أو إنجازه — لصاحبه أو للمحامي المسؤول أو للمدير.
 * stop: يتوقف التنبيه والتكرار ويبقى التذكير ظاهراً · done: يُعلَّم منجزاً.
 */
export async function applyReminderAct(
  profile: { id: string; role?: string | null },
  id: string,
  act: ReminderAct
): Promise<{ success: boolean; error?: string }> {
  if (!id || !['stop', 'done'].includes(act)) return { success: false, error: 'طلب غير صالح' }
  const admin = createAdminClient()
  const { data: r } = await admin.from('reminders').select('id, owner_id, assignee_id').eq('id', id).maybeSingle()
  if (!r) return { success: false, error: 'التذكير غير موجود' }
  const isAdmin = ['super_admin', 'admin'].includes(String(profile.role || ''))
  if (!isAdmin && profile.id !== r.owner_id && profile.id !== r.assignee_id) return { success: false, error: 'ليس لديك صلاحية على هذا التذكير' }
  const update = act === 'done'
    ? { is_completed: true, alert_sent: true }
    : { repeat: 'none', alert_sent: true }
  const { error } = await admin.from('reminders').update(update).eq('id', id)
  if (error) return { success: false, error: 'تعذر الحفظ' }
  return { success: true }
}
