'use server'

import { dbWrite, rethrowDbError } from '@/lib/data/db-guard'
import { requireRecordAccess } from '@/lib/auth/record-access'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { logTimelineEvent } from '@/lib/data/timeline'
import { listCompanies } from '@/lib/data/companies'
import type { TaxAssessment } from '@/types/database'
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

export interface CreateTaxAssessmentPayload {
  company_id: string
  company_name?: string
  year: number
  tax_branch?: string
  tax_file_number?: string
  contracts_info?: string
  contracts_amount?: number
  imports_info?: string
  imports_amount?: number
  lawyer_id?: string
  assigned_lawyer_name?: string
  tx_start_date?: string
  status?: 'in_progress' | 'auditing' | 'assessed' | 'tax_cleared'
  tax_amount_assessed?: number
  receipt_number?: string
  clearance_letter_no?: string
  clearance_date?: string
  notes?: string
}

export async function getTaxAssessmentsAction(companyId?: string): Promise<{ success: boolean; data?: TaxAssessment[]; error?: string }> {
  const accessDenied = await requirePermission('companies', 'view')
  if (accessDenied) return accessDenied

  try {
    const allCompanies = await listCompanies()
    const compMap = new Map<string, string>(allCompanies.map(c => [c.id, c.name]))
    let dbItems: TaxAssessment[] = []
    try {
      const supabase = await createClient()
      let q = supabase.from('tax_assessments').select('*, companies(name)').order('year', { ascending: false })
      if (companyId) q = q.eq('company_id', companyId)
      const { data, error } = await q
      if (!error && data) {
        dbItems = (data as Array<TaxAssessment & { companies?: { name?: string } | null }>).map(d => ({
          ...d,
          company_name: d.companies?.name || compMap.get(d.company_id) || null,
        }))
      }
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    let list = dbItems
      .map(item => ({
        ...item,
        company_name: compMap.get(item.company_id) || item.company_name || null,
      }))
      .filter(item => {
        if (!item.company_id) return false
        // Must belong to a valid registered company in companies list or have a confirmed valid company_name
        return Boolean(compMap.has(item.company_id) || item.company_name)
      })
      .sort((a, b) => b.year - a.year)

    if (companyId) {
      list = list.filter(x => x.company_id === companyId)
    }

    return { success: true, data: list }
  } catch (err: unknown) {
    rethrowDbError(err)
    console.error('getTaxAssessmentsAction exception:', err)
    return { success: false, data: [] as TaxAssessment[], error: 'تعذّر تحميل ملفات التحاسب' }
  }
}

export async function createTaxAssessmentAction(payload: CreateTaxAssessmentPayload): Promise<{ success: boolean; data?: TaxAssessment; error?: string }> {
  if (payload.company_id) {
    const access = await requireRecordAccess('companies', payload.company_id)
    if (access) return access
  }

  const denied = await requirePermission('companies', 'create')
  if (denied) return denied

  try {
    if (!payload.company_id) {
      return { success: false, error: 'يجب اختيار الشركة أولاً' }
    }
    if (!payload.year) {
      return { success: false, error: 'سنة التحاسب الضريبي مطلوبة' }
    }
    if (!payload.lawyer_id?.trim() && !payload.assigned_lawyer_name?.trim()) {
      return { success: false, error: 'المحامي المكلّف / المسؤول مطلوب (إلزامي)' }
    }

    // منع تكرار التحاسب لنفس الشركة والسنة
    try {
      const supabase = createAdminClient()
      const { data: dbExisting } = await supabase
        .from('tax_assessments')
        .select('id, year')
        .eq('company_id', payload.company_id)
        .eq('year', Number(payload.year))
        .maybeSingle()

      if (dbExisting) {
        return {
          success: false,
          error: `يوجد تحاسب ضريبي مسجل مسبقاً في قاعدة البيانات لسنة (${payload.year}) لهذه الشركة.`,
        }
      }
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    const allCompanies = await listCompanies()
    const targetCompany = allCompanies.find(c => c.id === payload.company_id)

    const assessmentId = generateUUID()
    const createdAt = new Date().toISOString()

    const newRecord: TaxAssessment = {
      id: assessmentId,
      company_id: payload.company_id,
      company_name: targetCompany?.name || payload.company_name || null,
      year: Number(payload.year),
      tax_branch: payload.tax_branch?.trim() || null,
      tax_file_number: payload.tax_file_number?.trim() || targetCompany?.tax_no || null,
      contracts_info: payload.contracts_info?.trim() || null,
      contracts_amount: payload.contracts_amount ? Number(payload.contracts_amount) : null,
      imports_info: payload.imports_info?.trim() || null,
      imports_amount: payload.imports_amount ? Number(payload.imports_amount) : null,
      lawyer_id: payload.lawyer_id || null,
      assigned_lawyer_name: payload.assigned_lawyer_name?.trim() || null,
      tx_start_date: payload.tx_start_date || createdAt.slice(0, 10),
      status: payload.status || 'in_progress',
      tax_amount_assessed: payload.tax_amount_assessed ? Number(payload.tax_amount_assessed) : null,
      receipt_number: payload.receipt_number?.trim() || null,
      clearance_letter_no: payload.clearance_letter_no?.trim() || null,
      clearance_date: payload.clearance_date || null,
      notes: payload.notes?.trim() || null,
      created_at: createdAt,
    }

    // Try saving in Supabase
    try {
      const supabase = createAdminClient()
      await dbWrite(supabase.from('tax_assessments').insert({
        id: newRecord.id,
        company_id: newRecord.company_id,
        year: newRecord.year,
        tax_branch: newRecord.tax_branch,
        tax_file_number: newRecord.tax_file_number,
        contracts_info: newRecord.contracts_info,
        contracts_amount: newRecord.contracts_amount,
        imports_info: newRecord.imports_info,
        imports_amount: newRecord.imports_amount,
        lawyer_id: newRecord.lawyer_id,
        assigned_lawyer_name: newRecord.assigned_lawyer_name,
        tx_start_date: newRecord.tx_start_date,
        status: newRecord.status,
        tax_amount_assessed: newRecord.tax_amount_assessed,
        receipt_number: newRecord.receipt_number,
        clearance_letter_no: newRecord.clearance_letter_no,
        clearance_date: newRecord.clearance_date,
        notes: newRecord.notes,
        created_at: newRecord.created_at,
      }), 'tax_assessments')
    } catch (dbErr) {
      rethrowDbError(dbErr)
      console.warn('Supabase insert tax_assessment notice:', dbErr)
    }

    // Sync to Commercial Transactions Feed
    const txTypeStr = newRecord.status === 'tax_cleared' ? 'tax-clear' : 'tax-assess'
    const txStatus = newRecord.status === 'tax_cleared' ? 'completed' : 'in_progress'

    try {
      const supabase = createAdminClient()
      await dbWrite(supabase.from('transactions').insert({
        id: assessmentId,
        company_id: payload.company_id,
        lawyer_id: payload.lawyer_id?.trim() || null,
        type: txTypeStr,
        status: txStatus,
        priority: 'medium',
        tx_date: createdAt.slice(0, 10),
        due_date: newRecord.clearance_date || null,
        description: payload.notes?.trim() || `تحاسب ضريبي لسنة ${newRecord.year}`,
        created_at: createdAt,
      }), 'transactions')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    // Log Timeline Event for real companies only
    try {
      if (payload.company_id) {
        await logTimelineEvent({
          company_id: payload.company_id,
          event_type: 'tax_assessment_started',
          title: `بدء معاملة التحاسب الضريبي لسنة ${payload.year}`,
          description: `تم فتح ملف التحاسب الضريبي في الهيئة العامة للضرائب (${newRecord.tax_branch || 'الفرع المختص'}) بمتابعة المحامي ${newRecord.assigned_lawyer_name || 'المعين'}.`,
          related_link: '/commercial/tax-assessment',
        })
      }
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    try {
      revalidatePath('/commercial/tax-assessment')
      revalidatePath('/commercial')
      revalidatePath(`/commercial/companies/${payload.company_id}`)
      revalidatePath('/dashboard')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    return { success: true, data: newRecord }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل إضافة التحاسب الضريبي'
    return { success: false, error: msg }
  }
}

export async function updateTaxAssessmentAction(
  id: string,
  payload: Partial<CreateTaxAssessmentPayload>
): Promise<{ success: boolean; data?: TaxAssessment; error?: string }> {
  const rowDenied = await requireRecordAccess('tax_assessments', id)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('companies', 'edit')
  if (denied) return denied

  try {
    // السجل الحالي من قاعدة البيانات (كان يُبحث عنه في ملف مؤقت فارغ فيفشل كل تعديل)
    const { data: currentRow } = await createAdminClient().from('tax_assessments').select('*').eq('id', id).maybeSingle()
    if (!currentRow) {
      return { success: false, error: 'سجل التحاسب الضريبي غير موجود' }
    }
    const current = currentRow as TaxAssessment
    const updatedRecord: TaxAssessment = {
      ...current,
      ...(payload.year !== undefined ? { year: Number(payload.year) } : {}),
      ...(payload.tax_branch !== undefined ? { tax_branch: payload.tax_branch.trim() || null } : {}),
      ...(payload.tax_file_number !== undefined ? { tax_file_number: payload.tax_file_number.trim() || null } : {}),
      ...(payload.contracts_info !== undefined ? { contracts_info: payload.contracts_info.trim() || null } : {}),
      ...(payload.contracts_amount !== undefined ? { contracts_amount: payload.contracts_amount ? Number(payload.contracts_amount) : null } : {}),
      ...(payload.imports_info !== undefined ? { imports_info: payload.imports_info.trim() || null } : {}),
      ...(payload.imports_amount !== undefined ? { imports_amount: payload.imports_amount ? Number(payload.imports_amount) : null } : {}),
      ...(payload.lawyer_id !== undefined ? { lawyer_id: payload.lawyer_id || null } : {}),
      ...(payload.assigned_lawyer_name !== undefined ? { assigned_lawyer_name: payload.assigned_lawyer_name.trim() || null } : {}),
      ...(payload.tx_start_date !== undefined ? { tx_start_date: payload.tx_start_date || null } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.tax_amount_assessed !== undefined ? { tax_amount_assessed: payload.tax_amount_assessed ? Number(payload.tax_amount_assessed) : null } : {}),
      ...(payload.receipt_number !== undefined ? { receipt_number: payload.receipt_number.trim() || null } : {}),
      ...(payload.clearance_letter_no !== undefined ? { clearance_letter_no: payload.clearance_letter_no.trim() || null } : {}),
      ...(payload.clearance_date !== undefined ? { clearance_date: payload.clearance_date || null } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes.trim() || null } : {}),
    }

    // الحفظ — الحقول المعدّلة فقط (لا نعيد كتابة id/created_at أو حقول للعرض)
    const { id: _id, created_at: _c, company_name: _n, ...changes } = updatedRecord as TaxAssessment & { company_name?: string | null }
    void _id; void _c; void _n
    await dbWrite(createAdminClient().from('tax_assessments').update(changes).eq('id', id), 'tax_assessments')

    // Update corresponding transaction in transactions.json
    const isCleared = updatedRecord.status === 'tax_cleared'

    try {
      const supabase = createAdminClient()
      await dbWrite(supabase.from('transactions').update({
        status: isCleared ? 'completed' : 'in_progress',
        type: isCleared ? 'tax-clear' : 'tax-assess',
        due_date: updatedRecord.clearance_date || null,
      }).eq('id', id), 'transactions')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    if (payload.status === 'tax_cleared' && current.status !== 'tax_cleared') {
      await logTimelineEvent({
        company_id: current.company_id,
        event_type: 'tax_clearance_issued',
        title: `إصدار براءة الذمة الضريبية لسنة ${updatedRecord.year}`,
        description: `تم إكمال التحاسب الضريبي واستلام كتاب براءة الذمة${updatedRecord.clearance_letter_no ? ` برقم ${updatedRecord.clearance_letter_no}` : ''}.`,
        related_link: '/commercial/tax-assessment',
      })
    }

    try {
      revalidatePath('/commercial/tax-assessment')
      revalidatePath('/commercial')
      revalidatePath(`/commercial/companies/${current.company_id}`)
      revalidatePath('/dashboard')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    return { success: true, data: updatedRecord }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل تعديل التحاسب الضريبي'
    return { success: false, error: msg }
  }
}

export async function deleteTaxAssessmentAction(id: string): Promise<{ success: boolean; error?: string }> {
  const rowDenied = await requireRecordAccess('tax_assessments', id)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('companies', 'delete')
  if (denied) return denied

  try {
    try {
      const supabase = createAdminClient()
      await dbWrite(supabase.from('tax_assessments').delete().eq('id', id), 'tax_assessments')
      await dbWrite(supabase.from('transactions').delete().eq('id', id), 'transactions')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    try {
      revalidatePath('/commercial/tax-assessment')
      revalidatePath('/commercial')
    } catch (dbErr) {
    rethrowDbError(dbErr)}
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل حذف سجل التحاسب الضريبي'
    return { success: false, error: msg }
  }
}
