'use server'
/**
 * عمليات قسم المهام. التذكير يمرّ عبر جدول reminders (task_id) ليستفيد من:
 * الإرسال بالدقيقة، الإشعار بصوت، أزرار «تم/إيقاف»، والمحامي المسؤول.
 */
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/require-permission'
import { cleanChecklist, hhmm, reminderDueFor, type ChecklistItem, type Task, type TaskInput, type TaskStatus } from '@/lib/tasks/model'

type Result<T = undefined> = { success: true; data?: T } | { success: false; error: string }

const isAdmin = (role?: string | null) => ['super_admin', 'admin'].includes(String(role || ''))

function refresh() {
  revalidatePath('/tasks')
  revalidatePath('/reminders')
  revalidatePath('/dashboard')
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/

/** يمزامن تذكير المهمة: يُنشأ/يُحدَّث عند وجود موعد وتذكير والمهمة غير منجزة، ويُحذف غير ذلك */
async function syncReminder(admin: ReturnType<typeof createAdminClient>, task: Task, resetAlert: boolean) {
  const due = task.status === 'done' ? null : reminderDueFor(task.task_date, task.task_time, task.remind_before)
  const { data: existing } = await admin.from('reminders').select('id').eq('task_id', task.id).maybeSingle()
  if (!due) {
    if (existing) await admin.from('reminders').delete().eq('id', existing.id)
    return
  }
  const lines = [
    task.agency ? `🏛 ${task.agency}` : '',
    `⏰ موعد المهمة ${hhmm(task.task_time) || '09:00'}`,
    task.company_display ? `🏢 ${task.company_display}` : '',
  ].filter(Boolean)
  const row = {
    title: task.priority === 'urgent' ? `🔴 ${task.title}` : task.title,
    notes: lines.join('\n'),
    due_date: due.date,
    due_time: due.time,
    priority: task.priority === 'urgent' ? 'high' : 'medium',
    owner_id: task.owner_id,
    assignee_id: task.assignee_id || task.owner_id,
    company_id: task.company_id,
    repeat: 'none',
    is_completed: false,
    is_archived: false,
    task_id: task.id,
  }
  if (existing) {
    await admin.from('reminders').update(resetAlert ? { ...row, alert_sent: false } : row).eq('id', existing.id)
  } else {
    await admin.from('reminders').insert({ ...row, alert_sent: false })
  }
}

async function decorate(admin: ReturnType<typeof createAdminClient>, rows: Task[]): Promise<Task[]> {
  const pids = [...new Set(rows.map(r => r.assignee_id).filter(Boolean))] as string[]
  const cids = [...new Set(rows.map(r => r.company_id).filter(Boolean))] as string[]
  const [p, c] = await Promise.all([
    pids.length ? admin.from('profiles').select('id, name').in('id', pids) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    cids.length ? admin.from('companies').select('id, name').in('id', cids) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])
  const pm = new Map((p.data || []).map(x => [x.id, x.name]))
  const cm = new Map((c.data || []).map(x => [x.id, x.name]))
  return rows.map(r => ({
    ...r,
    checklist: cleanChecklist(r.checklist),
    assignee_name: r.assignee_id ? pm.get(r.assignee_id) || null : null,
    company_display: r.company_id ? cm.get(r.company_id) || r.company_name || null : r.company_name || null,
  }))
}

export async function listTasksAction(): Promise<Result<Task[]>> {
  if (!await getCurrentUserProfile()) return { success: false, error: 'يجب تسجيل الدخول' }
  const admin = createAdminClient()
  const { data, error } = await admin.from('tasks').select('*')
    .order('task_date', { ascending: true, nullsFirst: false })
    .order('task_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return { success: false, error: 'تعذر تحميل المهام' }
  return { success: true, data: await decorate(admin, (data || []) as Task[]) }
}

/** بيانات النموذج: الشركات، المحامون، والدوائر المستخدمة سابقاً */
export async function taskFormOptionsAction(): Promise<Result<{ companies: { id: string; name: string }[]; people: { id: string; name: string }[]; agencies: string[]; me: string }>> {
  const profile = await getCurrentUserProfile()
  if (!profile) return { success: false, error: 'يجب تسجيل الدخول' }
  const admin = createAdminClient()
  const [c, p, a] = await Promise.all([
    admin.from('companies').select('id, name').order('name'),
    admin.from('profiles').select('id, name').eq('active', true).order('name'),
    admin.from('tasks').select('agency').not('agency', 'is', null).order('created_at', { ascending: false }).limit(300),
  ])
  const agencies = [...new Set(((a.data || []) as { agency: string }[]).map(x => x.agency.trim()).filter(Boolean))].slice(0, 40)
  return { success: true, data: { companies: (c.data || []) as { id: string; name: string }[], people: (p.data || []) as { id: string; name: string }[], agencies, me: profile.id } }
}

export async function saveTaskAction(input: TaskInput, id?: string): Promise<Result<Task>> {
  const profile = await getCurrentUserProfile()
  if (!profile) return { success: false, error: 'يجب تسجيل الدخول' }
  const title = String(input.title || '').trim()
  if (!title) return { success: false, error: 'اكتب ما العمل المطلوب' }
  if (title.length > 300) return { success: false, error: 'العنوان طويل جداً' }
  const task_date = input.task_date && DATE_RE.test(input.task_date) ? input.task_date : null
  const task_time = task_date && input.task_time && TIME_RE.test(input.task_time) ? input.task_time.slice(0, 5) : null
  const remind = input.remind_before == null || !task_date ? null : Math.max(0, Math.min(10080, Math.round(Number(input.remind_before))))
  const admin = createAdminClient()

  // المحامي المسؤول: فعّال فقط، وإلا المنشئ
  let assignee = profile.id
  if (input.assignee_id) {
    const { data } = await admin.from('profiles').select('id').eq('id', input.assignee_id).eq('active', true).maybeSingle()
    if (data) assignee = data.id
  }
  // الشركة: من النظام (موجودة) أو اسم مكتوب، أو لا شيء
  let company_id: string | null = null
  if (input.company_id) {
    const { data } = await admin.from('companies').select('id').eq('id', input.company_id).maybeSingle()
    company_id = data?.id || null
  }
  const company_name = company_id ? null : (String(input.company_name || '').trim().slice(0, 200) || null)

  const row = {
    title,
    agency: String(input.agency || '').trim().slice(0, 200) || null,
    notes: String(input.notes || '').trim().slice(0, 2000) || null,
    task_date, task_time,
    priority: input.priority === 'urgent' ? 'urgent' : 'normal',
    company_id, company_name,
    assignee_id: assignee,
    checklist: cleanChecklist(input.checklist),
    remind_before: remind,
    updated_at: new Date().toISOString(),
  }

  let saved: Task | null = null
  let timingChanged = true
  if (id) {
    const { data: prev } = await admin.from('tasks').select('owner_id, task_date, task_time, remind_before').eq('id', id).maybeSingle()
    if (!prev) return { success: false, error: 'المهمة غير موجودة' }
    timingChanged = prev.task_date !== task_date || hhmm(prev.task_time) !== task_time || prev.remind_before !== remind
    const { data, error } = await admin.from('tasks').update(row).eq('id', id).select('*').single()
    if (error) return { success: false, error: 'تعذر حفظ المهمة' }
    saved = data as Task
  } else {
    const { data, error } = await admin.from('tasks').insert({ ...row, owner_id: profile.id, status: 'todo' }).select('*').single()
    if (error) return { success: false, error: 'تعذر إنشاء المهمة' }
    saved = data as Task
  }
  const [decorated] = await decorate(admin, [saved])
  await syncReminder(admin, decorated, timingChanged)
  refresh()
  return { success: true, data: decorated }
}

export async function setTaskStatusAction(id: string, status: TaskStatus, resultNotes?: string): Promise<Result<Task>> {
  const profile = await getCurrentUserProfile()
  if (!profile) return { success: false, error: 'يجب تسجيل الدخول' }
  if (!['todo', 'in_progress', 'done'].includes(status)) return { success: false, error: 'حالة غير صالحة' }
  const admin = createAdminClient()
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString(), done_at: status === 'done' ? new Date().toISOString() : null }
  if (resultNotes !== undefined) patch.result_notes = String(resultNotes).trim().slice(0, 2000) || null
  const { data, error } = await admin.from('tasks').update(patch).eq('id', id).select('*').single()
  if (error || !data) return { success: false, error: 'تعذر تحديث الحالة' }
  const [decorated] = await decorate(admin, [data as Task])
  await syncReminder(admin, decorated, status !== 'done')
  refresh()
  return { success: true, data: decorated }
}

export async function updateChecklistAction(id: string, checklist: ChecklistItem[]): Promise<Result> {
  if (!await getCurrentUserProfile()) return { success: false, error: 'يجب تسجيل الدخول' }
  const admin = createAdminClient()
  const { error } = await admin.from('tasks').update({ checklist: cleanChecklist(checklist), updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { success: false, error: 'تعذر حفظ الأوراق' }
  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTaskAction(id: string): Promise<Result> {
  const profile = await getCurrentUserProfile()
  if (!profile) return { success: false, error: 'يجب تسجيل الدخول' }
  const admin = createAdminClient()
  const { data: t } = await admin.from('tasks').select('owner_id, assignee_id').eq('id', id).maybeSingle()
  if (!t) return { success: false, error: 'المهمة غير موجودة' }
  if (!isAdmin(profile.role) && profile.id !== t.owner_id && profile.id !== t.assignee_id) return { success: false, error: 'يحذفها صاحبها أو المسؤول عنها أو المدير' }
  const { error } = await admin.from('tasks').delete().eq('id', id) // التذكير يُحذف تلقائياً (cascade)
  if (error) return { success: false, error: 'تعذر الحذف' }
  refresh()
  return { success: true }
}
