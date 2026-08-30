/**
 * استعلامات الشركات
 * ------------------------------------------------------------
 * تحلّ محل App.data في نموذج HTML. كل دالة تعيد بيانات مصفّاة
 * بسياسات RLS تلقائياً حسب دور المستخدم.
 */
import { createClient } from '@/lib/supabase/server'
import type { CompanyWithWorkflow, Company, CompanyManager, CompanyShareholder, WorkflowStep } from '@/types/database'
import { readJsonFile } from '@/lib/data/fs-store'
import { WORKFLOW, sanitizeFormationWorkflowSteps } from '@/lib/constants'

/** كل الشركات مع مخططاتها، مرتّبة بالأحدث */
export async function listCompanies(): Promise<CompanyWithWorkflow[]> {
  try {
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    const diskManagers = readJsonFile<CompanyManager[]>('company_managers.json', [])
    const diskShareholders = readJsonFile<CompanyShareholder[]>('company_shareholders.json', [])

    const supabase = await createClient()

    // Fetch primary company records
    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    const deletedIds = new Set(readJsonFile<string[]>('deleted_company_ids.json', []))
    const map = new Map<string, CompanyWithWorkflow>()

    // First load from disk store
    diskCompanies.forEach(c => {
      if (deletedIds.has(c.id)) return
      const isEstablished = c.status === 'established' || Boolean(c.deposit_released) || Boolean(c.cert_date)
      const workflowSteps = sanitizeFormationWorkflowSteps(c.workflow_steps, c.id, isEstablished, c.created_at)
      const managers = diskManagers.filter(m => m.company_id === c.id)
      const activeManager = managers.find(m => m.active)?.name || managers[0]?.name || c.manager
      const shareholders = diskShareholders.filter(s => s.company_id === c.id)
      map.set(c.id, {
        ...c,
        workflow_steps: workflowSteps,
        manager: activeManager,
        managers: managers.length > 0 ? managers : c.managers,
        shareholders: shareholders.length > 0 ? shareholders : c.shareholders,
      })
    })

    if (companiesData && companiesData.length > 0) {
      const companyIds = companiesData.map(c => c.id)

      // Fetch related tables individually to prevent deep nesting serialization errors
      const [stepsRes, managersRes, shareholdersRes] = await Promise.all([
        supabase.from('workflow_steps').select('*').in('company_id', companyIds),
        supabase.from('company_managers').select('*').in('company_id', companyIds),
        supabase.from('company_shareholders').select('*').in('company_id', companyIds),
      ])

      const stepsMap = new Map<string, WorkflowStep[]>()
      ;(stepsRes.data || []).forEach(step => {
        if (!stepsMap.has(step.company_id)) stepsMap.set(step.company_id, [])
        stepsMap.get(step.company_id)!.push(step)
      })

      const managersMap = new Map<string, CompanyManager[]>()
      ;(managersRes.data || []).forEach(m => {
        if (!managersMap.has(m.company_id)) managersMap.set(m.company_id, [])
        managersMap.get(m.company_id)!.push(m)
      })

      const shareholdersMap = new Map<string, CompanyShareholder[]>()
      ;(shareholdersRes.data || []).forEach(s => {
        if (!shareholdersMap.has(s.company_id)) shareholdersMap.set(s.company_id, [])
        shareholdersMap.get(s.company_id)!.push(s)
      })

      companiesData.forEach(c => {
        if (deletedIds.has(c.id)) return

        const isEstablished = c.status === 'established' || Boolean(c.deposit_released) || Boolean(c.cert_date)
        const rawSteps = (stepsMap.get(c.id) || []).sort(
          (a, b) => (a.step_order || 0) - (b.step_order || 0)
        )
        const diskCo = diskCompanies.find(dc => dc.id === c.id)
        const effectiveSteps = rawSteps.length > 0 ? rawSteps : (diskCo?.workflow_steps || [])
        const workflowSteps = sanitizeFormationWorkflowSteps(effectiveSteps, c.id, isEstablished, c.created_at)

        const managers = (managersMap.get(c.id) || []).length > 0
          ? managersMap.get(c.id)!
          : diskManagers.filter(m => m.company_id === c.id)
        const activeManager = managers.find(m => m.active)?.name || managers[0]?.name || c.manager || null
        const shareholders = (shareholdersMap.get(c.id) || []).length > 0
          ? shareholdersMap.get(c.id)!
          : diskShareholders.filter(s => s.company_id === c.id)

        map.set(c.id, {
          ...c,
          manager: activeManager,
          managers,
          shareholders,
          workflow_steps: workflowSteps,
        } as CompanyWithWorkflow)
      })
    }

    return Array.from(map.values())
      .filter(c => !deletedIds.has(c.id))
      .sort(
        (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      )
  } catch (e) {
    console.error('Exception in listCompanies:', e)
    const deletedIds = new Set(readJsonFile<string[]>('deleted_company_ids.json', []))
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    return diskCompanies.filter(c => !deletedIds.has(c.id))
  }
}

/** شركة واحدة بمخططها */
export async function getCompany(id: string): Promise<CompanyWithWorkflow | null> {
  try {
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    const foundDisk = diskCompanies.find(c => c.id === id)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('companies')
      .select('*, workflow_steps(*)')
      .eq('id', id)
      .single()

    const rawCompany = data || foundDisk
    if (!rawCompany) return null

    const isEst = rawCompany.status === 'established' || Boolean(rawCompany.deposit_released) || Boolean(rawCompany.cert_date)
    const rawSteps = (rawCompany.workflow_steps && rawCompany.workflow_steps.length > 0)
      ? rawCompany.workflow_steps
      : (foundDisk?.workflow_steps || [])

    const workflowSteps = sanitizeFormationWorkflowSteps(rawSteps, id, isEst, rawCompany.created_at)

    return {
      ...rawCompany,
      workflow_steps: workflowSteps,
    } as CompanyWithWorkflow
  } catch {
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    return diskCompanies.find(c => c.id === id) || null
  }
}

/**
 * هل أُرسلت وديعة الشركة على النظام؟
 * يستدعي الدالة المعرّفة في القاعدة، فالمنطق مصدره واحد.
 */
export async function isSubmitted(companyId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.rpc('company_submitted', { cid: companyId })
    return data === true
  } catch {
    return false
  }
}

/** خريطة {company_id: submitted} لكل الشركات بطلب واحد */
export async function submittedMap(): Promise<Record<string, boolean>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('deposit_stages')
      .select('state, deposits(company_id)')
      .eq('stage_key', 'submit')
      .eq('state', 'done')

    if (error) return {}

    type Row = { deposits: { company_id: string } | { company_id: string }[] | null }
    const map: Record<string, boolean> = {}
    for (const row of (data ?? []) as unknown as Row[]) {
      const dep = Array.isArray(row.deposits) ? row.deposits[0] : row.deposits
      if (dep?.company_id) map[dep.company_id] = true
    }
    return map
  } catch {
    return {}
  }
}

export async function createCompany(input: Partial<Company>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Company
}
