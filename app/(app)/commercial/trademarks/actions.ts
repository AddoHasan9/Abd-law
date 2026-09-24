'use server'

import { requireRecordAccess } from '@/lib/auth/record-access'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { logTimelineEvent } from '@/lib/data/timeline'
import type { Trademark } from '@/types/database'
import { requirePermission } from '@/lib/auth/require-permission'

// ملاحظة: لا توجد فئة "trademarks" مستقلة بمصفوفة الصلاحيات (lib/permissions.ts) —
// العلامة التجارية تُعامل كجزء من بيانات الشركة، فتُقاس بصلاحية companies.edit.
// يُفضّل إضافة فئة trademarks مخصصة مستقبلًا للدقة الكاملة.
export async function createTrademarkAction(payload: {
  company_id: string
  name: string
  registration_no?: string
  status?: 'pending' | 'registered' | 'rejected' | 'expired'
  registered_date?: string
  expiry_date?: string
  notes?: string
}) {
  if (payload.company_id) {
    const access = await requireRecordAccess('companies', payload.company_id)
    if (access) return access
  }

  const denied = await requirePermission('companies', 'edit')
  if (denied) return denied

  try {
    if (!payload.company_id || !payload.name?.trim()) {
      return { success: false, error: 'اسم العلامة التجارية والشركة مطلوبان' }
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('trademarks')
      .insert({
        company_id: payload.company_id,
        name: payload.name.trim(),
        registration_no: payload.registration_no?.trim() || null,
        status: payload.status || 'pending',
        registered_date: payload.registered_date || null,
        expiry_date: payload.expiry_date || null,
        notes: payload.notes?.trim() || null,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('createTrademarkAction error:', error?.message)
      return { success: false, error: error?.message || 'فشل تسجيل العلامة التجارية' }
    }

    await logTimelineEvent({
      company_id: payload.company_id,
      event_type: 'trademark_registered',
      title: `تسجيل علامة تجارية جديدة: ${payload.name.trim()}`,
      related_link: `/commercial/companies/${payload.company_id}`,
    })

    revalidatePath(`/commercial/companies/${payload.company_id}`)
    revalidatePath('/commercial/companies')
    return { success: true, data: data as Trademark }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل تسجيل العلامة التجارية'
    return { success: false, error: message }
  }
}

export async function deleteTrademarkAction(id: string, companyId: string) {
  const denied = await requirePermission('companies', 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('trademarks').delete().eq('id', id)

    if (error) {
      console.error('deleteTrademarkAction error:', error.message)
      return { success: false, error: error.message }
    }

    revalidatePath(`/commercial/companies/${companyId}`)
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل حذف العلامة التجارية'
    return { success: false, error: message }
  }
}
