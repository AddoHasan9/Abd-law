'use server'

import { revalidatePath } from 'next/cache'
import { rethrowDbError } from '@/lib/data/db-guard'
import { createAdminClient } from '@/lib/supabase/server'
import type { ReminderItem, ReminderPriority } from '@/types/database'
import { createNotificationAction } from '@/app/(app)/notifications/actions'
import { getCurrentUserProfile } from '@/lib/auth/require-permission'


export async function getRemindersAction(filter?: 'active' | 'completed' | 'archived' | 'all' | 'pending') {
  if (!await getCurrentUserProfile()) return { success: false, data: [], error: 'الحساب غير مخول' }
  try {
    const supabase = createAdminClient()
    let query = supabase.from('reminders').select('*').order('created_at', { ascending: false })

    if (filter === 'completed') {
      query = query.eq('is_completed', true).eq('is_archived', false)
    } else if (filter === 'archived') {
      query = query.eq('is_archived', true)
    } else if (filter === 'active' || filter === 'pending' || !filter) {
      query = query.eq('is_completed', false).eq('is_archived', false)
    }

    const [{ data, error }, compRes] = await Promise.all([
      query,
      supabase.from('companies').select('id, name'),
    ])

    const companies = compRes?.data || []

    const compMap = new Map<string, string>()
    if (companies) {
      companies.forEach((c: { id: string; name: string }) => {
        if (c.id && c.name) compMap.set(c.id, c.name)
      })
    }

    let items: ReminderItem[] = []

    if (error || !data) {
      console.error('getRemindersAction DB error:', error?.message)
      return { success: false, data: [] as ReminderItem[] }
    }
    items = data as ReminderItem[]

    // Populate company_name for each item from compMap
    items = items.map(item => ({
      ...item,
      company_name: item.company_id ? (compMap.get(item.company_id) || item.company_name || null) : null,
    }))

    // Automatic trigger check for due reminders
    await checkAndTriggerDueRemindersAction(items)

    return { success: true, data: items }
  } catch (err) {
    rethrowDbError(err)
    console.error('getRemindersAction error:', err)
    return { success: false, data: [] as ReminderItem[] }
  }
}

export async function createReminderAction(payload: {
  title: string
  notes?: string
  company_id?: string
  priority?: ReminderPriority
  due_date?: string
  due_time?: string
}) {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    return { success: false, error: 'يجب تسجيل الدخول لإنشاء تذكير' }
  }

  try {
    const supabase = createAdminClient()

    if (!payload.title?.trim()) {
      return { success: false, error: 'عنوان التذكير مطلوب' }
    }

    const newReminder: ReminderItem = {
      id: 'rem_' + Math.random().toString(36).substring(2, 9),
      title: payload.title.trim(),
      notes: payload.notes?.trim() || null,
      company_id: payload.company_id || null,
      priority: payload.priority || 'medium',
      due_date: payload.due_date || null,
      due_time: payload.due_time || null,
      is_completed: false,
      is_archived: false,
      alert_sent: false,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        title: newReminder.title,
        notes: newReminder.notes,
        company_id: newReminder.company_id,
        priority: newReminder.priority,
        due_date: newReminder.due_date,
        due_time: newReminder.due_time,
        is_completed: false,
        is_archived: false,
        alert_sent: false,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('createReminderAction DB error:', error?.message)
      return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/reminders')
    revalidatePath('/commercial')

    return { success: true, data: data || newReminder }
  } catch (err: unknown) {
    rethrowDbError(err)
    console.error('createReminderAction error, fallback saving:', err)
    return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }
  }
}

export async function updateReminderAction(
  id: string,
  payload: {
    title?: string
    notes?: string
    company_id?: string
    priority?: ReminderPriority
    due_date?: string
    due_time?: string
  }
) {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    return { success: false, error: 'يجب تسجيل الدخول لتعديل التذكير' }
  }

  try {
    const supabase = createAdminClient()
    const updateData: Record<string, unknown> = {}

    if (payload.title !== undefined) updateData.title = payload.title.trim()
    if (payload.notes !== undefined) updateData.notes = payload.notes.trim() || null
    if (payload.company_id !== undefined) updateData.company_id = payload.company_id || null
    if (payload.priority !== undefined) updateData.priority = payload.priority
    if (payload.due_date !== undefined) updateData.due_date = payload.due_date || null
    if (payload.due_time !== undefined) updateData.due_time = payload.due_time || null

    const { error } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', id)

    if (error) return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }

    revalidatePath('/dashboard')
    revalidatePath('/reminders')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل تعديل التذكير'
    return { success: false, error: message }
  }
}

export async function toggleReminderCompleteAction(id: string, is_completed: boolean) {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    return { success: false, error: 'يجب تسجيل الدخول لتحديث حالة التذكير' }
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('reminders')
      .update({ is_completed })
      .eq('id', id)

    if (error) return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }

    revalidatePath('/dashboard')
    revalidatePath('/reminders')
    return { success: true }
  } catch (dbErr) {
    rethrowDbError(dbErr)
    return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }
  }
}

export async function toggleReminderArchiveAction(id: string, is_archived: boolean) {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    return { success: false, error: 'يجب تسجيل الدخول لأرشفة التذكير' }
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('reminders')
      .update({ is_archived })
      .eq('id', id)

    if (error) return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }

    revalidatePath('/dashboard')
    revalidatePath('/reminders')
    return { success: true }
  } catch (dbErr) {
    rethrowDbError(dbErr)
    return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }
  }
}

export async function deleteReminderAction(id: string) {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    return { success: false, error: 'يجب تسجيل الدخول لحذف التذكير' }
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: 'تعذّر الحذف من قاعدة البيانات. حاول مجدداً' }

    revalidatePath('/dashboard')
    revalidatePath('/reminders')
    return { success: true }
  } catch (dbErr) {
    rethrowDbError(dbErr)
    return { success: false, error: 'تعذّر الحذف من قاعدة البيانات. حاول مجدداً' }
    return { success: true }
  }
}

/**
  فحص آلي للتذكيرات المستحقة التي حان موعدها ولم يُرسل بها إشعار سابقاً
 */
async function checkAndTriggerDueRemindersAction(reminders: ReminderItem[]) {
  try {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const currentTimeStr = now.toTimeString().slice(0, 5) // HH:MM

    const dueReminders = reminders.filter(r => {
      if (r.is_completed || r.is_archived || r.alert_sent || !r.due_date) return false
      if (r.due_date < todayStr) return true
      if (r.due_date === todayStr) {
        if (!r.due_time) return true
        return r.due_time <= currentTimeStr
      }
      return false
    })

    if (dueReminders.length === 0) return

    const supabase = createAdminClient()

    for (const item of dueReminders) {
      await createNotificationAction({
        title: `تنبيه تذكير شخصي: ${item.title}`,
        description: item.notes || (item.due_date ? `موعد الاستحقاق: ${item.due_date}` : 'تذكير غير محدد'),
        type: 'reminder_alert',
        related_company_id: item.company_id || undefined,
        link_url: '/dashboard',
      })

      const { error } = await supabase.from('reminders').update({ alert_sent: true }).eq('id', item.id)
      if (error) console.error('reminder alert_sent update failed:', error.message)
    }
  } catch (err) {
    rethrowDbError(err)
    console.error('checkAndTriggerDueRemindersAction error:', err)
  }
}
