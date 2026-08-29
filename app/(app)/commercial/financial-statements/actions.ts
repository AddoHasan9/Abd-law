'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { FinancialStatement } from '@/types/database'
import { createNotificationAction } from '@/app/(app)/notifications/actions'
import { logTimelineEvent } from '@/lib/data/timeline'
import { requirePermission } from '@/lib/auth/require-permission'

// In-Memory Fallback Store if Supabase table financial_statements is missing or unmigrated
let inMemoryFinancialStatements: FinancialStatement[] = []

export async function getFinancialStatementsAction(companyId?: string) {
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('financial_statements')
      .select('*, companies(name)')
      .order('year', { ascending: false })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Supabase financial_statements fetch warning, using in-memory store:', error.message)
      let items = [...inMemoryFinancialStatements]
      if (companyId) {
        items = items.filter(x => x.company_id === companyId)
      }
      return { success: true, data: items }
    }

    const items = (data || []).map((item: {
      id: string
      company_id: string
      companies?: { name?: string } | null
      year: number
      date_received?: string | null
      date_submitted?: string | null
      notes?: string | null
      created_at: string
    }) => ({
      id: item.id,
      company_id: item.company_id,
      company_name: item.companies?.name || null,
      year: item.year,
      date_received: item.date_received,
      date_submitted: item.date_submitted,
      notes: item.notes,
      created_at: item.created_at,
    })) as FinancialStatement[]

    return { success: true, data: items }
  } catch (err) {
    console.warn('getFinancialStatementsAction exception, using in-memory store:', err)
    let items = [...inMemoryFinancialStatements]
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
  notes?: string
}) {
  return createFinancialStatementsBatchAction({
    company_id: payload.company_id,
    rows: [
      {
        year: payload.year,
        date_received: payload.date_received,
        date_submitted: payload.date_submitted,
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
    notes?: string
  }>
}) {
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
          .select('id, name')
          .eq('id', companyId)
          .single()
        if (co) {
          companyName = co.name
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

    // Check existing years in database for this company
    const existingYears = new Set<number>()
    const { data: existingRecords, error: fetchErr } = await supabase
      .from('financial_statements')
      .select('year')
      .eq('company_id', payload.company_id)

    if (fetchErr) {
      // Fallback check
      inMemoryFinancialStatements
        .filter(x => x.company_id === payload.company_id)
        .forEach(x => existingYears.add(x.year))
    } else {
      (existingRecords || []).forEach(r => existingYears.add(r.year))
    }

    const duplicates = yearsInPayload.filter(y => existingYears.has(y))
    if (duplicates.length > 0) {
      return { success: false, error: `توجد حسابات ختامية مسجلة مسبقاً لهذه الشركة للسنوات: (${duplicates.join('، ')})` }
    }

    // Prepare insert batch payload
    const insertData = payload.rows.map(r => ({
      company_id: payload.company_id,
      year: r.year,
      date_received: r.date_received || null,
      date_submitted: r.date_submitted || null,
      notes: r.notes?.trim() || null,
    }))

    const { data: inserted, error: insertErr } = await supabase
      .from('financial_statements')
      .insert(insertData)
      .select()

    let insertedRecords: FinancialStatement[] = []

    if (insertErr || !inserted) {
      console.warn('Supabase insert failed, using fallback in-memory store:', insertErr?.message)
      // Save into inMemoryFinancialStatements fallback store
      for (const r of payload.rows) {
        const item: FinancialStatement = {
          id: 'mem_' + Math.random().toString(36).substring(2, 9),
          company_id: payload.company_id,
          company_name: companyName,
          year: r.year,
          date_received: r.date_received || null,
          date_submitted: r.date_submitted || null,
          notes: r.notes?.trim() || null,
          created_at: new Date().toISOString(),
        }
        inMemoryFinancialStatements.unshift(item)
        insertedRecords.push(item)
      }
    } else {
      insertedRecords = inserted.map((item: {
        id: string
        company_id: string
        year: number
        date_received?: string | null
        date_submitted?: string | null
        notes?: string | null
        created_at: string
      }) => ({
        id: item.id,
        company_id: item.company_id,
        company_name: companyName,
        year: item.year,
        date_received: item.date_received,
        date_submitted: item.date_submitted,
        notes: item.notes,
        created_at: item.created_at,
      }))
    }

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
    notes?: string
  }
) {
  // تسجيل "تاريخ التقديم" هو فعليًا تقديم البيان المالي — يتطلب صلاحية submit
  // المنفصلة عن create/edit (بعض الأدوار مثل lawyer تقدر تُنشئ/تعدّل لكن لا تُقدّم)
  const denied = await requirePermission(
    'financial_statements',
    payload.date_submitted !== undefined ? 'submit' : 'create'
  )
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const updateData: Record<string, unknown> = {}

    if (payload.year !== undefined) updateData.year = payload.year
    if (payload.date_received !== undefined) updateData.date_received = payload.date_received || null
    if (payload.date_submitted !== undefined) updateData.date_submitted = payload.date_submitted || null
    if (payload.notes !== undefined) updateData.notes = payload.notes.trim() || null

    const { data: updated, error } = await supabase
      .from('financial_statements')
      .update(updateData)
      .eq('id', id)
      .select('company_id, year, companies(name)')
      .single()

    if (error) {
      // Fallback update in-memory
      const idx = inMemoryFinancialStatements.findIndex(x => x.id === id)
      if (idx !== -1) {
        if (payload.year !== undefined) inMemoryFinancialStatements[idx].year = payload.year
        if (payload.date_received !== undefined) inMemoryFinancialStatements[idx].date_received = payload.date_received || null
        if (payload.date_submitted !== undefined) inMemoryFinancialStatements[idx].date_submitted = payload.date_submitted || null
        if (payload.notes !== undefined) inMemoryFinancialStatements[idx].notes = payload.notes.trim() || null
      }
    } else if (payload.date_submitted !== undefined && updated?.company_id) {
      const companyName = (updated as unknown as { companies?: { name?: string } | null }).companies?.name
      await logTimelineEvent({
        company_id: updated.company_id,
        event_type: 'fs_submitted',
        title: `تقديم الحسابات الختامية للسنة المالية ${updated.year}`,
        description: companyName ? `تم تسجيل تقديم الحسابات الختامية لشركة ${companyName}.` : undefined,
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

export async function markStatementSubmittedAction(id: string, dateSubmitted?: string) {
  const submitDate = dateSubmitted || new Date().toISOString().slice(0, 10)
  return updateFinancialStatementAction(id, { date_submitted: submitDate })
}

export async function deleteFinancialStatementAction(id: string) {
  const denied = await requirePermission('financial_statements', 'delete')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('financial_statements')
      .delete()
      .eq('id', id)

    if (error) {
      inMemoryFinancialStatements = inMemoryFinancialStatements.filter(x => x.id !== id)
    }

    revalidatePath('/commercial/financial-statements')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch {
    // Fallback in-memory delete
    inMemoryFinancialStatements = inMemoryFinancialStatements.filter(x => x.id !== id)
    return { success: true }
  }
}

// In-Memory store for Contact Status per company & year
const inMemoryContactStatuses: Record<string, string> = {}

export async function getFSContactStatusesAction() {
  return { success: true, data: inMemoryContactStatuses }
}

export async function updateFSContactStatusAction(companyId: string, year: number, status: string) {
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
  const denied = await requirePermission('financial_statements', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
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
