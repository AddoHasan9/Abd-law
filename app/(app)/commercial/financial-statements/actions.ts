'use server'

import { readAuthorizedJsonFile } from '@/lib/auth/scoped-store'
import { requireRecordAccess } from '@/lib/auth/record-access'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { FinancialStatement } from '@/types/database'
import { createNotificationAction } from '@/app/(app)/notifications/actions'
import { logTimelineEvent } from '@/lib/data/timeline'
import { requirePermission } from '@/lib/auth/require-permission'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'

export async function getFinancialStatementsAction(companyId?: string) {
  const accessDenied = await requirePermission('financial_statements', 'view')
  if (accessDenied) return { success: false, data: [], error: accessDenied.error }

  const diskFS = await readAuthorizedJsonFile<FinancialStatement[]>('financial_statements.json', [])
  try {
    const supabase = await createClient()
    let query = supabase
      .from('financial_statements')
      .select('*, companies(name)')
      .order('year', { ascending: false })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    const dbItems: FinancialStatement[] = (!error && data) ? (data || []).map((item: {
      id: string
      company_id: string
      companies?: { name?: string } | null
      year: number
      date_received?: string | null
      date_submitted?: string | null
      date_submitted_tax?: string | null
      date_submitted_registrar?: string | null
      tax_submitted?: boolean
      registrar_submitted?: boolean
      notes?: string | null
      created_at: string
    }) => ({
      id: item.id,
      company_id: item.company_id,
      company_name: item.companies?.name || null,
      year: item.year,
      date_received: item.date_received,
      date_submitted: item.date_submitted || item.date_submitted_registrar,
      date_submitted_tax: item.date_submitted_tax,
      date_submitted_registrar: item.date_submitted_registrar || item.date_submitted,
      tax_submitted: item.tax_submitted || Boolean(item.date_submitted_tax),
      registrar_submitted: item.registrar_submitted || Boolean(item.date_submitted_registrar || item.date_submitted),
      notes: item.notes,
      created_at: item.created_at,
    })) : []

    const map = new Map<string, FinancialStatement>()
    diskFS.forEach(f => {
      if (!companyId || f.company_id === companyId) {
        map.set(f.id, f)
      }
    })
    dbItems.forEach(f => {
      const existing = map.get(f.id)
      map.set(f.id, {
        ...existing,
        ...f,
        date_submitted_tax: f.date_submitted_tax || existing?.date_submitted_tax,
        date_submitted_registrar: f.date_submitted_registrar || existing?.date_submitted_registrar || f.date_submitted,
      })
    })

    const result = Array.from(map.values()).sort((a, b) => b.year - a.year)
    return { success: true, data: result }
  } catch (err) {
    console.warn('getFinancialStatementsAction exception, using disk store:', err)
    let items = [...diskFS]
    if (companyId) {
      items = items.filter(x => x.company_id === companyId)
    }
    return { success: true, data: items }
  }
}

export async function createFinancialStatementAction(payload: {
  company_id: string
  year: number
  date_received?: string
  date_submitted?: string
  date_submitted_tax?: string
  date_submitted_registrar?: string
  notes?: string
}) {
  return createFinancialStatementsBatchAction({
    company_id: payload.company_id,
    rows: [
      {
        year: payload.year,
        date_received: payload.date_received,
        date_submitted: payload.date_submitted,
        date_submitted_tax: payload.date_submitted_tax,
        date_submitted_registrar: payload.date_submitted_registrar,
        notes: payload.notes,
      },
    ],
  })
}

