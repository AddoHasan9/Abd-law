import { formatMoney } from '@/lib/constants'
import type { FinancialStatement, FinancialStatementState, FSStatus } from '@/types/database'

export const FS_DAILY_PENALTY = 50_000
export const FS_MAX_PENALTY = 5_154_000

/**
 * توليد القائمة الديناميكية للأعوام من 2000 حتى السنة المالية السابقة المنتهية (currentYear - 1)
 * مثال: في عام 2026 تكون آخر سنة متاحة هي 2025؛ وفي عام 2027 تصبح 2026 تلقائياً
 */
export function getFSYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const maxFilingYear = currentYear - 1
  const years: number[] = []
  for (let y = maxFilingYear; y >= 2000; y--) {
    years.push(y)
  }
  return years
}

/**
 * حساب حالة الموعد النهائي والغرامة للحسابات الختامية لسنة ماليّة معينة
 * تدعم الفصل التام بين موعد تسليم الضرائب (31/7) وموعد تسليم مسجل الشركات (7/10).
 */
export function calculateFSState(
  fs: Partial<FinancialStatement> & { year: number },
  today = new Date()
): FinancialStatementState {
  const year = fs.year
  const submissionYear = year + 1
  const startDate = `${year}-01-01`
  const deadlineDate = `${submissionYear}-10-07` // دائرة تسجيل الشركات
  const penaltyStartDate = `${submissionYear}-10-08`
  const taxDeadlineDate = `${submissionYear}-07-31` // الهيئة العامة للضرائب

  const dateReceived = fs.date_received || null

  // 1. تسليم دائرة تسجيل الشركات (Registrar of Companies - 7/10)
  const registrarDateSubmitted = fs.date_submitted_registrar || fs.date_submitted || (fs.registrar_submitted ? (fs.date_submitted || new Date().toISOString().slice(0, 10)) : null)
  const isRegistrarSubmitted = Boolean(registrarDateSubmitted)

  const deadlineObj = new Date(submissionYear, 9, 7) // 7 October
  const penaltyStartObj = new Date(submissionYear, 9, 8) // 8 October

  let daysLeft = 0
  let daysLate = 0
  let penaltyAmount = 0
  let isCapped = false
  let registrarStatus: FSStatus = 'pending'
  let registrarStatusLabel = ''
  let registrarTagClass = 'tag-gray'

  if (isRegistrarSubmitted && registrarDateSubmitted) {
    const subDateObj = new Date(registrarDateSubmitted.slice(0, 10))
    if (subDateObj <= deadlineObj) {
      registrarStatus = 'submitted'
      registrarStatusLabel = 'تم التسليم لمسجل الشركات في الموعد ✓'
      registrarTagClass = 'tag-ok'
      penaltyAmount = 0
      daysLeft = 0
      daysLate = 0
    } else {
      registrarStatus = 'submitted_late'
      daysLate = Math.max(1, Math.floor((subDateObj.getTime() - penaltyStartObj.getTime()) / 86_400_000) + 1)
      penaltyAmount = Math.min(daysLate * FS_DAILY_PENALTY, FS_MAX_PENALTY)
      isCapped = penaltyAmount >= FS_MAX_PENALTY
      registrarStatusLabel = `تم التسليم لمسجل الشركات متأخراً (${formatMoney(penaltyAmount)})`
      registrarTagClass = 'tag-warn'
    }
  } else {
    today.setHours(0, 0, 0, 0)
    deadlineObj.setHours(0, 0, 0, 0)
    penaltyStartObj.setHours(0, 0, 0, 0)

    if (today <= deadlineObj) {
      daysLeft = Math.max(0, Math.ceil((deadlineObj.getTime() - today.getTime()) / 86_400_000))
      daysLate = 0
      penaltyAmount = 0

      if (daysLeft <= 30) {
        registrarStatus = 'due_soon'
        registrarStatusLabel = `تقترب مهلة مسجل الشركات (${daysLeft} يوم)`
        registrarTagClass = 'tag-warn'
      } else {
        registrarStatus = 'pending'
        registrarStatusLabel = `قيد الانتظار لمسجل الشركات (${daysLeft} يوم)`
        registrarTagClass = 'tag-blue'
      }
    } else {
      daysLeft = 0
      daysLate = Math.max(1, Math.floor((today.getTime() - penaltyStartObj.getTime()) / 86_400_000) + 1)
      penaltyAmount = Math.min(daysLate * FS_DAILY_PENALTY, FS_MAX_PENALTY)
      isCapped = penaltyAmount >= FS_MAX_PENALTY

      if (isCapped) {
        registrarStatus = 'penalty_max'
        registrarStatusLabel = `الحد الأقصى لغرامة مسجل الشركات (${formatMoney(penaltyAmount)})`
        registrarTagClass = 'tag-bad'
      } else {
        registrarStatus = 'penalty_running'
        registrarStatusLabel = `تتراكم غرامة مسجل الشركات (${formatMoney(penaltyAmount)})`
        registrarTagClass = 'tag-bad'
      }
    }
  }

  // 2. تسليم الهيئة العامة للضرائب (General Commission of Taxes - 31/7)
  const taxDateSubmitted = fs.date_submitted_tax || (fs.tax_submitted ? (fs.date_submitted || new Date().toISOString().slice(0, 10)) : null)
  const isTaxSubmitted = Boolean(taxDateSubmitted)

  const taxDeadlineObj = new Date(submissionYear, 6, 31) // 31 July
  taxDeadlineObj.setHours(0, 0, 0, 0)

  let taxDaysLeft = 0
  let taxDaysLate = 0
  let taxStatus: FSStatus = 'pending'
  let taxStatusLabel = ''
  let taxTagClass = 'tag-gray'

  if (isTaxSubmitted && taxDateSubmitted) {
    const taxSubDateObj = new Date(taxDateSubmitted.slice(0, 10))
    if (taxSubDateObj <= taxDeadlineObj) {
      taxStatus = 'submitted'
      taxDaysLeft = 0
      taxDaysLate = 0
      taxStatusLabel = 'تم التسليم للضرائب في الموعد (قبل 31/7) ✓'
      taxTagClass = 'tag-ok'
    } else {
      taxStatus = 'submitted_late'
      taxDaysLate = Math.max(1, Math.floor((taxSubDateObj.getTime() - taxDeadlineObj.getTime()) / 86_400_000))
      taxStatusLabel = `تم التسليم للضرائب متأخراً بعد 31/7 (${taxDaysLate} يوم تأخير)`
      taxTagClass = 'tag-warn'
    }
  } else {
    if (today <= taxDeadlineObj) {
      taxDaysLeft = Math.max(0, Math.ceil((taxDeadlineObj.getTime() - today.getTime()) / 86_400_000))
      taxDaysLate = 0
      if (taxDaysLeft <= 30) {
        taxStatus = 'due_soon'
        taxStatusLabel = `مهلة الضرائب (31/7): متبقي ${taxDaysLeft} يوم ⚠️`
        taxTagClass = 'tag-warn'
      } else {
        taxStatus = 'pending'
        taxStatusLabel = `مهلة الضرائب (31/7): متبقي ${taxDaysLeft} يوم`
        taxTagClass = 'tag-blue'
      }
    } else {
      taxDaysLeft = 0
      taxDaysLate = Math.max(1, Math.floor((today.getTime() - taxDeadlineObj.getTime()) / 86_400_000))
      taxStatus = 'overdue'
      taxStatusLabel = `متأخرة عن مهلة تسليم الضرائب 31/7 (${taxDaysLate} يوم تأخير)`
      taxTagClass = 'tag-bad'
    }
  }

  // 3. الحالة العامة الموحدة (Overall Status & Presentation)
  const isFullySubmitted = isRegistrarSubmitted && isTaxSubmitted
  const isSubmitted = isRegistrarSubmitted // For backwards compatibility

  let status: FSStatus = registrarStatus
  let statusLabel = registrarStatusLabel
  let tagClass = registrarTagClass

  if (isFullySubmitted) {
    status = 'submitted'
    statusLabel = penaltyAmount > 0 ? `مكتملة ومسلّمة للدائرتين (غرامة: ${formatMoney(penaltyAmount)})` : 'مكتملة ومسلّمة للدائرتين بنجاح ✓'
    tagClass = penaltyAmount > 0 ? 'tag-warn' : 'tag-ok'
  } else if (isRegistrarSubmitted && !isTaxSubmitted) {
    status = taxStatus === 'overdue' ? 'overdue' : 'pending'
    statusLabel = `مسلّمة للمسجل — بانتظار تسليم الضرائب (${taxDaysLate > 0 ? `${taxDaysLate} يوم تأخير` : 'مهلة 31/7'})`
    tagClass = taxStatus === 'overdue' ? 'tag-bad' : 'tag-warn'
  } else if (!isRegistrarSubmitted && isTaxSubmitted) {
    status = registrarStatus
    statusLabel = `مسلّمة للضرائب — بانتظار مسجل الشركات (${daysLate > 0 ? `غرامة: ${formatMoney(penaltyAmount)}` : 'مهلة 7/10'})`
    tagClass = registrarTagClass
  }

  return {
    statementId: fs.id,
    companyId: fs.company_id || '',
    companyName: fs.company_name || undefined,
    year,
    startDate,
    deadlineDate,
    penaltyStartDate,
    taxDeadlineDate,
    taxDaysLeft,
    taxDaysLate,
    taxStatus,
    taxStatusLabel,
    taxTagClass,
    isTaxSubmitted,
    taxDateSubmitted,
    isRegistrarSubmitted,
    registrarDateSubmitted,
    registrarStatus,
    registrarStatusLabel,
    registrarTagClass,
    isFullySubmitted,
    dateReceived,
    dateSubmitted: registrarDateSubmitted,
    isSubmitted,
    daysLeft,
    daysLate,
    penaltyAmount,
    isCapped,
    status,
    statusLabel,
    tagClass,
  }
}
