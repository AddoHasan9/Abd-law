'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send'
import { buildWhatsAppMessage, type WhatsAppEventType } from '@/lib/whatsapp/templates'
import { requirePermission } from '@/lib/auth/require-permission'

/**
 * يسجّل ويُرسل (محاكاة حالياً) رسالة واتساب مرتبطة بحدث عمل معيّن،
 * ويحفظها دائماً في سجل التواصل الخاص بالشركة (جدول comms) بغض
 * النظر عن نجاح الإرسال الفعلي، فالسجل هو مصدر الحقيقة للتواصل.
 */
export async function sendCompanyWhatsAppAction(payload: {
  company_id: string
  company_name: string
  phone?: string | null
  event_type: WhatsAppEventType
  attachment_url?: string
}) {
  const denied = await requirePermission('companies', 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const message = buildWhatsAppMessage(payload.event_type, payload.company_name)

    const sendResult = await sendWhatsAppMessage(payload.phone || '', message, payload.attachment_url)

    const { error } = await supabase.from('comms').insert({
      company_id: payload.company_id,
      channel: 'whatsapp',
      summary: message,
      comm_date: new Date().toISOString().slice(0, 10),
    })

    if (error) {
      console.error('sendCompanyWhatsAppAction comms insert error:', error.message)
      return { success: false, error: error.message }
    }

    revalidatePath(`/commercial/companies/${payload.company_id}`)
    return { success: true, simulated: sendResult.simulated }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل إرسال وتسجيل رسالة واتساب'
    return { success: false, error: message }
  }
}

/** يحفظ الحدث في سجل التواصل بلا إرسال واتساب — خيار "حفظ فقط" */
export async function logCompanyEventOnlyAction(companyId: string) {
  revalidatePath(`/commercial/companies/${companyId}`)
  return { success: true }
}
