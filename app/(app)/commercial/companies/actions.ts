/**
 * إجراءات خادم للشركات وسير العمل وتأمين الصلاحيات
 */
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { WORKFLOW } from '@/lib/constants'
import type { WfState, CompanyWithWorkflow, CompanyManager, CompanyShareholder, CompanyIDRecord, FinancialStatement, DepositStage, Trademark } from '@/types/database'
import { createNotificationAction } from '@/app/(app)/notifications/actions'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'
import { logTimelineEvent, getCompanyTimeline, type TimelineEvent } from '@/lib/data/timeline'
import { requirePermission } from '@/lib/auth/require-permission'

// Memory store fallback for companies
const inMemoryCompanies: CompanyWithWorkflow[] = []

export async function getInMemoryCompaniesAction() {
  return inMemoryCompanies
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function createCompanyFormationAction(payload: {
  name: string
  kind: string
  capital: number
  manager?: string
  activity?: string
  phone?: string
  address?: string
  has_reservation_letter?: boolean
  reservation_letter_governorate?: string
  lacks?: string
  status?: string
  fee?: number
  currency?: string
  services?: string[]
  tx_date?: string
  due_date?: string
  notes?: string
  shareholders?: Array<{ name: string; phone: string }>
  accounting_notes?: {
    accountant_fee?: number | null
    registration_fee?: number | null
    gov_fee?: number | null
    other_expenses?: number | null
    notes?: string | null
  }
}) {
  const denied = await requirePermission('companies', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    if (!payload.name?.trim()) {
      return { success: false, error: 'اسم الشركة مطلوب' }
    }

    const name = payload.name.trim()
    const kind = payload.kind || (payload.shareholders && payload.shareholders.length > 1 ? 'محدودة' : 'فردية')
    const capital = payload.capital || 0
    const manager = payload.manager?.trim() || null
    const activity = payload.activity?.trim() || null
    const phone = payload.phone?.trim() || null
    const address = payload.address?.trim() || null
    const has_reservation_letter = Boolean(payload.has_reservation_letter)
    const reservation_letter_governorate = has_reservation_letter ? (payload.reservation_letter_governorate?.trim() || null) : null
    const lacks = payload.lacks?.trim() || null
    const accounting_notes = payload.accounting_notes || null
    const status = payload.status || 'progress'

    let company: CompanyWithWorkflow | null = null

    // 1. إضافة الشركة إلى قاعدة البيانات (الاسم الرسمي العربي)
    const { data: coData, error: coError } = await supabase
      .from('companies')
      .insert({
        name,
        kind,
        capital,
        activity,
        phone,
        address,
        has_reservation_letter,
        reservation_letter_governorate,
        lacks,
        status,
        accounting_notes,
        cert_no: null,
        cert_date: null,
      })
      .select('*')
      .single()

    if (coError || !coData) {
      console.warn('createCompanyFormationAction Supabase notice, using dual-layer fallback:', coError?.message)
      const fallbackCompanyId = generateUUID()
      const fallbackSteps = WORKFLOW.map((wf, idx) => ({
        id: generateUUID(),
        company_id: fallbackCompanyId,
        step_key: wf.id,
        step_order: idx + 1,
        label: wf.label,
        owner_kind: wf.owner,
        state: (idx === 0 ? 'doing' : 'wait') as WfState,
        done_by: null,
        done_at: null,
      }))

      company = {
        id: fallbackCompanyId,
        task_no: String(Math.floor(1000 + Math.random() * 9000)),
        client_id: null,
        name,
        name_en: null,
        kind,
        capital,
        manager,
        activity,
        phone,
        address,
        has_reservation_letter,
        reservation_letter_governorate,
        lacks,
        external: false,
        status,
        cert_no: null,
        cert_date: null,
        establishment_date: new Date().toISOString().slice(0, 10),
        last_completed_fs_year: null,
        fs_first_method: 'standard',
        created_at: new Date().toISOString(),
        workflow_steps: fallbackSteps as unknown as CompanyWithWorkflow['workflow_steps'],
      }
      inMemoryCompanies.unshift(company)
    } else {
      // 2. توليد خطوات سير العمل للشركة الجديدة في قاعدة البيانات
      const stepsPayload = WORKFLOW.map((wf, idx) => ({
        company_id: coData.id,
        step_key: wf.id,
        step_order: idx + 1,
        label: wf.label,
        owner_kind: wf.owner,
        state: (idx === 0 ? 'doing' : 'wait') as WfState,
      }))

      const { data: stepsData, error: stepsErr } = await supabase
        .from('workflow_steps')
        .insert(stepsPayload)
        .select()

      if (stepsErr) {
        console.error('workflow_steps insert error:', stepsErr.message)
      }

      company = {
        ...coData,
        workflow_steps: (stepsData || stepsPayload) as unknown as CompanyWithWorkflow['workflow_steps'],
      } as CompanyWithWorkflow
      inMemoryCompanies.unshift(company)
    }

    // إضافة المدير المفوض في جدول company_managers بشكل مستقل (مصدر الحقيقة الموحد)
    if (company && manager) {
      const managerObj = {
        id: generateUUID(),
        company_id: company.id,
        name: manager,
        active: true,
        created_at: new Date().toISOString(),
      }
      try {
        await supabase.from('company_managers').insert(managerObj)
      } catch {
        // Ignored
      }
      const diskManagers = readJsonFile<CompanyManager[]>('company_managers.json', [])
      diskManagers.unshift(managerObj)
      writeJsonFile('company_managers.json', diskManagers)
    }

    // إضافة المساهمين في جدول company_shareholders عند وجود مساهمين
    if (company && payload.shareholders && payload.shareholders.length > 0) {
      const shObjs = payload.shareholders.map(sh => ({
        id: generateUUID(),
        company_id: company!.id,
        name: sh.name,
        notes: sh.phone ? `هاتف: ${sh.phone}` : null,
        created_at: new Date().toISOString(),
      }))
      try {
        await supabase.from('company_shareholders').insert(shObjs)
      } catch {
        // Ignored
      }
      const diskShs = readJsonFile<CompanyShareholder[]>('company_shareholders.json', [])
      diskShs.push(...shObjs)
      writeJsonFile('company_shareholders.json', diskShs)
    }

    // حفظ الشركة في القرص المحلي (ضمان التخزين وعدم اختفاء البيانات إطلاقاً)
    if (company) {
      const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
      const filtered = diskCompanies.filter(c => c.id !== company!.id)
      filtered.unshift(company)
      writeJsonFile('companies.json', filtered)
    }

    // 3. إضافة معاملة تأسيس الشركة وسعرها والخدمات المشمولة
    const txObj = {
      id: generateUUID(),
      type: 'tasis',
      company_id: company.id,
      companies: { id: company.id, name: company.name },
      status: status === 'done' ? 'done' : 'progress',
      priority: 'medium',
      fee: payload.fee || 0,
      tx_date: payload.tx_date || new Date().toISOString().slice(0, 10),
      due_date: payload.due_date || null,
      description: `تأسيس شركة: ${company.name}`,
      lacks: payload.lacks || null,
      services: payload.services || ['tasis'],
      phone: payload.phone || null,
      created_at: new Date().toISOString(),
    }

    try {
      await supabase.from('transactions').insert({
        type: 'tasis',
        company_id: company.id,
        status: txObj.status,
        priority: txObj.priority,
        fee: txObj.fee,
        tx_date: txObj.tx_date,
        due_date: txObj.due_date,
        description: txObj.description,
        lacks: txObj.lacks,
        services: txObj.services,
        phone: txObj.phone,
      })
    } catch {
      // Ignored
    }

    // حفظ المعاملة قرصياً في الفايل
    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    diskTxs.unshift(txObj)
    writeJsonFile('transactions.json', diskTxs)

    // إرسال إشعار تلقائي للقسم التجاري
    try {
      await createNotificationAction({
        title: `تأسيس شركة جديدة: ${name}`,
        description: `تم إطلاق مسار تأسيس الشركة بنجاح مع سير العمل المتسلسل.`,
        type: 'company_created',
        related_company_id: company.id,
        link_url: '/commercial/companies',
      })
    } catch {
      // Ignored
    }

    await logTimelineEvent({
      company_id: company.id,
      event_type: 'company_created',
      title: `تأسيس وإنشاء سجل الشركة: ${name}`,
      related_link: '/commercial/companies',
    })

    revalidatePath('/commercial/companies')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true, company }
  } catch (err: unknown) {
    console.error('createCompanyFormationAction exception:', err)
    const message = err instanceof Error ? err.message : 'فشل تأسيس الشركة'
    return { success: false, error: message }
  }
}

