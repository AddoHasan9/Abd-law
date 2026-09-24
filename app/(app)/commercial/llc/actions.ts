'use server'

import { requireRecordAccess } from '@/lib/auth/record-access'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'
import { logTimelineEvent } from '@/lib/data/timeline'
import type { CompanyWithWorkflow, CompanyManager } from '@/types/database'
import { requirePermission } from '@/lib/auth/require-permission'

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

export interface CreateLLCTransactionPayload {
  type: string
  company_id?: string
  company_name?: string
  manager_name?: string
  tx_date?: string
  lacks?: string
  notes?: string
  fee?: number
  phone?: string
  priority?: string
  lawyer_id?: string
  capital_before?: number
  capital_after?: number
  seller_name?: string
  buyer_name?: string
}

export async function createLLCTransactionAction(payload: CreateLLCTransactionPayload) {
  if (payload.company_id) {
    const access = await requireRecordAccess('companies', payload.company_id)
    if (access) return access
  }

  const denied = await requirePermission('transactions', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    if (!payload.type?.trim()) {
      return { success: false, error: 'نوع المعاملة مطلوب (إلزامي)' }
    }

    if (!payload.lawyer_id?.trim()) {
      return { success: false, error: 'المحامي المكلّف / المسؤول مطلوب (إلزامي)' }
    }

    const compName = payload.company_name?.trim() || ''
    let targetCompanyId = payload.company_id?.trim() || ''

    if (!targetCompanyId && !compName) {
      return { success: false, error: 'يرجى اختيار شركة مسجلة أو كتابة اسم الشركة يدوياً' }
    }

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetCompanyId)
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])

    // Handle company lookup or creation if typed manually
    if ((!targetCompanyId || !isValidUUID) && compName) {
      const foundInDisk = diskCompanies.find(c => c.name.toLowerCase() === compName.toLowerCase())
      if (foundInDisk) {
        targetCompanyId = foundInDisk.id
      } else {
        try {
          const { data: matchedCo } = await supabase
            .from('companies')
            .select('id, name')
            .ilike('name', compName)
            .limit(1)
            .maybeSingle()

          if (matchedCo) {
            targetCompanyId = matchedCo.id
          } else {
            const newCompanyUUID = generateUUID()
            targetCompanyId = newCompanyUUID

            const newCoRecord = {
              id: newCompanyUUID,
              name: compName,
              kind: 'محدودة',
              capital: 0,
              external: true,
              status: 'established',
              created_at: new Date().toISOString(),
            }

            try {
              await supabase.from('companies').insert(newCoRecord)
            } catch (insErr) {
              console.warn('Company auto-insert in DB notice:', insErr)
            }

            diskCompanies.unshift(newCoRecord as unknown as CompanyWithWorkflow)
            writeJsonFile('companies.json', diskCompanies)
          }
        } catch (e) {
          console.warn('Company auto-linking lookup notice:', e)
          if (!targetCompanyId) {
            targetCompanyId = generateUUID()
          }
        }
      }
    }

    if (!targetCompanyId) {
      targetCompanyId = generateUUID()
    }

    // Save/Update Authorized Manager in company_managers strictly (AGENTS.md rule)
    if (payload.manager_name?.trim()) {
      const mgrName = payload.manager_name.trim()
      const mgrObj: CompanyManager = {
        id: generateUUID(),
        company_id: targetCompanyId,
        name: mgrName,
        active: true,
        created_at: new Date().toISOString(),
      }

      try {
        await supabase.from('company_managers').insert(mgrObj)
      } catch (mgrErr) {
        console.warn('company_managers insert notice:', mgrErr)
      }

      const diskManagers = readJsonFile<CompanyManager[]>('company_managers.json', [])
      diskManagers.unshift(mgrObj)
      writeJsonFile('company_managers.json', diskManagers)
    }

    // Prepare Transaction Object
    const txId = generateUUID()
    const txDate = payload.tx_date || new Date().toISOString().slice(0, 10)
    const priority = (payload.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent'
    const fee = payload.fee ? Number(payload.fee) : null
    const lacks = payload.lacks?.trim() || null
    const notes = payload.notes?.trim() || null
    const phone = payload.phone?.trim() || null
    const lawyerId = payload.lawyer_id?.trim() || null
    const capitalBefore = payload.capital_before !== undefined && payload.capital_before !== null ? Number(payload.capital_before) : null
    const capitalAfter = payload.capital_after !== undefined && payload.capital_after !== null ? Number(payload.capital_after) : null
    const sellerName = payload.seller_name?.trim() || null
    const buyerName = payload.buyer_name?.trim() || null

    let finalCoName = compName
    if (!finalCoName && targetCompanyId) {
      const co = diskCompanies.find(c => c.id === targetCompanyId)
      if (co) finalCoName = co.name
    }

    const txRecord = {
      id: txId,
      type: payload.type,
      company_id: targetCompanyId,
      status: 'new' as const,
      priority,
      tx_date: txDate,
      description: notes || `معاملة محدودة: ${payload.type}`,
      lacks,
      fee,
      phone,
      lawyer_id: lawyerId,
      capital_before: capitalBefore,
      capital_after: capitalAfter,
      seller_name: sellerName,
      buyer_name: buyerName,
      created_at: new Date().toISOString(),
    }

    // Save to Supabase DB
    try {
      await supabase.from('transactions').insert(txRecord)
    } catch (dbErr) {
      console.warn('Supabase insert transaction error:', dbErr)
    }

    // Save to Local Disk Store for 100% Reliability
    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    diskTxs.unshift({
      ...txRecord,
      companies: {
        id: targetCompanyId,
        name: finalCoName,
        manager: payload.manager_name || null,
      },
    })
    writeJsonFile('transactions.json', diskTxs)

    // Log Timeline Event
    try {
      await logTimelineEvent({
        company_id: targetCompanyId,
        event_type: 'tx_created',
        title: `إنشاء معاملة جديدة بقسم المحدودة: ${payload.type}`,
        description: lacks ? `النواقص: ${lacks}` : undefined,
        related_link: '/commercial/llc',
      })
    } catch {}

    revalidatePath('/commercial/llc')
    revalidatePath('/commercial')
    revalidatePath('/commercial/companies')
    revalidatePath(`/commercial/companies/${targetCompanyId}`)
    revalidatePath('/dashboard')

    return { success: true, txId }
  } catch (err: unknown) {
    console.error('createLLCTransactionAction exception:', err)
    const msg = err instanceof Error ? err.message : 'فشل إنشاء المعاملة'
    return { success: false, error: msg }
  }
}

