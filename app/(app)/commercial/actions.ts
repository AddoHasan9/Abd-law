/**
 * إجراءات خادم المعاملات التجارية — وتأمين الصلاحيات والسلامة البرمجية
 */
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { TxPriority, CompanyWithWorkflow } from '@/types/database'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'
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

    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])

    if (!company_id && company_name) {
      const foundInDisk = diskCompanies.find(c => c.name.toLowerCase() === company_name.toLowerCase())
      if (foundInDisk) {
        company_id = foundInDisk.id
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
          await supabase.from('companies').insert(newCo)
        } catch {}
        diskCompanies.unshift(newCo as unknown as CompanyWithWorkflow)
        writeJsonFile('companies.json', diskCompanies)
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
      await supabase.from('transactions').insert({
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
      })
    } catch {
      // Ignored for disk fallback
    }

    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    diskTxs.unshift(txObj)
    writeJsonFile('transactions.json', diskTxs)

    // Log timeline event for transaction creation
    if (company_id) {
      await logTimelineEvent({
        company_id: company_id,
        event_type: 'tx_created',
        title: 'إنشاء معاملة تجارية جديدة',
        description: `نوع الخدمة: ${type} | أولوية المعاملة: ${priority}`,
        actor_name: 'محمد أحمد',
      })
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/companies')
      revalidatePath(`/commercial/companies/${company_id}`)
      revalidatePath('/dashboard')
    } catch {}

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
  const denied = await requirePermission('transactions', 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    try {
      await supabase
        .from('transactions')
        .update({
          lawyer_id: lawyerId,
        })
        .eq('id', txId)
    } catch (e) {
      console.warn('Supabase assign lawyer notice:', e)
    }

    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    const idx = diskTxs.findIndex(t => t.id === txId)
    if (idx !== -1) {
      diskTxs[idx].lawyer_id = lawyerId
      diskTxs[idx].assigned_lawyer_name = lawyerName
      writeJsonFile('transactions.json', diskTxs)
    }

    const targetCompanyId = companyId || (idx !== -1 ? (diskTxs[idx].company_id as string) : null)

    if (targetCompanyId) {
      await logTimelineEvent({
        company_id: targetCompanyId,
        event_type: 'lawyer_assigned',
        title: 'تعيين المحامي المكلف',
        description: lawyerName ? `تم تكليف المحامي: ${lawyerName}` : 'تم إلغاء التكليف الحالي',
        actor_name: 'محمد أحمد',
      })
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/companies')
      if (targetCompanyId) revalidatePath(`/commercial/companies/${targetCompanyId}`)
      revalidatePath('/dashboard')
    } catch {}

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

        const diskCompanies = readJsonFile<Array<Record<string, unknown>>>('companies.json', [])
        const cIdx = diskCompanies.findIndex(c => c.id === targetCompanyId)
        if (cIdx !== -1) {
          diskCompanies[cIdx].name = payload.company_name
          writeJsonFile('companies.json', diskCompanies)
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

        const diskMgrs = readJsonFile<Array<Record<string, unknown>>>('company_managers.json', [])
        const mIdx = diskMgrs.findIndex(m => m.company_id === targetCompanyId && m.active)
        if (mIdx !== -1) {
          diskMgrs[mIdx].name = payload.manager_name
        } else {
          diskMgrs.push(mgrObj)
        }
        writeJsonFile('company_managers.json', diskMgrs)
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

    // 4. تحديث التخزين المحلي (.data/transactions.json)
    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    let idx = diskTxs.findIndex(t => t.id === txId || t.id === realTxId)
    if (idx === -1 && targetCompanyId) {
      idx = diskTxs.findIndex(t => t.company_id === targetCompanyId)
    }

    const updatedTxDisk: Record<string, unknown> = idx !== -1 ? { ...diskTxs[idx] } : { id: realTxId, created_at: new Date().toISOString() }

    if (payload.company_id !== undefined) updatedTxDisk.company_id = payload.company_id
    if (payload.type !== undefined) updatedTxDisk.type = payload.type
    if (payload.priority !== undefined) updatedTxDisk.priority = payload.priority
    if (payload.status !== undefined) updatedTxDisk.status = payload.status
    if (payload.tx_date !== undefined) updatedTxDisk.tx_date = payload.tx_date
    if (payload.fee !== undefined) updatedTxDisk.fee = payload.fee
    if (payload.description !== undefined) updatedTxDisk.description = payload.description
    if (payload.phone !== undefined) updatedTxDisk.phone = payload.phone
    if (payload.lawyer_id !== undefined) updatedTxDisk.lawyer_id = payload.lawyer_id
    if (payload.lawyer_name !== undefined) updatedTxDisk.assigned_lawyer_name = payload.lawyer_name
    updatedTxDisk.updated_at = new Date().toISOString()

    if (idx !== -1) {
      diskTxs[idx] = updatedTxDisk
    } else {
      diskTxs.unshift(updatedTxDisk)
    }
    writeJsonFile('transactions.json', diskTxs)

    if (targetCompanyId) {
      await logTimelineEvent({
        company_id: targetCompanyId,
        event_type: 'tx_updated',
        title: 'تحديث وتصحيح بيانات المعاملة',
        description: `تم تحديث وتصحيح البيانات بنجاح في النظام.`,
        actor_name: 'محمد أحمد',
      })
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/companies')
      if (targetCompanyId) revalidatePath(`/commercial/companies/${targetCompanyId}`)
      revalidatePath('/dashboard')
    } catch {}

    return { success: true, updatedTx: updatedTxDisk }
  } catch (err: unknown) {
    console.error('updateTransactionDetailsAction exception:', err)
    return { success: false, error: 'حدث خطأ أثناء تعديل بيانات المعاملة' }
  }
}

