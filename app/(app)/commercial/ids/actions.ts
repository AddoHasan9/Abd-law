'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { logTimelineEvent } from '@/lib/data/timeline'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'
import type { CompanyWithWorkflow, CompanyIDRecord, CompanyIDStatus, TransactionFull, Company } from '@/types/database'
import { requirePermission } from '@/lib/auth/require-permission'

export type { CompanyIDRecord, CompanyIDStatus }

const ID_TYPE_LABELS: Record<string, string> = {
  importer_id: 'هوية مستورد',
  tax_id: 'هوية ضريبية',
  planning_id: 'هوية التخطيط',
  chamber_id: 'هوية الغرفة التجارية',
}

function mapIDTypeToTxType(idType: string, isRenew: boolean): string {
  if (idType === 'chamber_id') return isRenew ? 'chamber-renew' : 'chamber-new'
  if (idType === 'tax_id') return isRenew ? 'tax-id-renew' : 'tax-id-new'
  if (idType === 'planning_id') return isRenew ? 'plan-id-renew' : 'plan-id'
  if (idType === 'importer_id') return isRenew ? 'importer-id-renew' : 'importer-id-new'
  return 'tax-id-new'
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function getCompanyIDsAction(companyIdFilter?: string) {
  try {
    const diskIDs = readJsonFile<CompanyIDRecord[]>('company_ids.json', [])
    const supabase = createAdminClient()

    let dbIDs: CompanyIDRecord[] = []
    try {
      let query = supabase
        .from('company_ids')
        .select('*, companies(name, manager)')
        .order('created_at', { ascending: false })

      if (companyIdFilter) {
        query = query.eq('company_id', companyIdFilter)
      }

      const { data, error } = await query

      if (!error && data) {
        dbIDs = data.map((item: {
          id: string
          company_id: string
          companies?: { name?: string; manager?: string } | null
          company_name?: string | null
          id_type: 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'
          id_number?: string | null
          manager_name?: string | null
          issue_date?: string | null
          expiry_date?: string | null
          tx_start_date?: string | null
          grade?: string | null
          status?: CompanyIDStatus | null
          notes?: string | null
          created_at: string
        }) => {
          const isDone = Boolean(item.id_number || item.issue_date)
          const computedStatus: CompanyIDStatus = item.status || (isDone ? 'done' : 'in_progress')

          return {
            id: item.id,
            company_id: item.company_id,
            company_name: item.companies?.name || item.company_name || null,
            id_type: item.id_type,
            id_number: item.id_number,
            manager_name: item.manager_name || item.companies?.manager || null,
            issue_date: item.issue_date,
            expiry_date: item.expiry_date,
            tx_start_date: item.tx_start_date,
            grade: item.grade,
            status: computedStatus,
            notes: item.notes || null,
            created_at: item.created_at,
          }
        })
      }
    } catch (e) {
      console.warn('Supabase getCompanyIDs error:', e)
    }

    // Merge disk and DB records
    const map = new Map<string, CompanyIDRecord>()
    diskIDs.forEach(idRec => {
      if (!companyIdFilter || idRec.company_id === companyIdFilter) {
        const isDone = Boolean(idRec.id_number || idRec.issue_date)
        const computedStatus: CompanyIDStatus = idRec.status || (isDone ? 'done' : 'in_progress')
        map.set(idRec.id, { ...idRec, status: computedStatus })
      }
    })

    dbIDs.forEach(idRec => {
      map.set(idRec.id, idRec)
    })

    const allItems = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    )

    return { success: true, data: allItems }
  } catch (err) {
    console.warn('getCompanyIDsAction exception, using disk store:', err)
    const diskIDs = readJsonFile<CompanyIDRecord[]>('company_ids.json', [])
    const filtered = companyIdFilter ? diskIDs.filter(x => x.company_id === companyIdFilter) : diskIDs
    return { success: true, data: filtered }
  }
}

