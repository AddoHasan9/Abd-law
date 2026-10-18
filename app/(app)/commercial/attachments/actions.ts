'use server'

/**
 * مرفقات اختيارية للسجلات: صورة الهوية بعد صدورها، أو باركود/صورة التحاسب بعد إكماله.
 * تُحفظ في قاعدة البيانات (جدول record_attachments) فتدخل في النسخة الاحتياطية الليلية.
 * الملف لا يُحمَّل مع القوائم — يُجلب فقط عند فتحه.
 */
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, requirePermission } from '@/lib/auth/require-permission'

export type AttachmentEntity = 'company_id' | 'tax_assessment' | 'company_certificate' | 'deposit_letter' | 'company_contract'

const ENTITIES: readonly AttachmentEntity[] = ['company_id', 'tax_assessment', 'company_certificate', 'deposit_letter', 'company_contract']

/** الصفحات التي تعرض كل نوع (لتحديثها بعد الرفع أو الحذف) */
function pathsFor(entity: AttachmentEntity): string[] {
  if (entity === 'company_id') return ['/commercial/ids']
  if (entity === 'tax_assessment') return ['/commercial/tax-assessment']
  return ['/commercial/companies', '/commercial/deposits', '/commercial/companies-registry']
}

/**
 * الحد 4 م.ب للملف نفسه: طلبات Vercel لا تتجاوز 4.5 م.ب.
 * الملف يصل كـ Blob (وليس نصاً طويلاً) لأن حماية React الجديدة ترفض النصوص التي تتجاوز مليون حرف.
 */
const MAX_BYTES = 4 * 1024 * 1024
type Mime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** صلاحية كل نوع: الهويات ← قسم الهويات، التحاسب ومرفقات الشركة (الشهادة، الوديعة، العقد) ← الشركات */
async function guard(entity: AttachmentEntity, mode: 'view' | 'write') {
  if (entity === 'company_id') return requirePermission('government_ids', mode === 'view' ? 'view' : 'create')
  return requirePermission('companies', mode === 'view' ? 'view' : 'edit')
}

function validEntity(entity: string): entity is AttachmentEntity {
  return (ENTITIES as readonly string[]).includes(entity)
}

/** يتحقق من بداية الملف الفعلية (لا نثق بالنوع الذي يرسله المتصفح وحده) */
function sniffMime(b: Buffer): Mime | null {
  if (b.length >= 4 && b.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf'
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp'
  return null
}

export async function uploadAttachmentAction(entity: AttachmentEntity, entityId: string, fileName: string, file: Blob) {
  if (!validEntity(entity) || !UUID.test(entityId)) return { success: false as const, error: 'سجل غير صالح' }
  const denied = await guard(entity, 'write')
  if (denied) return denied

  if (!(file instanceof Blob) || file.size === 0) return { success: false as const, error: 'لم يصل الملف. حاول مجدداً' }
  if (file.size > MAX_BYTES) return { success: false as const, error: 'حجم الملف كبير (الحد الأقصى 4 ميغابايت)' }
  const buf = Buffer.from(await file.arrayBuffer())
  const mime = sniffMime(buf)
  if (!mime) return { success: false as const, error: 'يُقبل ملف صورة (JPG أو PNG أو WebP) أو PDF فقط' }
  const size = buf.length
  const dataUrl = `data:${mime};base64,${buf.toString('base64')}`

  const me = await getCurrentUserProfile()
  const { error } = await createAdminClient().from('record_attachments').upsert(
    {
      entity_type: entity,
      entity_id: entityId,
      file_name: (fileName || 'مرفق').slice(0, 160),
      mime_type: mime,
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
  pathsFor(entity).forEach(p => revalidatePath(p))
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
  pathsFor(entity).forEach(p => revalidatePath(p))
  return { success: true as const }
}