export interface UpdateLLCTransactionPayload {
  id: string
  type?: string
  company_id?: string
  company_name?: string
  manager_name?: string
  tx_date?: string
  status?: string
  lacks?: string
  notes?: string
  fee?: number
  phone?: string
  priority?: string
  lawyer_id?: string
  capital_before?: number | null
  capital_after?: number | null
  seller_name?: string | null
  buyer_name?: string | null
}

export async function updateLLCTransactionAction(payload: UpdateLLCTransactionPayload) {
  if (payload.id) {
    const access = await requireRecordAccess('transactions', payload.id)
    if (access) return access
  }

  const denied = await requirePermission('transactions', 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const txId = payload.id
    if (!txId) return { success: false, error: 'معرف المعاملة مفقود' }

    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    const index = diskTxs.findIndex(t => t.id === txId)

    const updates: Record<string, unknown> = {}
    if (payload.type !== undefined) updates.type = payload.type
    if (payload.status !== undefined) updates.status = payload.status
    if (payload.priority !== undefined) updates.priority = payload.priority
    if (payload.tx_date !== undefined) updates.tx_date = payload.tx_date
    if (payload.lacks !== undefined) updates.lacks = payload.lacks
    if (payload.notes !== undefined) updates.description = payload.notes
    if (payload.fee !== undefined) updates.fee = payload.fee
    if (payload.phone !== undefined) updates.phone = payload.phone
    if (payload.lawyer_id !== undefined) updates.lawyer_id = payload.lawyer_id
    if (payload.capital_before !== undefined) updates.capital_before = payload.capital_before
    if (payload.capital_after !== undefined) updates.capital_after = payload.capital_after
    if (payload.seller_name !== undefined) updates.seller_name = payload.seller_name
    if (payload.buyer_name !== undefined) updates.buyer_name = payload.buyer_name

    // DB update
    try {
      await supabase.from('transactions').update(updates).eq('id', txId)
    } catch (dbErr) {
      console.warn('Supabase update transaction error:', dbErr)
    }

    // Disk update
    if (index !== -1) {
      const existing = diskTxs[index]
      const existingCompany = (existing.companies || {}) as Record<string, unknown>
      
      if (payload.company_name) {
        existingCompany.name = payload.company_name
      }
      if (payload.manager_name) {
        existingCompany.manager = payload.manager_name
      }

      diskTxs[index] = {
        ...existing,
        ...updates,
        companies: existingCompany,
      }
      writeJsonFile('transactions.json', diskTxs)
    }

    // Update manager if provided
    if (payload.manager_name?.trim() && payload.company_id) {
      const mgrName = payload.manager_name.trim()
      const mgrObj: CompanyManager = {
        id: generateUUID(),
        company_id: payload.company_id,
        name: mgrName,
        active: true,
        created_at: new Date().toISOString(),
      }
      try {
        await supabase.from('company_managers').insert(mgrObj)
      } catch {}
      const diskManagers = readJsonFile<CompanyManager[]>('company_managers.json', [])
      diskManagers.unshift(mgrObj)
      writeJsonFile('company_managers.json', diskManagers)
    }

    revalidatePath('/commercial/llc')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    console.error('updateLLCTransactionAction exception:', err)
    const msg = err instanceof Error ? err.message : 'فشل تعديل المعاملة'
    return { success: false, error: msg }
  }
}