export async function createCompanyIDAction(payload: {
  company_id?: string
  company_name?: string
  id_type: 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'
  id_number?: string
  manager_name?: string
  lawyer_id?: string
  issue_date?: string
  expiry_date?: string
  tx_start_date?: string
  grade?: string
  status?: CompanyIDStatus
  notes?: string
}) {
  const denied = await requirePermission('government_ids', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const compName = payload.company_name?.trim() || ''
    let targetCompanyId = payload.company_id?.trim() || ''

    if (!payload.lawyer_id?.trim()) {
      return { success: false, error: 'المحامي المكلّف / المسؤول مطلوب (إلزامي)' }
    }

    if (!targetCompanyId && !compName) {
      return { success: false, error: 'يرجى اختيار شركة أو كتابة اسم الشركة' }
    }

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetCompanyId)

    // Check disk companies first
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])

    if ((!targetCompanyId || !isValidUUID) && compName) {
      // Look up existing company by name in disk or DB
      const foundInDisk = diskCompanies.find(c => c.name.toLowerCase() === compName.toLowerCase())
      if (foundInDisk) {
        targetCompanyId = foundInDisk.id
      } else {
        // Auto-create company in DB and disk so it connects properly
        try {
          const { data: dbCo } = await supabase
            .from('companies')
            .select('id, name')
            .ilike('name', compName)
            .limit(1)
            .single()

          if (dbCo) {
            targetCompanyId = dbCo.id
          } else {
            targetCompanyId = payload.company_id || generateUUID()
          }
        } catch (e) {
          if (!targetCompanyId) {
            targetCompanyId = payload.company_id || generateUUID()
          }
        }
      }
    }

    if (!targetCompanyId) {
      targetCompanyId = payload.company_id || generateUUID()
    }

    // --- CHECK DUPLICATION (DB + Disk) ---
    // If the same company already has an active or in-progress record for this ID type, prevent accidental duplicate
    const diskIDs = readJsonFile<CompanyIDRecord[]>('company_ids.json', [])
    const existingDuplicate = diskIDs.find(
      x => x.company_id === targetCompanyId && x.id_type === payload.id_type
    )

    if (existingDuplicate) {
      const typeLabel = ID_TYPE_LABELS[payload.id_type] || payload.id_type
      const statusLabel = existingDuplicate.status === 'done' ? 'صادرة وفعالة' : 'قيد الإجراء'
      return {
        success: false,
        error: `يوجد سجل (${typeLabel}) مسجل مسبقاً لهذه الشركة (الحالة: ${statusLabel}). يرجى تعديل أو تجديد السجل القائم بدلاً من إنشاء هوية مكررة.`,
      }
    }

    // Check in Supabase as well
    try {
      const { data: dbExisting } = await supabase
        .from('company_ids')
        .select('id, id_type, status')
        .eq('company_id', targetCompanyId)
        .eq('id_type', payload.id_type)
        .maybeSingle()

      if (dbExisting) {
        const typeLabel = ID_TYPE_LABELS[payload.id_type] || payload.id_type
        return {
          success: false,
          error: `يوجد سجل (${typeLabel}) مسجل مسبقاً في قاعدة البيانات لهذه الشركة. يرجى تعديل السجل الحالي.`,
        }
      }
    } catch {}

    const recordId = generateUUID()
    const idNumber = payload.id_number?.trim() || null
    const managerName = payload.manager_name?.trim() || null
    const issueDate = payload.issue_date || null
    const expiryDate = payload.expiry_date || null
    const txStartDate = payload.tx_start_date || new Date().toISOString().slice(0, 10)
    const grade = payload.id_type === 'chamber_id' ? payload.grade || null : null
    const createdAt = new Date().toISOString()

    // Status: if explicit, or if id_number / issue_date provided => done, else in_progress
    const finalStatus: CompanyIDStatus = payload.status || (idNumber || issueDate ? 'done' : 'in_progress')

    // Find actual company name to display
    let finalCompanyName = compName
    if (!finalCompanyName && targetCompanyId) {
      const co = diskCompanies.find(c => c.id === targetCompanyId)
      if (co) finalCompanyName = co.name
    }

    const diskRecord: CompanyIDRecord = {
      id: recordId,
      company_id: targetCompanyId,
      company_name: finalCompanyName || null,
      id_type: payload.id_type,
      id_number: idNumber,
      manager_name: managerName,
      issue_date: issueDate,
      expiry_date: expiryDate,
      tx_start_date: txStartDate,
      grade: grade,
      status: finalStatus,
      notes: payload.notes?.trim() || null,
      created_at: createdAt,
    }

    // Save to Supabase DB if possible
    try {
      await supabase.from('company_ids').insert({
        id: recordId,
        company_id: targetCompanyId,
        id_type: payload.id_type,
        id_number: idNumber,
        manager_name: managerName,
        issue_date: issueDate,
        expiry_date: expiryDate,
        tx_start_date: txStartDate,
        grade: grade,
      })
    } catch (dbErr) {
      console.warn('Supabase insert company_ids error:', dbErr)
    }

    // Save to Disk Store (Guarantees immediate persistence)
    diskIDs.unshift(diskRecord)
    writeJsonFile('company_ids.json', diskIDs)

    // Sync to Commercial Transactions Feed
    const isRenew = Boolean(payload.notes?.includes('تجديد'))
    const txTypeStr = mapIDTypeToTxType(payload.id_type, isRenew)
    const txStatus = finalStatus === 'done' ? 'done' : 'in_progress'
    const lawyerId = payload.lawyer_id?.trim() || null

    const txRecord: TransactionFull = {
      id: recordId,
      company_id: targetCompanyId,
      client_id: null,
      lawyer_id: lawyerId,
      type: txTypeStr,
      status: txStatus,
      priority: 'medium',
      tx_date: createdAt.slice(0, 10),
      due_date: expiryDate || null,
      description: payload.notes?.trim() || `إصدار ${ID_TYPE_LABELS[payload.id_type] || payload.id_type}`,
      services: [payload.id_type],
      lacks: null,
      fee: null,
      phone: null,
      created_at: createdAt,
      clients: null,
      profiles: null,
      companies: {
        id: targetCompanyId,
        name: finalCompanyName || 'شركة',
      } as Company,
    }

    try {
      await supabase.from('transactions').insert({
        id: recordId,
        company_id: targetCompanyId,
        lawyer_id: lawyerId,
        type: txTypeStr,
        status: txStatus,
        priority: 'medium',
        tx_date: createdAt.slice(0, 10),
        due_date: expiryDate || null,
        description: payload.notes?.trim() || `إصدار ${ID_TYPE_LABELS[payload.id_type] || payload.id_type}`,
        created_at: createdAt,
      })
    } catch (txDbErr) {
      console.warn('transactions insert for company_ids notice:', txDbErr)
    }

    const diskTxs = readJsonFile<TransactionFull[]>('transactions.json', [])
    diskTxs.unshift(txRecord)
    writeJsonFile('transactions.json', diskTxs)

    // Log timeline event for real companies only
    try {
      if (targetCompanyId && !targetCompanyId.startsWith('dup_') && !targetCompanyId.startsWith('test_co_')) {
        const isComplete = finalStatus === 'done'
        await logTimelineEvent({
          company_id: targetCompanyId,
          event_type: 'id_issued',
          title: isComplete
            ? `إصدار ${ID_TYPE_LABELS[payload.id_type] || payload.id_type}${idNumber ? ` (${idNumber})` : ''}`
            : `بدء معاملة إصدار ${ID_TYPE_LABELS[payload.id_type] || payload.id_type} (قيد الإجراء)`,
          related_link: '/commercial/ids',
        })
      }
    } catch { }

    try {
      revalidatePath('/commercial/ids')
      revalidatePath('/commercial/companies')
      revalidatePath(`/commercial/companies/${targetCompanyId}`)
      revalidatePath('/commercial')
      revalidatePath('/dashboard')
    } catch { }

    return { success: true, record: diskRecord }
  } catch (err: unknown) {
    console.error('createCompanyIDAction exception:', err)
    const message = err instanceof Error ? err.message : 'فشل حفظ الهوية'
    return { success: false, error: message }
  }
}

