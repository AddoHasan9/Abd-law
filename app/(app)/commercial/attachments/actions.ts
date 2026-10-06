'use server'

/**
 * مرفقات اختيارية للسجلات: صورة الهوية بعد صدورها، أو باركود/صورة التحاسب بعد إكماله.
 * تُحفظ في قاعدة البيانات (جدول record_attachments) فتدخل في النسخة الاحتياطية الليلية.
 * الملف لا يُحمَّل مع القوائم — يُجلب فقط عند فتحه.
 */
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, requirePermission } from '@/lib/auth/require-permission'

export type AttachmentEntity = 'company_id' | 'tax_assessment'

const MAX_BYTES = 5 * 1024 * 1024
const DATA_URL = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/]+=*)$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** صلاحية كل نوع: الهويات ← قسم الهويات، التحاسب ← الشركات */
async function guard(entity: AttachmentEntity, mode: 'view' | 'write') {
  if (entity === 'company_id') return requirePermission('government_ids', mode === 'view' ? 'view' : 'create')
  return requirePermission('companies', mode === 'view' ? 'view' : 'edit')
}

function validEntity(entity: string): entity is AttachmentEntity {
  return entity === 'company_id' || entity === 'tax_assessment'
}

export async function uploadAttachmentAction(entity: AttachmentEntity, entityId: string, fileName: string, dataUrl: string) {
  if (!validEntity(entity) || !UUID.test(entityId)) return { success: false as const, error: 'سجل غير صالح' }
  const denied = await guard(entity, 'write')
  if (denied) return denied

  const m = DATA_URL.exec(dataUrl || '')
  if (!m) return { success: false as const, error: 'يُقبل ملف صورة (JPG أو PNG أو WebP) أو PDF فقط' }
  const size = Math.floor((m[2].length * 3) / 4)
  if (size > MAX_BYTES) return { success: false as const, error: 'حجم الملف كبير (الحد الأقصى 5 ميغابايت)' }

  const me = await getCurrentUserProfile()
  const { error } = await createAdminClient().from('record_attachments').upsert(
    {
      entity_type: entity,
      entity_id: entityId,
      file_name: (fileName || 'مرفق').slice(0, 160),
      mime_type: m[1],
      size_bytes: size,
      data_url: dataUrl,
      uploaded_by: me?.id ?? null,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'entity_type,entity_id' },
  )
  if (error) {
    console.error('uploadAttachmentAction:', error.message)
    return { success: false as const, error: 'تعذّر حفظ المرفق. حاول مجدداً' }
  }
  revalidatePath(entity === 'company_id' ? '/commercial/ids' : '/commercial/tax-assessment')
  return { success: true as const }
}

/** الملف نفسه — يُطلب عند الفتح فقط */
export async function getAttachmentAction(entity: AttachmentEntity, entityId: string) {
  if (!validEntity(entity) || !UUID.test(entityId)) return null
  if (await guard(entity, 'view')) return null
  const { data } = await createAdminClient()
    .from('record_attachments')
    .select('file_name, mime_type, size_bytes, data_url, created_at')
    .eq('entity_type', entity)
    .eq('entity_id', entityId)
    .maybeSingle()
  return data
}

/** معلومات خفيفة (بدون الملف) لمعرفة السجلات التي لها مرفق */
export async function listAttachmentInfoAction(entity: AttachmentEntity) {
  if (!validEntity(entity)) return [] as Array<{ entity_id: string; file_name: string; mime_type: string }>
  if (await guard(entity, 'view')) return []
  const { data } = await createAdminClient()
    .from('record_attachments')
    .select('entity_id, file_name, mime_type')
    .eq('entity_type', entity)
  return data ?? []
}

export async function deleteAttachmentAction(entity: AttachmentEntity, entityId: string) {
  if (!validEntity(entity) || !UUID.test(entityId)) return { success: false as const, error: 'سجل غير صالح' }
  const denied = await guard(entity, 'write')
  if (denied) return denied
  const { error } = await createAdminClient()
    .from('record_attachments')
    .delete()
    .eq('entity_type', entity)
    .eq('entity_id', entityId)
  if (error) return { success: false as const, error: 'تعذّر حذف المرفق' }
  revalidatePath(entity === 'company_id' ? '/commercial/ids' : '/commercial/tax-assessment')
  return { success: true as const }
}
