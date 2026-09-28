import type { FinancialStatement } from '@/types/database'

type FSLike = Pick<FinancialStatement, 'date_submitted'> & {
  date_submitted_tax?: string | null
  date_submitted_registrar?: string | null
}

/**
 * التعريف الوحيد لـ«ميزانية منجزة» في كل النظام:
 * مسلّمة للضرائب (31/7) ولمسجل الشركات (7/10) معاً.
 * استثناء: سجلات قديمة قبل فصل الدائرتين تحمل تاريخ تسليم عاماً فقط → تُعد منجزة.
 * مجرد استلام المستندات أو وجود سجل للسنة لا يعني الإنجاز.
 */
export function isFSComplete(fs: FSLike | null | undefined): boolean {
  if (!fs) return false
  const tax = Boolean(fs.date_submitted_tax)
  const registrar = Boolean(fs.date_submitted_registrar || fs.date_submitted)
  if (tax && registrar) return true
  const legacyGeneral = Boolean(fs.date_submitted) && !fs.date_submitted_tax && !fs.date_submitted_registrar
  return legacyGeneral
}
