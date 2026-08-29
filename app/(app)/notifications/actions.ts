'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { NotificationItem, NotificationType } from '@/types/database'
import { getCurrentUserProfile } from '@/lib/auth/require-permission'

export async function getNotificationsAction(): Promise<{ success: boolean; data: NotificationItem[]; unreadCount: number }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40)

    if (error) {
      console.warn('getNotificationsAction fetch warning:', error.message)
      return { success: true, data: [], unreadCount: 0 }
    }

    const notifs = (data || []) as NotificationItem[]
    const unreadCount = notifs.filter(n => !n.is_read).length

    return { success: true, data: notifs, unreadCount }
  } catch (err) {
    console.error('getNotificationsAction error:', err)
    return { success: true, data: [], unreadCount: 0 }
  }
}

export async function createNotificationAction(payload: {
  title: string
  description?: string
  type: NotificationType
  related_company_id?: string
  link_url?: string
}) {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    return { success: false, error: 'يجب تسجيل الدخول لإرسال إشعار' }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title: payload.title,
        description: payload.description || null,
        type: payload.type || 'general',
        related_company_id: payload.related_company_id || null,
        link_url: payload.link_url || (payload.related_company_id ? `/commercial/companies` : null),
        is_read: false,
      })
      .select()
      .single()

    if (error) {
      console.error('createNotificationAction insert error:', error.message)
      return { success: false, error: error.message }
    }

    revalidatePath('/commercial')
    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل إرسال الإشعار'
    console.error('createNotificationAction error:', err)
    return { success: false, error: message }
  }
}

export async function markNotificationReadAction(id: string) {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    return { success: false, error: 'يجب تسجيل الدخول لتحديث الإشعار' }
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      console.error('markNotificationReadAction error:', error.message)
      return { success: false, error: error.message }
    }

    revalidatePath('/commercial')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل تحديث الإشعار'
    return { success: false, error: message }
  }
}

export async function markAllNotificationsReadAction() {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    return { success: false, error: 'يجب تسجيل الدخول لتحديث الإشعارات' }
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)

    if (error) {
      console.error('markAllNotificationsReadAction error:', error.message)
      return { success: false, error: error.message }
    }

    revalidatePath('/commercial')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل تحديث الإشعارات'
    return { success: false, error: message }
  }
}
