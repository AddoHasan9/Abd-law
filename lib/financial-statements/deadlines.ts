import { createAdminClient } from '@/lib/supabase/server'
import { calculateFSState } from '@/lib/financial-statements/calc'
import { calculateRequiredFSForCompanies } from '@/lib/financial-statements/erp'
import type { Company, FinancialStatement } from '@/types/database'

export interface FSDeadline {
  id: string
  companyId: string
  companyName: string
  year: number
  kind: 'tax' | 'registrar'
  title: string
  due: string
  /** سالب = متأخرة بهذا العدد من الأيام */
  daysLeft: number
  penalty: number
}

/** سجلات الحسابات الختامية الفعلية (للمهل والتنبيهات) */
export async function loadFSRows(): Promise<FinancialStatement[]> {
  const { data, error } = await createAdminClient()
    .from('financial_statements')
    .select('id, company_id, year, date_received, date_submitted, date_submitted_tax, date_submitted_registrar')
  if (error) {
    console.error('loadFSRows:', error.message)
    return []
  }
  return (data ?? []) as FinancialStatement[]
}

/**
 * المصدر الوحيد لمهل الحسابات الختامية في الشريط الجانبي ولوحة التحكم والتنبيه العلوي.
 * يعتمد على نفس محرك قسم الحسابات الختامية وعلى السجلات الفعلية — لا على «آخر سنة منجزة» اليدوية.
 */
export function computeFSDeadlines(companies: Company[], rows: FinancialStatement[], today = new Date()): FSDeadline[] {
  const byKey = new Map(rows.map(r => [`${r.company_id}_${r.year}`, r]))
  const out: FSDeadline[] = []
  for (const r of calculateRequiredFSForCompanies(companies, rows, {}, today)) {
    const row = byKey.get(`${r.companyId}_${r.requiredYear}`)
    const st = calculateFSState(row ?? { company_id: r.companyId, year: r.requiredYear })

    if (!st.isTaxSubmitted) {
      out.push({
        id: `fs_tax_${r.companyId}_${r.requiredYear}`,
        companyId: r.companyId,
        companyName: r.companyName,
        year: r.requiredYear,
        kind: 'tax',
        title: `تسليم ضرائب الشركات 31/7 (حسابات ${r.requiredYear})`,
        due: st.taxDeadlineDate || '',
        daysLeft: st.taxDaysLate && st.taxDaysLate > 0 ? -st.taxDaysLate : st.taxDaysLeft ?? 0,
        penalty: 0,
      })
    }
    if (!st.isRegistrarSubmitted) {
      out.push({
        id: `fs_reg_${r.companyId}_${r.requiredYear}`,
        companyId: r.companyId,
        companyName: r.companyName,
        year: r.requiredYear,
        kind: 'registrar',
        title: `مسجل الشركات 7/10 (ميزانية ${r.requiredYear})`,
        due: st.deadlineDate,
        daysLeft: st.daysLate > 0 ? -st.daysLate : st.daysLeft,
        penalty: st.penaltyAmount,
      })
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft)
}