export async function createFinancialStatementsBatchAction(payload: {
  company_id: string
  company_name?: string
  rows: Array<{
    year: number
    date_received?: string
    date_submitted?: string
    date_submitted_tax?: string
    date_submitted_registrar?: string
    notes?: string
  }>
}) {
  if (payload.company_id) {
    const access = await requireRecordAccess('companies', payload.company_id)
    if (access) return access
  }

  const denied = await requirePermission('financial_statements', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    if (!payload.company_id && !payload.company_name) {
      return { success: false, error: 'يرجى كتابة أو اختيار اسم الشركة' }
    }

    if (!payload.rows || payload.rows.length === 0) {
      return { success: false, error: 'يرجى إضافة سنة مالية واحدة على الأقل' }
    }

    // Check for duplicate years inside the request payload
    const yearsInPayload = payload.rows.map(r => r.year)
    const uniqueYears = new Set(yearsInPayload)
    if (uniqueYears.size !== yearsInPayload.length) {
      return { success: false, error: 'لا يمكن تكرار نفس السنة المالية لنفس الشركة' }
    }

    // Fetch or resolve company
    let companyId = payload.company_id
    let companyName = payload.company_name || ''

    if (companyId) {
      try {
        const { data: co } = await supabase
          .from('companies')
          .select('id, name, status, cert_date, cert_no, deposit_released')
          .eq('id', companyId)
          .single()
        if (co) {
          companyName = co.name
          const isEstablished = co.status === 'established' || Boolean(co.deposit_released) || Boolean(co.cert_date) || Boolean(co.cert_no)
          if (!isEstablished) {
            return { success: false, error: 'ممنوع تسجيل أو تكليف الحسابات الختامية للشركات قيد التأسيس.' }
          }
        }
      } catch {
        // Custom ID or non-UUID
      }
    }

    // If company is not in DB, attempt to create it in companies table or fallback
    if (!companyName && payload.company_id) {
      companyName = payload.company_id
    }

    // Check if custom company name needs an auto-created record in companies table
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)
    if (!isValidUUID && companyName) {
      try {
        const { data: newCo } = await supabase
          .from('companies')
          .insert({ name: companyName, capital: 0, external: true })
          .select('id')
          .single()
        if (newCo) {
          companyId = newCo.id
        }
      } catch {
        // Fallback store will use custom ID
      }
    }

    // Check existing years in database or disk for this company
    const existingYears = new Set<number>()
    const diskFS = readJsonFile<FinancialStatement[]>('financial_statements.json', [])
    diskFS
      .filter(x => x.company_id === payload.company_id)
      .forEach(x => existingYears.add(x.year))

    try {
      const { data: existingRecords } = await supabase
        .from('financial_statements')
        .select('year')
        .eq('company_id', payload.company_id)

      ;(existingRecords || []).forEach(r => existingYears.add(r.year))
    } catch {}

    const duplicates = yearsInPayload.filter(y => existingYears.has(y))
    if (duplicates.length > 0) {
      return { success: false, error: `توجد حسابات ختامية مسجلة مسبقاً لهذه الشركة للسنوات: (${duplicates.join('، ')})` }
    }

    // Prepare insert batch payload
    const insertData = payload.rows.map(r => ({
      company_id: payload.company_id,
      year: r.year,
      date_received: r.date_received || null,
      date_submitted: r.date_submitted || r.date_submitted_registrar || null,
      date_submitted_tax: r.date_submitted_tax || null,
      date_submitted_registrar: r.date_submitted_registrar || r.date_submitted || null,
      notes: r.notes?.trim() || null,
    }))

    let insertedRecords: FinancialStatement[] = []
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('financial_statements')
        .insert(insertData)
        .select()

      if (!insertErr && inserted) {
        insertedRecords = inserted.map((item: {
          id: string
          company_id: string
          year: number
          date_received?: string | null
          date_submitted?: string | null
          date_submitted_tax?: string | null
          date_submitted_registrar?: string | null
          notes?: string | null
          created_at: string
        }) => ({
          id: item.id,
          company_id: item.company_id,
          company_name: companyName,
          year: item.year,
          date_received: item.date_received,
          date_submitted: item.date_submitted || item.date_submitted_registrar,
          date_submitted_tax: item.date_submitted_tax,
          date_submitted_registrar: item.date_submitted_registrar || item.date_submitted,
          tax_submitted: Boolean(item.date_submitted_tax),
          registrar_submitted: Boolean(item.date_submitted_registrar || item.date_submitted),
          notes: item.notes,
          created_at: item.created_at,
        }))
      }
    } catch {}

    if (insertedRecords.length === 0) {
      for (const r of payload.rows) {
        const item: FinancialStatement = {
          id: 'fs_' + Math.random().toString(36).substring(2, 9),
          company_id: payload.company_id,
          company_name: companyName,
          year: r.year,
          date_received: r.date_received || null,
          date_submitted: r.date_submitted || r.date_submitted_registrar || null,
          date_submitted_tax: r.date_submitted_tax || null,
          date_submitted_registrar: r.date_submitted_registrar || r.date_submitted || null,
          tax_submitted: Boolean(r.date_submitted_tax),
          registrar_submitted: Boolean(r.date_submitted_registrar || r.date_submitted),
          notes: r.notes?.trim() || null,
          created_at: new Date().toISOString(),
        }
        insertedRecords.push(item)
      }
    }

    // Persist to disk store
    const currentDisk = readJsonFile<FinancialStatement[]>('financial_statements.json', [])
    insertedRecords.forEach(rec => currentDisk.unshift(rec))
    writeJsonFile('financial_statements.json', currentDisk)

    // Send summary notification for created batch
    await createNotificationAction({
      title: `إضافة حسابات ختامية (${insertedRecords.length} سنوات): ${companyName || 'شركة'}`,
      description: `تم إضافة سنوات الميزانية (${yearsInPayload.sort().join('، ')}) بنجاح.`,
      type: 'general',
      related_company_id: payload.company_id,
      link_url: '/commercial/financial-statements',
    })

    revalidatePath('/commercial/financial-statements')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true, insertedCount: insertedRecords.length }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل إضافة دفعة الحسابات الختامية'
    console.error('createFinancialStatementsBatchAction error:', err)
    return { success: false, error: message }
  }
}