export async function updateCompanyIDAction(
  id: string,
  payload: {
    id_number?: string | null
    manager_name?: string | null
    issue_date?: string | null
    expiry_date?: string | null
    tx_start_date?: string | null
    grade?: string | null
    status?: CompanyIDStatus
    notes?: string | null
  }
) {
  // إكمال/تجديد الهوية (status: 'done') يتطلب صلاحية renew المنفصلة عن create
  const denied = await requirePermission('government_ids', payload.status === 'done' ? 'renew' : 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const updateData: Record<string, unknown> = {}

    if (payload.id_number !== undefined) updateData.id_number = payload.id_number || null
    if (payload.manager_name !== undefined) updateData.manager_name = payload.manager_name || null
    if (payload.issue_date !== undefined) updateData.issue_date = payload.issue_date || null
    if (payload.expiry_date !== undefined) updateData.expiry_date = payload.expiry_date || null
    if (payload.tx_start_date !== undefined) updateData.tx_start_date = payload.tx_start_date || null
    if (payload.grade !== undefined) updateData.grade = payload.grade || null
    if (payload.notes !== undefined) updateData.notes = payload.notes || null

    if (payload.status) {
      updateData.status = payload.status
    } else if (payload.id_number || payload.issue_date) {
      updateData.status = 'done'
    }

    try {
      await supabase.from('company_ids').update(updateData).eq('id', id)
    } catch (dbErr) {
      console.warn('Supabase update company_ids error:', dbErr)
    }

    // Update disk store
    const diskIDs = readJsonFile<CompanyIDRecord[]>('company_ids.json', [])
    const idx = diskIDs.findIndex(x => x.id === id)
    let updatedRec: CompanyIDRecord | undefined = undefined
    if (idx !== -1) {
      Object.assign(diskIDs[idx], updateData)
      updatedRec = diskIDs[idx]
      writeJsonFile('company_ids.json', diskIDs)
    }

    // Update corresponding commercial transaction
    const isDone = payload.status === 'done' || Boolean(payload.id_number || payload.issue_date)
    const diskTxs = readJsonFile<TransactionFull[]>('transactions.json', [])
    const txIdx = diskTxs.findIndex(t => t.id === id)
    if (txIdx !== -1) {
      diskTxs[txIdx].status = isDone ? 'done' : 'in_progress'
      if (payload.expiry_date) diskTxs[txIdx].due_date = payload.expiry_date
      writeJsonFile('transactions.json', diskTxs)
    }

    try {
      await supabase.from('transactions').update({
        status: isDone ? 'done' : 'in_progress',
        due_date: payload.expiry_date || null,
      }).eq('id', id)
    } catch { }

    try {
      revalidatePath('/commercial/ids')
      revalidatePath('/commercial/companies')
      revalidatePath('/commercial')
      revalidatePath('/dashboard')
    } catch { }

    return { success: true, record: updatedRec }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل تعديل الهوية'
    return { success: false, error: message }
  }
}