/** أرشفة المعاملة */
export async function archiveTransactionAction(txId: string, reason?: string) {
  const denied = await requirePermission('transactions', 'close')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    try {
      await supabase
        .from('transactions')
        .update({ status: 'closed' })
        .eq('id', txId)
    } catch {}

    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    const idx = diskTxs.findIndex(t => t.id === txId)
    if (idx !== -1) {
      diskTxs[idx].status = 'closed'
      diskTxs[idx].archive_reason = reason || 'أرشفة من قائمة الخيارات'
      writeJsonFile('transactions.json', diskTxs)
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/dashboard')
    } catch {}

    return { success: true }
  } catch (err) {
    console.error('archiveTransactionAction exception:', err)
    return { success: false, error: 'تعذر أرشفة المعاملة' }
  }
}

/** حذف المعاملة (مؤمنة مع القائمة السوداء الدائمة) */
export async function deleteTransactionAction(txId: string) {
  const denied = await requirePermission('transactions', 'delete')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    try {
      await supabase.from('transactions').delete().eq('id', txId)
    } catch (e) {
      console.warn('Supabase transaction delete warning:', e)
    }

    // Add to persistent deleted transaction blacklist
    const deletedTxIds = readJsonFile<string[]>('deleted_transaction_ids.json', [])
    if (!deletedTxIds.includes(txId)) {
      deletedTxIds.push(txId)
      writeJsonFile('deleted_transaction_ids.json', deletedTxIds)
    }

    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    const filtered = diskTxs.filter(t => t.id !== txId)
    writeJsonFile('transactions.json', filtered)

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/llc')
      revalidatePath('/dashboard')
    } catch {}

    return { success: true }
  } catch (err) {
    console.error('deleteTransactionAction exception:', err)
    return { success: false, error: 'تعذر حذف المعاملة' }
  }
}

const CLOSING_STATUSES = ['completed', 'closed', 'cancelled', 'done', 'rejected']

export async function updateTransactionStatusAction(txId: string, status: string, companyId?: string | null) {
  const denied = await requirePermission('transactions', CLOSING_STATUSES.includes(status) ? 'close' : 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    try {
      await supabase
        .from('transactions')
        .update({ status })
        .eq('id', txId)

      if (companyId) {
        await supabase
          .from('companies')
          .update({ status: status === 'done' ? 'established' : status })
          .eq('id', companyId)
      }
    } catch (e) {
      console.warn('Supabase transaction status update notice:', e)
    }

    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    const idx = diskTxs.findIndex(t => t.id === txId || t.id === `tx_${companyId}` || (companyId && t.company_id === companyId))
    if (idx !== -1) {
      diskTxs[idx].status = status
    } else if (companyId) {
      diskTxs.push({
        id: txId || `tx_${companyId}`,
        company_id: companyId,
        status: status,
        updated_at: new Date().toISOString(),
      })
    }
    writeJsonFile('transactions.json', diskTxs)

    if (companyId) {
      const diskCompanies = readJsonFile<Array<Record<string, unknown>>>('companies.json', [])
      const cIdx = diskCompanies.findIndex(c => c.id === companyId)
      if (cIdx !== -1) {
        diskCompanies[cIdx].status = status === 'done' ? 'established' : status
        writeJsonFile('companies.json', diskCompanies)
      }
    }

    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/companies')
      if (companyId) {
        revalidatePath(`/commercial/companies/${companyId}`)
      }
      revalidatePath('/dashboard')
    } catch (revalErr) {
      console.warn('revalidatePath notice:', revalErr)
    }

    return { success: true }
  } catch (err: unknown) {
    console.error('updateTransactionStatusAction exception:', err)
    return { success: false, error: 'تعذر تحديث حالة المعاملة' }
  }
}