export async function updateFinancialStatementAction(
  id: string,
  payload: {
    year?: number
    date_received?: string
    date_submitted?: string
    date_submitted_tax?: string
    date_submitted_registrar?: string
    tax_submitted?: boolean
    registrar_submitted?: boolean
    notes?: string
  }
) {
  const rowDenied = await requireRecordAccess('financial_statements', id)
  if (rowDenied) return rowDenied

  const denied = await requirePermission(
    'financial_statements',
    (payload.date_submitted !== undefined || payload.date_submitted_tax !== undefined || payload.date_submitted_registrar !== undefined) ? 'submit' : 'create'
  )
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const updateData: Record<string, unknown> = {}

    if (payload.year !== undefined) updateData.year = payload.year
    if (payload.date_received !== undefined) updateData.date_received = payload.date_received || null
    if (payload.date_submitted !== undefined) updateData.date_submitted = payload.date_submitted || null
    if (payload.date_submitted_tax !== undefined) updateData.date_submitted_tax = payload.date_submitted_tax || null
    if (payload.date_submitted_registrar !== undefined) {
      updateData.date_submitted_registrar = payload.date_submitted_registrar || null
      updateData.date_submitted = payload.date_submitted_registrar || null
    }
    if (payload.notes !== undefined) updateData.notes = payload.notes.trim() || null

    let targetCompanyId: string | null = null
    let targetYear: number | null = null
    let companyName: string | null = null

    try {
      const { data: updated, error } = await supabase
        .from('financial_statements')
        .update(updateData)
        .eq('id', id)
        .select('company_id, year, companies(name)')
        .single()

      if (!error && updated) {
        targetCompanyId = updated.company_id
        targetYear = updated.year
        companyName = (updated as unknown as { companies?: { name?: string } | null }).companies?.name || null
      }
    } catch {}

    // Update disk store
    const diskFS = readJsonFile<FinancialStatement[]>('financial_statements.json', [])
    const idx = diskFS.findIndex(x => x.id === id)
    if (idx !== -1) {
      if (payload.year !== undefined) diskFS[idx].year = payload.year
      if (payload.date_received !== undefined) diskFS[idx].date_received = payload.date_received || null
      if (payload.date_submitted !== undefined) diskFS[idx].date_submitted = payload.date_submitted || null
      if (payload.date_submitted_tax !== undefined) {
        diskFS[idx].date_submitted_tax = payload.date_submitted_tax || null
        diskFS[idx].tax_submitted = Boolean(payload.date_submitted_tax)
      }
      if (payload.date_submitted_registrar !== undefined) {
        diskFS[idx].date_submitted_registrar = payload.date_submitted_registrar || null
        diskFS[idx].date_submitted = payload.date_submitted_registrar || null
        diskFS[idx].registrar_submitted = Boolean(payload.date_submitted_registrar)
      }
      if (payload.tax_submitted !== undefined) diskFS[idx].tax_submitted = payload.tax_submitted
      if (payload.registrar_submitted !== undefined) diskFS[idx].registrar_submitted = payload.registrar_submitted
      if (payload.notes !== undefined) diskFS[idx].notes = payload.notes.trim() || null
      writeJsonFile('financial_statements.json', diskFS)

      targetCompanyId = targetCompanyId || diskFS[idx].company_id
      targetYear = targetYear || diskFS[idx].year
      companyName = companyName || diskFS[idx].company_name || null
    }

    if (targetCompanyId && (payload.date_submitted_tax || payload.date_submitted_registrar || payload.date_submitted)) {
      const parts: string[] = []
      if (payload.date_submitted_tax) parts.push(`الهيئة العامة للضرائب (${payload.date_submitted_tax})`)
      if (payload.date_submitted_registrar || payload.date_submitted) parts.push(`مسجل الشركات (${payload.date_submitted_registrar || payload.date_submitted})`)

      await logTimelineEvent({
        company_id: targetCompanyId,
        event_type: 'fs_submitted',
        title: `تسليم الحسابات الختامية لسنة ${targetYear || ''}`,
        description: `تم تسليم الحسابات إلى: ${parts.join(' و ')} ${companyName ? `لشركة ${companyName}` : ''}.`,
        related_link: '/commercial/financial-statements',
      })
    }

    revalidatePath('/commercial/financial-statements')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل تحديث الحسابات الختامية'
    return { success: false, error: message }
  }
}