export async function completeCompanyIDAction(
  id: string,
  payload: {
    id_number: string
    issue_date: string
    expiry_date?: string
    grade?: string
  }
) {
  return updateCompanyIDAction(id, {
    id_number: payload.id_number,
    issue_date: payload.issue_date,
    expiry_date: payload.expiry_date,
    grade: payload.grade,
    status: 'done',
  })
}

export async function deleteCompanyIDAction(id: string) {
  const denied = await requirePermission('government_ids', 'delete')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    try {
      await supabase.from('company_ids').delete().eq('id', id)
      await supabase.from('transactions').delete().eq('id', id)
    } catch (dbErr) {
      console.warn('Supabase delete company_ids error:', dbErr)
    }

    const diskIDs = readJsonFile<CompanyIDRecord[]>('company_ids.json', [])
    const filtered = diskIDs.filter(x => x.id !== id)
    writeJsonFile('company_ids.json', filtered)

    const diskTxs = readJsonFile<TransactionFull[]>('transactions.json', [])
    const filteredTxs = diskTxs.filter(x => x.id !== id)
    writeJsonFile('transactions.json', filteredTxs)

    try {
      revalidatePath('/commercial/ids')
      revalidatePath('/commercial/companies')
      revalidatePath('/commercial')
      revalidatePath('/dashboard')
    } catch { }

    return { success: true }
  } catch {
    const diskIDs = readJsonFile<CompanyIDRecord[]>('company_ids.json', [])
    const filtered = diskIDs.filter(x => x.id !== id)
    writeJsonFile('company_ids.json', filtered)

    const diskTxs = readJsonFile<TransactionFull[]>('transactions.json', [])
    const filteredTxs = diskTxs.filter(x => x.id !== id)
    writeJsonFile('transactions.json', filteredTxs)
    return { success: true }
  }
}
