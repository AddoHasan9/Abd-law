'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'
import { logTimelineEvent } from '@/lib/data/timeline'
import { WORKFLOW } from '@/lib/constants'
import type { CompanyWithWorkflow, CompanyManager, CompanyShareholder, CompanyIDRecord, WorkflowStep } from '@/types/database'
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

export interface AddEstablishedCompanyPayload {
  name: string
  kind?: string
  capital?: number
  lawyer_id?: string
  manager: string
  manager_phone?: string
  cert_no?: string
  cert_date?: string
  registrar_no?: string
  tax_no?: string
  address?: string
  phone?: string
  shareholders: Array<{
    name: string
    share_percentage?: number
    share_amount?: number
    phone?: string
  }>
  fs_years: number[]
  ids: Array<{
    id_type: 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'
    id_number?: string
    issue_date?: string
    expiry_date?: string
    grade?: string
  }>
}

export async function createEstablishedCompanyAction(payload: AddEstablishedCompanyPayload) {
  const denied = await requirePermission('companies', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    if (!payload.name?.trim()) {
      return { success: false, error: 'اسم الشركة مطلوب ولا يمكن تركه فارغاً' }
    }

    if (!payload.lawyer_id?.trim()) {
      return { success: false, error: 'المحامي المكلّف / المسؤول مطلوب (إلزامي)' }
    }

    const companyId = generateUUID()
    const name = payload.name.trim()

    // منع تكرار الشركات بالاسم نفسه
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    const deletedCompanyIds = new Set(readJsonFile<string[]>('deleted_company_ids.json', []))
    const existingActive = diskCompanies.find(
      c => !deletedCompanyIds.has(c.id) && c.name?.trim().toLowerCase() === name.toLowerCase()
    )
    if (existingActive) {
      return {
        success: false,
        error: `توجد شركة مسجلة مسبقاً بنفس الاسم «${name}». يرجى استخدام اسم مختلف أو تعديل الشركة الحالية.`,
      }
    }
    const kind = payload.kind || (payload.shareholders.length > 1 ? 'محدودة' : 'فردية')
    const capital = Number(payload.capital) || 0
    const managerName = payload.manager?.trim() || null
    const certNo = payload.cert_no?.trim() || null
    const certDate = payload.cert_date || null
    const registrarNo = payload.registrar_no?.trim() || null
    const taxNo = payload.tax_no?.trim() || null
    const address = payload.address?.trim() || null
    const phone = payload.phone?.trim() || null
    const createdAt = new Date().toISOString()
    const latestFsYear = payload.fs_years.length > 0 ? Math.max(...payload.fs_years) : null

    // 1. Insert Company into Supabase
    // Note: Do NOT write to companies.manager column (as per AGENTS.md rule)
    const companyDataToInsert = {
      id: companyId,
      name,
      kind,
      capital,
      cert_no: certNo,
      cert_date: certDate,
      registrar_no: registrarNo,
      tax_no: taxNo,
      address,
      phone,
      status: 'established',
      external: false,
      deposit_released: true,
      deposit_released_at: createdAt.slice(0, 10),
      financial_statements_enabled: payload.fs_years.length > 0,
      last_completed_fs_year: latestFsYear,
      establishment_date: certDate || createdAt.slice(0, 10),
    }

    try {
      await supabase.from('companies').insert(companyDataToInsert)
    } catch (coDbErr) {
      console.warn('Supabase insert company notice:', coDbErr)
    }

    // 2. Insert Authorized Manager strictly in company_managers table
    let managerRecord: CompanyManager | null = null
    if (managerName) {
      managerRecord = {
        id: generateUUID(),
        company_id: companyId,
        name: managerName,
        phone: payload.manager_phone?.trim() || null,
        active: true,
        created_at: createdAt,
      }
      try {
        await supabase.from('company_managers').insert(managerRecord)
      } catch (mgrDbErr) {
        console.warn('Supabase insert company_manager notice:', mgrDbErr)
      }

      const diskManagers = readJsonFile<CompanyManager[]>('company_managers.json', [])
      diskManagers.unshift(managerRecord)
      writeJsonFile('company_managers.json', diskManagers)
    }

    // 3. Insert Shareholders in company_shareholders table
    const shareholderRecords: CompanyShareholder[] = []
    if (payload.shareholders && payload.shareholders.length > 0) {
      for (const sh of payload.shareholders) {
        if (!sh.name.trim()) continue
        const shRec: CompanyShareholder = {
          id: generateUUID(),
          company_id: companyId,
          name: sh.name.trim(),
          share_percentage: sh.share_percentage !== undefined ? Number(sh.share_percentage) : null,
          share_amount: sh.share_amount !== undefined ? Number(sh.share_amount) : null,
          notes: sh.phone ? `هاتف: ${sh.phone}` : null,
          created_at: createdAt,
        }
        shareholderRecords.push(shRec)
      }

      if (shareholderRecords.length > 0) {
        try {
          await supabase.from('company_shareholders').insert(shareholderRecords)
        } catch (shDbErr) {
          console.warn('Supabase insert company_shareholders notice:', shDbErr)
        }

        const diskShareholders = readJsonFile<CompanyShareholder[]>('company_shareholders.json', [])
        diskShareholders.push(...shareholderRecords)
        writeJsonFile('company_shareholders.json', diskShareholders)
      }
    }

    // 4. Insert Financial Statements in financial_statements table
    if (payload.fs_years && payload.fs_years.length > 0) {
      const fsRecords = payload.fs_years.map(y => ({
        id: generateUUID(),
        company_id: companyId,
        year: Number(y),
        date_submitted: createdAt.slice(0, 10),
        created_at: createdAt,
      }))

      try {
        await supabase.from('financial_statements').insert(fsRecords)
      } catch (fsDbErr) {
        console.warn('Supabase insert financial_statements notice:', fsDbErr)
      }
    }

    // 5. Insert Company IDs in company_ids table
    if (payload.ids && payload.ids.length > 0) {
      const idRecords: CompanyIDRecord[] = []
      for (const idItem of payload.ids) {
        const idRec: CompanyIDRecord = {
          id: generateUUID(),
          company_id: companyId,
          company_name: name,
          id_type: idItem.id_type,
          id_number: idItem.id_number?.trim() || null,
          manager_name: managerName,
          issue_date: idItem.issue_date || null,
          expiry_date: idItem.expiry_date || null,
          grade: idItem.id_type === 'chamber_id' ? (idItem.grade as CompanyIDRecord['grade']) || null : null,
          created_at: createdAt,
        }
        idRecords.push(idRec)
      }

      if (idRecords.length > 0) {
        try {
          await supabase.from('company_ids').insert(idRecords)
        } catch (idDbErr) {
          console.warn('Supabase insert company_ids notice:', idDbErr)
        }

        const diskIDs = readJsonFile<CompanyIDRecord[]>('company_ids.json', [])
        diskIDs.unshift(...idRecords)
        writeJsonFile('company_ids.json', diskIDs)
      }
    }

    // 6. Generate Workflow steps completed or initialized
    const workflowSteps: WorkflowStep[] = WORKFLOW.map((wf, idx) => ({
      id: generateUUID(),
      company_id: companyId,
      step_key: wf.id,
      step_order: idx + 1,
      label: wf.label,
      owner_kind: wf.owner,
      state: 'done' as const,
      done_by: null,
      done_at: createdAt,
    }))

    try {
      await supabase.from('workflow_steps').insert(workflowSteps)
    } catch {}

    // 7. Save Company to Local Disk Store for 100% Guaranteed Availability
    const fullCompanyObject: CompanyWithWorkflow = {
      ...companyDataToInsert,
      task_no: String(Math.floor(1000 + Math.random() * 9000)),
      client_id: null,
      name_en: null,
      activity: null,
      has_reservation_letter: false,
      reservation_letter_governorate: null,
      lacks: null,
      created_at: createdAt,
      workflow_steps: workflowSteps,
      managers: managerRecord ? [managerRecord] : [],
      shareholders: shareholderRecords,
    }

    const currentDiskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    currentDiskCompanies.unshift(fullCompanyObject)
    writeJsonFile('companies.json', currentDiskCompanies)

    try {
      const deletedIds = readJsonFile<string[]>('deleted_company_ids.json', [])
      if (deletedIds.includes(companyId)) {
        writeJsonFile('deleted_company_ids.json', deletedIds.filter(id => id !== companyId))
      }
    } catch {}

    // 8. Log Timeline Event
    try {
      await logTimelineEvent({
        company_id: companyId,
        event_type: 'company_created',
        title: `تسجيل شركة متأسسة بالدليل: ${name}`,
        description: `تم إدراج الشركة بكافة بياناتها الرسمية والشهادة والمساهمين والهويات.`,
        related_link: `/commercial/companies/${companyId}`,
      })
    } catch {}

    revalidatePath('/commercial/companies-registry')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial/ids')
    revalidatePath('/commercial/llc')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true, companyId, company: fullCompanyObject }
  } catch (err: unknown) {
    console.error('createEstablishedCompanyAction exception:', err)
    const msg = err instanceof Error ? err.message : 'فشل إضافة الشركة المسجلة'
    return { success: false, error: msg }
  }
}
