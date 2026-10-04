/**
 * استعلامات الشركات
 * ------------------------------------------------------------
 * تحلّ محل App.data في نموذج HTML. كل دالة تعيد بيانات مصفّاة
 * بسياسات RLS تلقائياً حسب دور المستخدم.
 */
import { requirePermission } from '@/lib/auth/require-permission'
import { createClient } from '@/lib/supabase/server'
import type { CompanyWithWorkflow, Company, CompanyManager, CompanyShareholder, WorkflowStep } from '@/types/database'
import { sanitizeFormationWorkflowSteps } from '@/lib/constants'

/** كل الشركات مع مخططاتها، مرتّبة بالأحدث */
export async function listCompanies(): Promise<CompanyWithWorkflow[]> {
  const accessDenied = await requirePermission('companies', 'view')
  if (accessDenied) return []

  try {
    const supabase = await createClient()
    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    if (!companiesData?.length) return []

    // الجداول المرتبطة بطلبات منفصلة (تفادي التداخل العميق في الاستعلام)
    const companyIds = companiesData.map(c => c.id)
    const [stepsRes, managersRes, shareholdersRes] = await Promise.all([
      supabase.from('workflow_steps').select('*').in('company_id', companyIds),
      supabase.from('company_managers').select('*').in('company_id', companyIds),
      supabase.from('company_shareholders').select('*').in('company_id', companyIds),
    ])
    const group = <T extends { company_id: string }>(rows: T[] | null) => {
      const m = new Map<string, T[]>()
      for (const r of rows || []) {
        if (!m.has(r.company_id)) m.set(r.company_id, [])
        m.get(r.company_id)!.push(r)
      }
      return m
    }
    const stepsMap = group<WorkflowStep>(stepsRes.data)
    const managersMap = group<CompanyManager>(managersRes.data)
    const shareholdersMap = group<CompanyShareholder>(shareholdersRes.data)

    const companies = companiesData.map(c => {
      const isDepositReleased = Boolean(c.deposit_released) || ['established', 'registered', 'active'].includes(c.status)
      const status = isDepositReleased ? 'established' : (c.status || 'forming')
      const rawSteps = (stepsMap.get(c.id) || []).sort((a, b) => (a.step_order || 0) - (b.step_order || 0))
      const managers = managersMap.get(c.id) || []
      return {
        ...c,
        status,
        deposit_released: isDepositReleased,
        manager: managers.find(m => m.active)?.name || managers[0]?.name || c.manager || null,
        managers,
        shareholders: shareholdersMap.get(c.id) || [],
        workflow_steps: sanitizeFormationWorkflowSteps(rawSteps, c.id, status === 'established', c.created_at),
      } as CompanyWithWorkflow
    })

    // منع التكرار بالاسم: عند التطابق تُفضَّل الشركة المؤسسة
    const byName = new Map<string, CompanyWithWorkflow>()
    for (const c of companies) {
      const key = c.name?.trim().toLowerCase() || c.id
      const existing = byName.get(key)
      if (!existing || ((c.status === 'established' || c.deposit_released) && existing.status !== 'established')) {
        byName.set(key, c)
      }
    }
    return Array.from(byName.values()).sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    )
  } catch (e) {
    console.error('Exception in listCompanies:', e)
    return []
  }
}

/** شركة واحدة بمخططها */
export async function getCompany(id: string): Promise<CompanyWithWorkflow | null> {
  const accessDenied = await requirePermission('companies', 'view')
  if (accessDenied) return null

  try {
    const supabase = await createClient()
    const [{ data: rawCompany }, { data: dbManagers }, { data: dbShareholders }] = await Promise.all([
      supabase.from('companies').select('*, workflow_steps(*)').eq('id', id).single(),
      supabase.from('company_managers').select('*').eq('company_id', id).order('start_date', { ascending: false }),
      supabase.from('company_shareholders').select('*').eq('company_id', id),
    ])
    if (!rawCompany) return null

    const isEst = rawCompany.status === 'established' || Boolean(rawCompany.deposit_released) || Boolean(rawCompany.cert_date)
    const managers = (dbManagers ?? []) as CompanyManager[]
    return {
      ...rawCompany,
      manager: managers.find(m => m.active)?.name || managers[0]?.name || rawCompany.manager || null,
      managers,
      shareholders: (dbShareholders ?? []) as CompanyShareholder[],
      workflow_steps: sanitizeFormationWorkflowSteps(rawCompany.workflow_steps || [], id, isEst, rawCompany.created_at),
    } as CompanyWithWorkflow
  } catch {
    return null
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