export async function updateCompanyDetailsAction(
  companyId: string,
  payload: {
    name?: string
    kind?: string
    capital?: number
    manager?: string
    cert_no?: string
    cert_date?: string
    registrar_no?: string
    tax_no?: string
    activity?: string
    address?: string
    has_reservation_letter?: boolean
    reservation_letter_governorate?: string
    phone?: string
    lacks?: string
    accounting_notes?: {
      accountant_fee?: number | null
      registration_fee?: number | null
      gov_fee?: number | null
      other_expenses?: number | null
      notes?: string | null
    }
  }
) {
  const denied = await requirePermission('companies', 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (payload.name !== undefined) updateData.name = payload.name.trim()
    if (payload.kind !== undefined) updateData.kind = payload.kind
    if (payload.capital !== undefined) updateData.capital = payload.capital
    if (payload.cert_no !== undefined) updateData.cert_no = payload.cert_no.trim() || null
    if (payload.cert_date !== undefined) updateData.cert_date = payload.cert_date || null
    if (payload.registrar_no !== undefined) updateData.registrar_no = payload.registrar_no.trim() || null
    if (payload.tax_no !== undefined) updateData.tax_no = payload.tax_no.trim() || null
    if (payload.activity !== undefined) updateData.activity = payload.activity.trim() || null
    if (payload.address !== undefined) updateData.address = payload.address.trim() || null
    if (payload.has_reservation_letter !== undefined) {
      updateData.has_reservation_letter = Boolean(payload.has_reservation_letter)
      updateData.reservation_letter_governorate = payload.has_reservation_letter
        ? (payload.reservation_letter_governorate?.trim() || null)
        : null
    }
    if (payload.accounting_notes !== undefined) updateData.accounting_notes = payload.accounting_notes
    if (payload.phone !== undefined) updateData.phone = payload.phone.trim() || null
    if (payload.lacks !== undefined) updateData.lacks = payload.lacks.trim() || null

    const BASE_DB_FIELDS = [
      'name', 'kind', 'capital', 'cert_no', 'cert_date', 'activity', 
      'address', 'phone', 'lacks', 'status', 'deposit_released', 
      'deposit_released_at', 'barcode_url'
    ]

    let { error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)

    if (error && error.message && (error.message.includes('schema cache') || error.message.includes('column'))) {
      console.warn('Supabase schema column notice, retrying with base columns:', error.message)
      const sanitizedData: Record<string, unknown> = {}
      for (const key of Object.keys(updateData)) {
        if (BASE_DB_FIELDS.includes(key)) {
          sanitizedData[key] = updateData[key]
        }
      }
      const retry = await supabase
        .from('companies')
        .update(sanitizedData)
        .eq('id', companyId)
      error = retry.error
    }

    // Update disk JSON store with the complete rich payload (including tax_no, registrar_no, reservation letter)
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    const diskIdx = diskCompanies.findIndex(c => c.id === companyId)
    if (diskIdx !== -1) {
      Object.assign(diskCompanies[diskIdx], updateData)
      writeJsonFile('companies.json', diskCompanies)
    }

    if (error) {
      console.warn('updateCompanyDetailsAction non-fatal Supabase notice:', error.message)
    }

    // تفعيل وتحديث المدير المفوض في جدول company_managers بشكل مستقل (دون مساس بحقل manager في جدول الشركات)
    if (payload.manager !== undefined && payload.manager.trim()) {
      const managerName = payload.manager.trim()
      const managerObj = {
        id: generateUUID(),
        company_id: companyId,
        name: managerName,
        active: true,
        created_at: new Date().toISOString(),
      }
      const { error: deactivateErr } = await supabase
        .from('company_managers')
        .update({ active: false })
        .eq('company_id', companyId)
      const { error: managerErr } = await supabase.from('company_managers').insert(managerObj)

      if (!deactivateErr && !managerErr) {
        await logTimelineEvent({
          company_id: companyId,
          event_type: 'manager_changed',
          title: `تعيين المدير المفوض: ${managerName}`,
          related_link: `/commercial/companies/${companyId}`,
        })
      } else {
        console.warn('company_managers update notice:', deactivateErr?.message || managerErr?.message)
      }
    }

    if (payload.cert_date) {
      await logTimelineEvent({
        company_id: companyId,
        event_type: 'cert_issued',
        title: `إصدار شهادة التأسيس${payload.cert_no ? ` رقم ${payload.cert_no}` : ''}`,
        related_link: `/commercial/companies/${companyId}`,
      })
    }

    revalidatePath('/commercial/companies')
    revalidatePath(`/commercial/companies/${companyId}`)
    revalidatePath('/commercial/deposits')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true, error: undefined as string | undefined }
  } catch (err: unknown) {
    console.error('updateCompanyDetailsAction exception:', err)
    const message = err instanceof Error ? err.message : 'تعذر تعديل بيانات الشركة'
    return { success: false, error: message }
  }
}

