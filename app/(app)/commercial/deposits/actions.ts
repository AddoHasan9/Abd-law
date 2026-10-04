/**
 * إجراءات خادم الودائع والمحطات الإلزامية — مع الحفظ الدائم الفوري
 */
'use server'

import { requireRecordAccess } from '@/lib/auth/record-access'
import { dbWrite, rethrowDbError } from '@/lib/data/db-guard'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { logTimelineEvent } from '@/lib/data/timeline'
import { createNotificationAction } from '@/app/(app)/notifications/actions'
import { requirePermission } from '@/lib/auth/require-permission'


export async function confirmDepositSubmissionAction(depositId: string) {
  const rowDenied = await requireRecordAccess('deposits', depositId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('deposits', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    try {
      await dbWrite(supabase
        .from('deposit_stages')
        .update({
          state: 'done',
          at_date: today,
        })
        .eq('deposit_id', depositId)
        .eq('stage_key', 'submit'), 'deposit_stages')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    revalidatePath('/commercial/deposits')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial/companies-registry')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    rethrowDbError(err)
    console.error('confirmDepositSubmissionAction exception:', err)
    return { success: true }
  }
}

export async function updateDepositStageStateAction(
  stageId: string,
  newState: 'done' | 'idle' | 'progress',
  atDate?: string | null,
  depositId?: string,
  companyId?: string
) {
  if (companyId) {
    const access = await requireRecordAccess('companies', companyId)
    if (access) return access
  }

  if (depositId) {
    const access = await requireRecordAccess('deposits', depositId)
    if (access) return access
  }

  const rowDenied = await requireRecordAccess('deposit_stages', stageId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('deposits', 'release')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const targetAtDate = newState === 'done' ? (atDate || new Date().toISOString().slice(0, 10)) : null

    // 1. Update in Supabase
    try {
      if (stageId && !stageId.startsWith('mem_') && !stageId.startsWith('stage_')) {
        const { error: stErr } = await supabase
          .from('deposit_stages')
          .update({
            state: newState,
            at_date: targetAtDate,
          })
          .eq('id', stageId)
        if (stErr) throw stErr
      } else {
        return { success: false, error: 'مرحلة الوديعة غير محفوظة في قاعدة البيانات. أعد إطلاق مسار الوديعة من ملف الشركة' }
      }
    } catch (dbErr) {
      console.error('updateDepositStageStateAction DB error:', dbErr)
      return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }
    }

    // 2. هل اكتملت المحطات الأربع كلها؟ (من قاعدة البيانات) ← إطلاق الوديعة وترقية الشركة
    //    (كانت تُفحص على نسخة وهمية كل محطاتها «انتظار» فلا يتحقق الإطلاق من هنا أبداً)
    if (newState === 'done') {
      const { data: stageRow } = await supabase.from('deposit_stages').select('deposit_id').eq('id', stageId).single()
      const depId = depositId || stageRow?.deposit_id
      const { data: dep } = depId
        ? await supabase.from('deposits').select('id, company_id, status, deposit_stages(state)').eq('id', depId).single()
        : { data: null }
      const stages = ((dep?.deposit_stages ?? []) as Array<{ state: string }>)
      const finalCompanyId = companyId || dep?.company_id
      const allStagesDone = stages.length >= 4 && stages.every(s => s.state === 'done')

      if (dep && finalCompanyId && dep.status !== 'released' && allStagesDone) {
        const releasedAt = targetAtDate || new Date().toISOString().slice(0, 10)
        try {
          await dbWrite(supabase
            .from('companies')
            .update({ status: 'established', deposit_released: true, deposit_released_at: releasedAt })
            .eq('id', finalCompanyId), 'companies')
          await dbWrite(supabase.from('deposits').update({ status: 'released' }).eq('id', dep.id), 'deposits')
        } catch (dbUpErr) {
          rethrowDbError(dbUpErr)
          console.warn('DB company established update notice:', dbUpErr)
        }

        try {
          await logTimelineEvent({
            company_id: finalCompanyId,
            event_type: 'deposit_released',
            title: 'تم إطلاق الوديعة بنجاح وانتقال الشركة إلى قسم الشركات',
            related_link: '/commercial/companies-registry',
          })
        } catch (dbErr) {
          rethrowDbError(dbErr)
        }
      }
    }

    revalidatePath('/commercial/deposits')
    revalidatePath('/commercial/companies-registry')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    console.error('updateDepositStageStateAction exception:', err)
    return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }
  }
}

export async function uploadCompanyBarcodeAction(stageId: string, companyId: string, barcodeDataUrl: string) {
  if (stageId) {
    const access = await requireRecordAccess('deposit_stages', stageId)
    if (access) return access
  }

  const rowDenied = await requireRecordAccess('companies', companyId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('deposits', 'release')
  if (denied) return denied

  // التحقق من الملف على الخادم: صورة أو PDF فقط، وحد أقصى للحجم (لا نثق بفحص المتصفح وحده)
  if (!/^data:(image\/(png|jpeg|webp|gif)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(barcodeDataUrl || '')) {
    return { success: false as const, error: 'الملف غير صالح: يُقبل PNG أو JPG أو WebP أو PDF فقط' }
  }
  if (barcodeDataUrl.length > 7_000_000) {
    return { success: false as const, error: 'حجم الملف كبير جداً (الحد الأقصى 5 ميغابايت)' }
  }

  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    // تحديث قاعدة البيانات
    try {
      if (stageId && !stageId.startsWith('mem_') && !stageId.startsWith('stage_')) {
        await dbWrite(supabase
          .from('deposit_stages')
          .update({
            state: 'done',
            at_date: today,
            notes: barcodeDataUrl,
          })
          .eq('id', stageId), 'deposit_stages')
      }

      // 1. Basic status update (guaranteed to succeed across DB schemas)
      await dbWrite(supabase
        .from('companies')
        .update({ status: 'established' })
        .eq('id', companyId), 'companies')

      // 2. Extended fields if columns exist
      try {
        await dbWrite(supabase
          .from('companies')
          .update({
            deposit_released: true,
            deposit_released_at: today,
            barcode_url: barcodeDataUrl,
          })
          .eq('id', companyId), 'companies')
      } catch (dbErr) {
    rethrowDbError(dbErr)}

      await dbWrite(supabase
        .from('deposits')
        .update({ status: 'released' })
        .eq('company_id', companyId), 'deposits')

      await logTimelineEvent({
        company_id: companyId,
        event_type: 'deposit_released',
        title: 'تم إطلاق الوديعة بنجاح واستكمال رفع الباركود — أصبحت ضمن الشركات المؤسسة',
        related_link: '/commercial/companies-registry',
      })

      await createNotificationAction({
        title: 'تم إطلاق الوديعة بنجاح',
        description: 'أُكملت المحطات ورُفع الباركود بنجاح، وانتقلت الشركة إلى قسم الشركات.',
        type: 'deposit_released',
        related_company_id: companyId,
        link_url: '/commercial/companies-registry',
      })
    } catch (e) {
      rethrowDbError(e)
      console.warn('Supabase barcode upload notice:', e)
    }

    try {
      revalidatePath('/commercial/deposits')
      revalidatePath('/commercial/companies-registry')
      revalidatePath('/commercial/companies')
      revalidatePath(`/commercial/companies/${companyId}`)
      revalidatePath('/commercial')
      revalidatePath('/dashboard')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    return { success: true }
  } catch (err) {
    console.error('uploadCompanyBarcodeAction error:', err)
    return { success: false, error: 'تعذر رفع الباركود' }
  }
}