export async function markStatementTaxSubmittedAction(id: string, dateSubmitted?: string) {
  const submitDate = dateSubmitted || new Date().toISOString().slice(0, 10)
  return updateFinancialStatementAction(id, { date_submitted_tax: submitDate, tax_submitted: true })
}

export async function markStatementRegistrarSubmittedAction(id: string, dateSubmitted?: string) {
  const submitDate = dateSubmitted || new Date().toISOString().slice(0, 10)
  return updateFinancialStatementAction(id, { date_submitted_registrar: submitDate, date_submitted: submitDate, registrar_submitted: true })
}

export async function markStatementSubmittedAction(id: string, dateSubmitted?: string) {
  const submitDate = dateSubmitted || new Date().toISOString().slice(0, 10)
  return updateFinancialStatementAction(id, {
    date_submitted_registrar: submitDate,
    date_submitted_tax: submitDate,
    date_submitted: submitDate,
    tax_submitted: true,
    registrar_submitted: true,
  })
}

export async function deleteFinancialStatementAction(id: string) {
  const rowDenied = await requireRecordAccess('financial_statements', id)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('financial_statements', 'delete')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    try {
      const diskFS = readJsonFile<FinancialStatement[]>('financial_statements.json', [])
      writeJsonFile('financial_statements.json', diskFS.filter(x => x.id !== id))
    } catch {}

    revalidatePath('/commercial/financial-statements')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch {
    try {
      const diskFS = readJsonFile<FinancialStatement[]>('financial_statements.json', [])
      writeJsonFile('financial_statements.json', diskFS.filter(x => x.id !== id))
    } catch {}
    return { success: true }
  }
}

// In-Memory store for Contact Status per company & year
const inMemoryContactStatuses: Record<string, string> = {}

export async function getFSContactStatusesAction() {
  const accessDenied = await requirePermission('financial_statements', 'view')
  if (accessDenied) return { success: false, data: {}, error: accessDenied.error }

  return { success: true, data: inMemoryContactStatuses }
}

export async function updateFSContactStatusAction(companyId: string, year: number, status: string) {
  if (companyId) {
    const access = await requireRecordAccess('companies', companyId)
    if (access) return access
  }

  const accessDenied = await requirePermission('financial_statements', 'create')
  if (accessDenied) return accessDenied

  const key = `${companyId}_${year}`
  inMemoryContactStatuses[key] = status

  revalidatePath('/commercial/financial-statements')
  return { success: true }
}

export async function updateCompanyFSSettingsAction(companyId: string, payload: {
  establishment_date?: string | null
  last_completed_fs_year?: number | null
  fs_first_method?: 'standard' | 'merge_next_year' | null
  financial_statements_enabled?: boolean | null
}) {
  const rowDenied = await requireRecordAccess('companies', companyId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('financial_statements', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    // إذا كان المطلوب تكليف الحسابات الختامية، يتم التحقق من أن الشركة مكتملة التأسيس أولاً
    if (payload.financial_statements_enabled) {
      const { data: co } = await supabase
        .from('companies')
        .select('status, cert_date, cert_no, deposit_released')
        .eq('id', companyId)
        .single()

      if (co) {
        const isEstablished = co.status === 'established' || Boolean(co.deposit_released) || Boolean(co.cert_date) || Boolean(co.cert_no)
        if (!isEstablished) {
          return { success: false, error: 'ممنوع تكليف الحسابات الختامية للشركات قيد التأسيس.' }
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (payload.establishment_date !== undefined) updateData.establishment_date = payload.establishment_date || null
    if (payload.last_completed_fs_year !== undefined) updateData.last_completed_fs_year = payload.last_completed_fs_year || null
    if (payload.fs_first_method !== undefined) updateData.fs_first_method = payload.fs_first_method || null
    if (payload.financial_statements_enabled !== undefined) updateData.financial_statements_enabled = payload.financial_statements_enabled

    const { error } = await supabase.from('companies').update(updateData).eq('id', companyId)

    if (error) {
      console.error('updateCompanyFSSettingsAction error:', error.message)
      return { success: false, error: error.message }
    }

    if (payload.financial_statements_enabled) {
      await logTimelineEvent({
        company_id: companyId,
        event_type: 'fs_assigned',
        title: 'تكليف المكتب بالحسابات الختامية',
        description: 'تم تكليف المكتب بمتابعة الحسابات الختامية والميزانيات السنوية لهذه الشركة.',
        related_link: '/commercial/financial-statements',
      })
    }

    revalidatePath('/commercial/financial-statements')
    revalidatePath('/commercial/companies')
    revalidatePath(`/commercial/companies/${companyId}`)
    revalidatePath('/commercial')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل تحديث إعدادات الحسابات الختامية للشركة'
    console.error('updateCompanyFSSettingsAction exception:', err)
    return { success: false, error: message }
  }
}