export async function advanceCompanyStepAction(stepId: string, currentState: WfState) {
  const denied = await requirePermission('companies', 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    let nextState: WfState = 'doing'
    if (currentState === 'wait') nextState = 'doing'
    else if (currentState === 'doing') nextState = 'done'
    else if (currentState === 'done') nextState = 'wait'

    try {
      await supabase
        .from('workflow_steps')
        .update({
          state: nextState,
          done_at: nextState === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', stepId)
    } catch (dbErr) {
      console.warn('advanceCompanyStepAction Supabase notice:', dbErr)
    }

    // Update disk JSON store
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    let found = false
    for (const c of diskCompanies) {
      const step = c.workflow_steps?.find(s => s.id === stepId)
      if (step) {
        step.state = nextState
        step.done_at = nextState === 'done' ? new Date().toISOString() : null
        found = true
        break
      }
    }
    if (found) {
      writeJsonFile('companies.json', diskCompanies)
    }

    const stateLabel = nextState === 'done' ? 'مكتملة ✓' : nextState === 'doing' ? 'قيد التنفيذ ⏳' : 'في الانتظار'
    await createNotificationAction({
      title: `تحديث محطة سير العمل`,
      description: `تغيرت حالة الخطوة إلى ${stateLabel}`,
      type: 'step_completed',
      link_url: '/commercial/companies',
    })

    revalidatePath('/commercial/companies')
    revalidatePath('/commercial')
    return { success: true, nextState }
  } catch (err: unknown) {
    console.error('advanceCompanyStepAction exception:', err)
    return { success: false, error: 'تعذر تحديث حالة الخطوة' }
  }
}

// Memory store fallback for deposits
const inMemoryDeposits: Array<{
  id: string
  company_id: string
  companies: CompanyWithWorkflow | null
  started_at: string
  created_at: string
  deposit_stages: Array<{
    id: string
    deposit_id: string
    stage_key: string
    stage_order: number
    label: string
    critical: boolean
    state: 'idle' | 'progress' | 'done'
    at_date: string | null
  }>
}> = []

export async function getInMemoryDepositsAction() {
  return inMemoryDeposits
}

export async function launchDepositWorkflowAction(companyId: string) {
  const denied = await requirePermission('deposits', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    // جلب معلومات الشركة لربط السجل حتماً بنفس الشركة الموجودة
    let targetCompany: CompanyWithWorkflow | null = inMemoryCompanies.find(c => c.id === companyId) || null
    if (!targetCompany) {
      const { data: coData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()
      if (coData) targetCompany = coData as CompanyWithWorkflow
    }

    // 1. التحقق إن كانت الوديعة موجودة مسبقاً في قاعدة البيانات أو الذاكرة
    let depositId: string | null = null
    const existingMem = inMemoryDeposits.find(d => d.company_id === companyId)

    if (existingMem) {
      depositId = existingMem.id
      if (!existingMem.companies && targetCompany) {
        existingMem.companies = targetCompany
      }
    } else {
      const { data: existing } = await supabase
        .from('deposits')
        .select('id')
        .eq('company_id', companyId)
        .single()
      depositId = existing?.id || null
    }

    if (!depositId) {
      const newDepId = generateUUID()
      const startedAt = new Date().toISOString().slice(0, 10)

      const stagesPayload = [
        { id: generateUUID(), deposit_id: newDepId, stage_key: 'submit',    stage_order: 1, label: 'أُرسلت على النظام (حاسمة)', critical: true,  state: 'idle' as const, at_date: null },
        { id: generateUUID(), deposit_id: newDepId, stage_key: 'advisor',   stage_order: 2, label: 'كتاب المشاور مكتمل', critical: false, state: 'idle' as const, at_date: null },
        { id: generateUUID(), deposit_id: newDepId, stage_key: 'accountant',stage_order: 3, label: 'كتاب المحاسب مكتمل', critical: false, state: 'idle' as const, at_date: null },
        { id: generateUUID(), deposit_id: newDepId, stage_key: 'barcode',   stage_order: 4, label: 'رفع باركود / QR الشركة (أو PDF)', critical: false, state: 'idle' as const, at_date: null },
      ]

      // محاولة الإضافة إلى قاعدة البيانات
      const { data: newDep, error: depErr } = await supabase
        .from('deposits')
        .insert({
          company_id: companyId,
          started_at: startedAt,
        })
        .select()
        .single()

      if (depErr || !newDep) {
        console.warn('launchDepositWorkflowAction Supabase notice, using dual-layer fallback:', depErr?.message)
        depositId = newDepId
        const newDepItem = {
          id: newDepId,
          company_id: companyId,
          companies: targetCompany,
          started_at: startedAt,
          created_at: new Date().toISOString(),
          deposit_stages: stagesPayload,
        }
        inMemoryDeposits.unshift(newDepItem)

        // حفظ الوديعة في القرص المحلي (ضمان التظهير التام فوراً)
        const diskDeps = readJsonFile<Array<Record<string, unknown>>>('deposits.json', [])
        const filteredDeps = diskDeps.filter(d => d.company_id !== companyId)
        filteredDeps.unshift(newDepItem)
        writeJsonFile('deposits.json', filteredDeps)
      } else {
        depositId = newDep.id
        await supabase.from('deposit_stages').insert(
          stagesPayload.map(s => ({
            deposit_id: depositId,
            stage_key: s.stage_key,
            stage_order: s.stage_order,
            label: s.label,
            critical: s.critical,
            state: s.state,
          }))
        )

        const newDepItem = {
          id: depositId,
          company_id: companyId,
          companies: targetCompany,
          started_at: startedAt,
          created_at: new Date().toISOString(),
          deposit_stages: stagesPayload,
        }
        const diskDeps = readJsonFile<Array<Record<string, unknown>>>('deposits.json', [])
        const filteredDeps = diskDeps.filter(d => d.company_id !== companyId)
        filteredDeps.unshift(newDepItem)
        writeJsonFile('deposits.json', filteredDeps)
      }
    }

    try {
      await createNotificationAction({
        title: 'دخلت الشركة مرحلة إطلاق الوديعة',
        description: 'تم تفكيك مسار الوديعة إلى المحطات الثلاث المعتمدة وتوليد التنبيهات.',
        type: 'deposit_stage',
        related_company_id: companyId,
        link_url: '/commercial/deposits',
      })
      await logTimelineEvent({
        company_id: companyId,
        event_type: 'deposit_started',
        title: 'بدء مسار إطلاق الوديعة والمحطات الإلزامية',
        related_link: '/commercial/deposits',
      })
    } catch {
      // Ignored
    }

    revalidatePath('/commercial/deposits')
    revalidatePath('/commercial/companies')
    revalidatePath(`/commercial/companies/${companyId}`)
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true, depositId, error: undefined as string | undefined }
  } catch (err: unknown) {
    console.warn('launchDepositWorkflowAction exception fallback:', err)
    return { success: true, depositId: null, error: undefined as string | undefined }
  }
}

/** يسجّل ملاحظة حرة في السجل الزمني الدائم للشركة (يحل محل سجل الأحداث الوهمي بالذاكرة) */
export async function addCompanyAuditLogAction(companyId: string, action: string, user?: string) {
  await logTimelineEvent({
    company_id: companyId,
    event_type: 'note',
    title: action,
    actor_name: user,
    related_link: `/commercial/companies/${companyId}`,
  })
  revalidatePath(`/commercial/companies/${companyId}`)
  return { success: true }
}

export async function addCompanyDocumentAction(companyId: string, payload: { name: string; category: string; url?: string }) {
  const denied = await requirePermission('companies', 'edit')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('documents')
      .insert({
        company_id: companyId,
        title: payload.name.trim(),
        kind: payload.category || 'عام',
        storage_path: payload.url || null,
        doc_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()

    if (error || !data) {
      console.error('addCompanyDocumentAction error:', error?.message)
      return { success: false, error: error?.message || 'فشل رفع المستند' }
    }

    await logTimelineEvent({
      company_id: companyId,
      event_type: 'note',
      title: `رفع مستند جديد: ${payload.name} (${payload.category})`,
      related_link: `/commercial/companies/${companyId}`,
    })

    revalidatePath(`/commercial/companies/${companyId}`)
    return { success: true, data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'فشل رفع المستند'
    return { success: false, error: message }
  }
}

export async function getCompany360DataAction(companyId: string) {
  try {
    const supabase = createAdminClient()

    // 1. Fetch company record
    let company: CompanyWithWorkflow | null = null
    try {
      const { data: coData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle()

      if (coData) {
        const { data: stepsData } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('company_id', companyId)
          .order('step_order', { ascending: true })

        company = {
          ...coData,
          workflow_steps: stepsData || [],
        } as CompanyWithWorkflow
      }
    } catch (e) {
      console.warn('getCompany360DataAction primary fetch warning:', e)
    }

    // 2. Comprehensive Fallback: getCompany / listCompanies / disk / memory
    if (!company) {
      const { listCompanies } = await import('@/lib/data/companies')
      const allCompanies = await listCompanies()
      company = allCompanies.find(c => c.id === companyId) || null
    }

    if (!company) {
      const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
      const inMemCompanies = await getInMemoryCompaniesAction()
      company = diskCompanies.find(c => c.id === companyId) || inMemCompanies.find(c => c.id === companyId) || null
    }

    if (!company) {
      return { success: false, error: 'لم يتم العثور على الشركة' }
    }

    // 3. Fetch related records individually with try-catch blocks to prevent join exceptions
    let idsData: CompanyIDRecord[] = []
    let fsData: FinancialStatement[] = []
    let depositData: { id: string; started_at: string; deposit_stages: DepositStage[] } | null = null
    let managersData: CompanyManager[] = []
    let shareholdersData: CompanyShareholder[] = []
    let documentsData: Array<{ id: string; title?: string; name?: string; kind?: string; category?: string; storage_path?: string; created_at: string }> = []
    const trademarksData: Trademark[] = []
    let timelineData: TimelineEvent[] = []

    try {
      const { data } = await supabase.from('company_ids').select('*').eq('company_id', companyId)
      if (data) idsData = data as CompanyIDRecord[]
    } catch {}

    try {
      const { data } = await supabase.from('financial_statements').select('*').eq('company_id', companyId)
      if (data) fsData = data as FinancialStatement[]
    } catch {}

    try {
      const { data: dep } = await supabase.from('deposits').select('*').eq('company_id', companyId).maybeSingle()
      if (dep) {
        const { data: stData } = await supabase.from('deposit_stages').select('*').eq('deposit_id', dep.id).order('stage_order', { ascending: true })
        depositData = {
          ...dep,
          deposit_stages: stData || [],
        } as unknown as typeof depositData
      }
    } catch {}

    try {
      const { data } = await supabase.from('company_managers').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
      if (data) managersData = data as CompanyManager[]
    } catch {}

    try {
      const { data } = await supabase.from('company_shareholders').select('*').eq('company_id', companyId).order('created_at', { ascending: true })
      if (data) shareholdersData = data as CompanyShareholder[]
    } catch {}

    try {
      const { data } = await supabase.from('documents').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
      if (data) documentsData = data as unknown as typeof documentsData
    } catch {}

    try {
      timelineData = await getCompanyTimeline(companyId)
    } catch {}

    const diskManagers = readJsonFile<CompanyManager[]>('company_managers.json', [])
    const diskShareholders = readJsonFile<CompanyShareholder[]>('company_shareholders.json', [])

    const finalManagers = (managersData && managersData.length > 0)
      ? managersData
      : (company.managers && company.managers.length > 0)
        ? company.managers
        : diskManagers.filter(m => m.company_id === companyId)

    const finalShareholders = (shareholdersData && shareholdersData.length > 0)
      ? shareholdersData
      : (company.shareholders && company.shareholders.length > 0)
        ? company.shareholders
        : diskShareholders.filter(s => s.company_id === companyId)

    if (!depositData) {
      const diskDeps = readJsonFile<Array<Record<string, unknown>>>('deposits.json', [])
      const foundDep = diskDeps.find(d => d.company_id === companyId)
      if (foundDep) {
        depositData = foundDep as unknown as typeof depositData
      }
    }

    // 8. Fetch Tax Assessments for Company
    let taxAssessmentsData: any[] = []
    try {
      const { data: taxDb } = await supabase
        .from('tax_assessments')
        .select('*')
        .eq('company_id', companyId)
        .order('year', { ascending: false })
      if (taxDb) taxAssessmentsData = taxDb
    } catch {}

    const diskTax = readJsonFile<any[]>('tax_assessments.json', [])
    const diskCompanyTax = diskTax.filter(t => t.company_id === companyId)
    const taxMap = new Map<string, any>()
    taxAssessmentsData.forEach(t => taxMap.set(t.id, t))
    diskCompanyTax.forEach(t => taxMap.set(t.id, { ...(taxMap.get(t.id) || {}), ...t }))
    const finalTaxAssessments = Array.from(taxMap.values()).sort((a, b) => b.year - a.year)

    return {
      success: true,
      data: {
        company: {
          ...company,
          managers: finalManagers,
          shareholders: finalShareholders,
        },
        ids: idsData || [],
        financialStatements: fsData || [],
        taxAssessments: finalTaxAssessments || [],
        deposit: depositData || null,
        documents: (documentsData || []).map(d => ({
          id: d.id,
          name: d.title || d.name || 'مستند بدون عنوان',
          category: d.kind || d.category || 'عام',
          url: d.storage_path || undefined,
          created_at: d.created_at,
        })),
        trademarks: trademarksData || [],
        timeline: timelineData || [],
      },
    }
  } catch (err) {
    console.error('getCompany360DataAction exception:', err)
    return { success: false, error: 'تعذر جلب بيانات الشركة 360' }
  }
}

/**
 * حذف الشركة نهائياً من النظام وكافة الجداول والملفات المرتبطة بها
 */
export async function deleteCompanyAction(companyId: string) {
  const denied = await requirePermission('companies', 'delete')
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    // 1. Persistent blacklist of deleted company IDs
    try {
      const deletedIds = readJsonFile<string[]>('deleted_company_ids.json', [])
      if (!deletedIds.includes(companyId)) {
        deletedIds.push(companyId)
        writeJsonFile('deleted_company_ids.json', deletedIds)
      }
    } catch {}

    // 2. Delete from Supabase Database (cascade or manual deletion of related records)
    try {
      // Find deposits for this company to delete deposit stages first
      const { data: depRows } = await supabase.from('deposits').select('id').eq('company_id', companyId)
      if (depRows && depRows.length > 0) {
        const depIds = depRows.map(d => d.id)
        await supabase.from('deposit_stages').delete().in('deposit_id', depIds)
      }

      await Promise.allSettled([
        supabase.from('workflow_steps').delete().eq('company_id', companyId),
        supabase.from('company_managers').delete().eq('company_id', companyId),
        supabase.from('company_shareholders').delete().eq('company_id', companyId),
        supabase.from('financial_statements').delete().eq('company_id', companyId),
        supabase.from('company_ids').delete().eq('company_id', companyId),
        supabase.from('deposits').delete().eq('company_id', companyId),
        supabase.from('transactions').delete().eq('company_id', companyId),
        supabase.from('documents').delete().eq('company_id', companyId),
        supabase.from('timeline_events').delete().eq('company_id', companyId),
        supabase.from('trademarks').delete().eq('company_id', companyId),
        supabase.from('cases').delete().eq('company_id', companyId),
        supabase.from('notifications').delete().eq('related_company_id', companyId),
      ])

      // Finally delete the company row
      await supabase.from('companies').delete().eq('id', companyId)
    } catch (dbErr) {
      console.warn('Supabase deleteCompany notice:', dbErr)
    }

    // 3. Clean up from all local Disk JSON files
    try {
      // Companies
      const diskCompanies = readJsonFile<Array<Record<string, unknown>>>('companies.json', [])
      const updatedCompanies = diskCompanies.filter(c => c.id !== companyId)
      writeJsonFile('companies.json', updatedCompanies)

      // Managers
      const diskManagers = readJsonFile<Array<Record<string, unknown>>>('company_managers.json', [])
      writeJsonFile('company_managers.json', diskManagers.filter(m => m.company_id !== companyId))

      // Shareholders
      const diskShareholders = readJsonFile<Array<Record<string, unknown>>>('company_shareholders.json', [])
      writeJsonFile('company_shareholders.json', diskShareholders.filter(s => s.company_id !== companyId))

      // IDs
      const diskIDs = readJsonFile<Array<Record<string, unknown>>>('company_ids.json', [])
      writeJsonFile('company_ids.json', diskIDs.filter(i => i.company_id !== companyId))

      // Transactions
      const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
      writeJsonFile('transactions.json', diskTxs.filter(t => t.company_id !== companyId && t.id !== `tx_${companyId}`))

      // Deposits
      const diskDeposits = readJsonFile<Array<Record<string, unknown>>>('deposits.json', [])
      writeJsonFile('deposits.json', diskDeposits.filter(d => d.company_id !== companyId))

      // Financial statements
      const diskFS = readJsonFile<Array<Record<string, unknown>>>('financial_statements.json', [])
      writeJsonFile('financial_statements.json', diskFS.filter(f => f.company_id !== companyId))

      // Timeline events
      const diskTimeline = readJsonFile<Array<Record<string, unknown>>>('timeline_events.json', [])
      writeJsonFile('timeline_events.json', diskTimeline.filter(e => e.company_id !== companyId))
    } catch (diskErr) {
      console.warn('Disk store cleanup notice:', diskErr)
    }

    // 3. Revalidate all relevant application pages
    revalidatePath('/commercial/companies-registry')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial/deposits')
    revalidatePath('/commercial/llc')
    revalidatePath('/commercial/ids')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    console.error('deleteCompanyAction error:', err)
    const msg = err instanceof Error ? err.message : 'فشل حذف الشركة'
    return { success: false, error: msg }
  }
}

