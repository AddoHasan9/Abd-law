/**
 * إجراءات خادم المعاملات التجارية — وتأمين الصلاحيات والسلامة البرمجية
 */
'use server'

import { requireRecordAccess } from '@/lib/auth/record-access'
import { getCurrentUserProfile } from '@/lib/auth/require-permission'
import { findCompanyByName } from '@/lib/data/company-name'
import { dbWrite, rethrowDbError } from '@/lib/data/db-guard'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { TxPriority } from '@/types/database'
import { logTimelineEvent } from '@/lib/data/timeline'
import { requirePermission } from '@/lib/auth/require-permission'

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** إنشاء معاملة تجارية مع التحقق الصارم من وجود الشركة ونوع الخدمة */
export async function createTransactionAction(formData: FormData) {
  const denied = await requirePermission('transactions', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    const type = formData.get('type')?.toString().trim()
    if (!type) {
      return { success: false, error: 'نوع المعاملة/الخدمة مطلوب ولا يمكن تركها فارغة' }
    }

    let company_id = formData.get('company_id')?.toString().trim() || null
    const company_name = formData.get('company_name')?.toString().trim() || null

    if (!company_id && !company_name) {
      return { success: false, error: 'يرجى تحديد الشركة أو كتابة اسمها' }
    }

    if (!company_id && company_name) {
      // شركة موجودة بنفس الاسم؟ (كان يُبحث في ملف مؤقت فارغ فتُنشأ شركة مكررة دائماً)
      const existingCo = await findCompanyByName(company_name)
      if (existingCo) {
        company_id = existingCo.id
      } else {
        const newCoUUID = generateUUID()
        company_id = newCoUUID
        const newCo = {
          id: newCoUUID,
          name: company_name,
          kind: 'محدودة',
          capital: 0,
          external: true,
          status: 'established',
          created_at: new Date().toISOString(),
        }
        try {
          await dbWrite(supabase.from('companies').insert(newCo), 'companies')
        } catch (dbErr) {
          rethrowDbError(dbErr)
        }
      }
    }

    const priority = (formData.get('priority')?.toString().trim() || 'medium') as TxPriority
    const description = formData.get('description')?.toString().trim() || null
    const feeRaw = formData.get('amount')?.toString() || formData.get('fee')?.toString() || '0'
    const fee = parseFloat(feeRaw.replace(/[^0-9.]/g, '')) || null
    const phone = formData.get('client_phone')?.toString().trim() || formData.get('phone')?.toString().trim() || null
    const lawyer_id = formData.get('lawyer_id')?.toString().trim() || null
    const lawyer_name = formData.get('lawyer_name')?.toString().trim() || null

    if (!lawyer_id) {
      return { success: false, error: 'المحامي المكلّف / المسؤول مطلوب (إلزامي)' }
    }

    const txObj = {
      id: generateUUID(),
      type,
      priority,
      status: 'new',
      company_id,
      description,
      fee,
      phone,
      lawyer_id,
      assigned_lawyer_name: lawyer_name || null,
      tx_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    }

    try {
      await dbWrite(supabase.from('transactions').insert({
        id: txObj.id,
        type: txObj.type,
        priority: txObj.priority,
        status: txObj.status,
        company_id: txObj.company_id,
        description: txObj.description,
        fee: txObj.fee,
        phone: txObj.phone,
        lawyer_id: txObj.lawyer_id,
        tx_date: txObj.tx_date,
      }), 'transactions')
    } catch (dbErr) {
      rethrowDbError(dbErr)
      // Ignored for disk fallback
    }

    // Log timeline event for transaction creation
    if (company_id) {
      await logTimelineEvent({
        company_id: company_id,
        event_type: 'tx_created',
        title: 'إنشاء معاملة تجارية جديدة',
        description: `نوع الخدمة: ${type} | أولوية المعاملة: ${priority}`,
        actor_name: (await getCurrentUserProfile())?.name || undefined,
      })
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/companies')
      revalidatePath(`/commercial/companies/${company_id}`)
      revalidatePath('/dashboard')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    return { success: true, tx: txObj }
  } catch (err: unknown) {
    console.error('createTransactionAction exception:', err)
    return { success: false, error: 'حدث خطأ أثناء إضافة المعاملة' }
  }
}

/** تعيين أو تغيير المحامي المكلف بالمعاملة */
export async function assignLawyerToTransactionAction(
  txId: string,
  lawyerId: string | null,
  lawyerName: string | null,
  companyId?: string | null
) {
  if (companyId) {
    const access = await requireRecordAccess('companies', companyId)
    if (access) return access
  }

  const rowDenied = await requireRecordAccess('transactions', txId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('transactions', 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    try {
      await dbWrite(supabase
        .from('transactions')
        .update({
          lawyer_id: lawyerId,
        })
        .eq('id', txId), 'transactions')
    } catch (e) {
      rethrowDbError(e)
      console.warn('Supabase assign lawyer notice:', e)
    }

    const targetCompanyId = companyId || null

    if (targetCompanyId) {
      await logTimelineEvent({
        company_id: targetCompanyId,
        event_type: 'lawyer_assigned',
        title: 'تعيين المحامي المكلف',
        description: lawyerName ? `تم تكليف المحامي: ${lawyerName}` : 'تم إلغاء التكليف الحالي',
        actor_name: (await getCurrentUserProfile())?.name || undefined,
      })
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/companies')
      if (targetCompanyId) revalidatePath(`/commercial/companies/${targetCompanyId}`)
      revalidatePath('/dashboard')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    return { success: true }
  } catch (err) {
    console.error('assignLawyerToTransactionAction exception:', err)
    return { success: false, error: 'تعذر تعيين المحامي المكلف' }
  }
}

/** تعديل تفاصيل وإكمال السجلات غير المكتملة */
export async function updateTransactionDetailsAction(
  txId: string,
  payload: {
    company_id?: string | null
    company_name?: string | null
    type?: string | null
    priority?: string | null
    status?: string | null
    tx_date?: string | null
    fee?: number | null
    description?: string | null
    phone?: string | null
    lawyer_id?: string | null
    lawyer_name?: string | null
    manager_name?: string | null
  }
) {
  const rowDenied = await requireRecordAccess('transactions', txId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('transactions', 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const isSynthetic = txId.startsWith('tx_')
    const realTxId = isSynthetic ? generateUUID() : txId

    // 1. تحديث اسم الشركة إن عُدّل
    const targetCompanyId = payload.company_id
    if (targetCompanyId) {
      if (payload.company_name) {
        const { error: coError } = await supabase
          .from('companies')
          .update({ name: payload.company_name })
          .eq('id', targetCompanyId)

        if (coError) {
          console.warn('Supabase company update error:', coError)
        }

      }

      // 2. تحديث المدير المفوض عبر جدول company_managers (مطابقة لقاعدة AGENTS.md)
      if (payload.manager_name) {
        const mgrObj = {
          id: generateUUID(),
          company_id: targetCompanyId,
          name: payload.manager_name,
          active: true,
          created_at: new Date().toISOString(),
        }

        const { error: mgrError } = await supabase
          .from('company_managers')
          .upsert(mgrObj)

        if (mgrError) {
          console.warn('Supabase company_managers error:', mgrError)
        }

      }
    }

    // 3. حفظ المعاملة في قاعدة بيانات Supabase
    const txDataToSave: Record<string, unknown> = {}
    if (payload.company_id !== undefined) txDataToSave.company_id = payload.company_id
    if (payload.type !== undefined) txDataToSave.type = payload.type
    if (payload.priority !== undefined) txDataToSave.priority = payload.priority
    if (payload.status !== undefined) txDataToSave.status = payload.status
    if (payload.tx_date !== undefined) txDataToSave.tx_date = payload.tx_date
    if (payload.description !== undefined) txDataToSave.description = payload.description
    if (payload.fee !== undefined) txDataToSave.fee = payload.fee
    if (payload.phone !== undefined) txDataToSave.phone = payload.phone
    if (payload.lawyer_id !== undefined) txDataToSave.lawyer_id = payload.lawyer_id

    let existsInDb = false
    if (!isSynthetic) {
      const { data: existingRow } = await supabase
        .from('transactions')
        .select('id')
        .eq('id', txId)
        .maybeSingle()
      if (existingRow) existsInDb = true
    }

    if (existsInDb) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update(txDataToSave)
        .eq('id', txId)

      if (updateError) {
        console.error('Supabase transaction update error:', updateError)
        return { success: false, error: `فشل تحديث المعاملة: ${updateError.message}` }
      }
    } else {
      const insertObj = {
        id: realTxId,
        type: payload.type || 'formation',
        priority: payload.priority || 'medium',
        status: payload.status || 'new',
        company_id: payload.company_id || null,
        description: payload.description || null,
        fee: payload.fee || null,
        phone: payload.phone || null,
        lawyer_id: payload.lawyer_id || null,
        tx_date: payload.tx_date || new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      }
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(insertObj)

      if (insertError) {
        console.warn('Supabase insert transaction error:', insertError)
      }
    }

    if (targetCompanyId) {
      await logTimelineEvent({
        company_id: targetCompanyId,
        event_type: 'tx_updated',
        title: 'تحديث وتصحيح بيانات المعاملة',
        description: `تم تحديث وتصحيح البيانات بنجاح في النظام.`,
        actor_name: (await getCurrentUserProfile())?.name || undefined,
      })
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/companies')
      if (targetCompanyId) revalidatePath(`/commercial/companies/${targetCompanyId}`)
      revalidatePath('/dashboard')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    const updatedTx: Record<string, unknown> = { id: realTxId, updated_at: new Date().toISOString() }
    for (const k of ['company_id', 'type', 'priority', 'status', 'tx_date', 'fee', 'description', 'phone', 'lawyer_id'] as const) {
      if (payload[k] !== undefined) updatedTx[k] = payload[k]
    }
    if (payload.lawyer_name !== undefined) updatedTx.assigned_lawyer_name = payload.lawyer_name
    return { success: true, updatedTx }
  } catch (err: unknown) {
    console.error('updateTransactionDetailsAction exception:', err)
    return { success: false, error: 'حدث خطأ أثناء تعديل بيانات المعاملة' }
  }
}

/** أرشفة المعاملة */
export async function archiveTransactionAction(txId: string, reason?: string) {
  const rowDenied = await requireRecordAccess('transactions', txId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('transactions', 'close')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    try {
      await dbWrite(supabase
        .from('transactions')
        .update({ status: 'closed' })
        .eq('id', txId), 'transactions')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    // سبب الأرشفة في السجل الزمني للشركة (كان يُحفظ في ملف مؤقت فيضيع)
    const { data: tx } = await supabase.from('transactions').select('company_id').eq('id', txId).maybeSingle()
    if (tx?.company_id) {
      await logTimelineEvent({
        company_id: tx.company_id,
        event_type: 'tx_archived',
        title: 'أرشفة معاملة',
        description: reason?.trim() || 'أرشفة من قائمة الخيارات',
        actor_name: (await getCurrentUserProfile())?.name || undefined,
        related_link: '/commercial',
      })
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/dashboard')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    return { success: true }
  } catch (err) {
    console.error('archiveTransactionAction exception:', err)
    return { success: false, error: 'تعذر أرشفة المعاملة' }
  }
}

/** حذف المعاملة (مؤمنة مع القائمة السوداء الدائمة) */
export async function deleteTransactionAction(txId: string) {
  const rowDenied = await requireRecordAccess('transactions', txId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('transactions', 'delete')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    try {
      await dbWrite(supabase.from('transactions').delete().eq('id', txId), 'transactions')
    } catch (e) {
      rethrowDbError(e)
      console.warn('Supabase transaction delete warning:', e)
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/llc')
      revalidatePath('/dashboard')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    return { success: true }
  } catch (err) {
    console.error('deleteTransactionAction exception:', err)
    return { success: false, error: 'تعذر حذف المعاملة' }
  }
}

const CLOSING_STATUSES = ['completed', 'closed', 'cancelled', 'done', 'rejected']

export async function updateTransactionStatusAction(txId: string, status: string, companyId?: string | null) {
  if (companyId) {
    const access = await requireRecordAccess('companies', companyId)
    if (access) return access
  }

  // معرّف مولّد في الواجهة (tx_<الشركة>): نعثر على معاملة التأسيس الحقيقية للشركة
  if (txId.startsWith('tx_') && companyId) {
    const { data: realTx } = await createAdminClient()
      .from('transactions')
      .select('id')
      .eq('company_id', companyId)
      .in('type', ['formation', 'tasis'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!realTx) {
      // لا توجد معاملة تأسيس مسجلة — نحدّث حالة الشركة فقط
      const { error } = await createAdminClient().from('companies').update({ status: status === 'done' || status === 'completed' ? 'established' : status }).eq('id', companyId)
      if (error) return { success: false, error: 'تعذّر حفظ حالة الشركة. حاول مجدداً' }
      revalidatePath(`/commercial/companies/${companyId}`)
      return { success: true }
    }
    txId = realTx.id
  }

  const rowDenied = await requireRecordAccess('transactions', txId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('transactions', CLOSING_STATUSES.includes(status) ? 'close' : 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    try {
      const { error } = await supabase.from('transactions').update({ status }).eq('id', txId)
      if (error) throw error
      if (companyId) {
        const { error: coErr } = await supabase
          .from('companies')
          .update({ status: status === 'done' || status === 'completed' ? 'established' : status })
          .eq('id', companyId)
        if (coErr) throw coErr
      }
    } catch (e) {
      console.error('updateTransactionStatusAction DB error:', e)
      return { success: false, error: 'تعذّر حفظ الحالة في قاعدة البيانات. حاول مجدداً' }
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/companies')
      if (companyId) {
        revalidatePath(`/commercial/companies/${companyId}`)
      }
      revalidatePath('/dashboard')
    } catch (revalErr) {
      rethrowDbError(revalErr)
      console.warn('revalidatePath notice:', revalErr)
    }

    return { success: true }
  } catch (err: unknown) {
    console.error('updateTransactionStatusAction exception:', err)
    return { success: false, error: 'تعذر تحديث حالة المعاملة' }
  }
}
