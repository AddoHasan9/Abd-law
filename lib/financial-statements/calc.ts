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
 */
export function calculateFSState(
  fs: Partial<FinancialStatement> & { year: number },
  today = new Date()
): FinancialStatementState {
  const year = fs.year
  const submissionYear = year + 1
  const startDate = `${year}-01-01`
  const deadlineDate = `${submissionYear}-10-07`
  const penaltyStartDate = `${submissionYear}-10-08`

  const dateSubmitted = fs.date_submitted || null
  const dateReceived = fs.date_received || null
  const isSubmitted = Boolean(dateSubmitted)

  const deadlineObj = new Date(submissionYear, 9, 7) // 7 October of submission year (N = year + 1)
  const penaltyStartObj = new Date(submissionYear, 9, 8) // 8 October of submission year

  let daysLeft = 0
  let daysLate = 0
  let penaltyAmount = 0
  let isCapped = false
  let status: FSStatus = 'pending'
  let statusLabel = ''
  let tagClass = 'tag-gray'

  if (isSubmitted && dateSubmitted) {
    const subDateObj = new Date(dateSubmitted.slice(0, 10))
    if (subDateObj <= deadlineObj) {
      status = 'submitted'
      statusLabel = 'مقدمة في الموعد ✓'
      tagClass = 'tag-ok'
      penaltyAmount = 0
      daysLeft = 0
      daysLate = 0
    } else {
      status = 'submitted_late'
      daysLate = Math.max(1, Math.floor((subDateObj.getTime() - penaltyStartObj.getTime()) / 86_400_000) + 1)
      penaltyAmount = Math.min(daysLate * FS_DAILY_PENALTY, FS_MAX_PENALTY)
      isCapped = penaltyAmount >= FS_MAX_PENALTY
      statusLabel = `مقدمة متأخرة (${formatMoney(penaltyAmount)})`
      tagClass = 'tag-warn'
    }
  } else {
    // لم تُقدم بعد (معلقة)
    today.setHours(0, 0, 0, 0)
    deadlineObj.setHours(0, 0, 0, 0)
    penaltyStartObj.setHours(0, 0, 0, 0)

    if (today <= deadlineObj) {
      daysLeft = Math.max(0, Math.ceil((deadlineObj.getTime() - today.getTime()) / 86_400_000))
      daysLate = 0
      penaltyAmount = 0

      if (daysLeft <= 30) {
        status = 'due_soon'
        statusLabel = `تقترب المهلة (${daysLeft} يوم)`
        tagClass = 'tag-warn'
      } else {
        status = 'pending'
        statusLabel = `قيد الانتظار (${daysLeft} يوم)`
        tagClass = 'tag-blue'
      }
    } else {
      // تجاوزت المهلة وجاري احتساب الغرامة
      daysLeft = 0
      daysLate = Math.max(1, Math.floor((today.getTime() - penaltyStartObj.getTime()) / 86_400_000) + 1)
      penaltyAmount = Math.min(daysLate * FS_DAILY_PENALTY, FS_MAX_PENALTY)
      isCapped = penaltyAmount >= FS_MAX_PENALTY

      if (isCapped) {
        status = 'penalty_max'
        statusLabel = `الحد الأقصى للغرامة (${formatMoney(penaltyAmount)})`
        tagClass = 'tag-bad'
      } else {
        status = 'penalty_running'
        statusLabel = `تتراكم الغرامة (${formatMoney(penaltyAmount)})`
        tagClass = 'tag-bad'
      }
    }
  }

  const taxDeadlineDate = `${submissionYear}-07-31`
  const taxDeadlineObj = new Date(submissionYear, 6, 31) // 31 July of submission year (الهيئة العامة للضرائب - قسم الشركات)

  let taxDaysLeft = 0
  let taxDaysLate = 0
  let taxStatusLabel = ''

  if (isSubmitted && dateSubmitted) {
    const subDateObj = new Date(dateSubmitted.slice(0, 10))
    if (subDateObj <= taxDeadlineObj) {
      taxDaysLeft = 0
      taxDaysLate = 0
      taxStatusLabel = 'مقدمة للضرائب في الموعد (قبل 31/7) ✓'
    } else {
      taxDaysLate = Math.max(1, Math.floor((subDateObj.getTime() - taxDeadlineObj.getTime()) / 86_400_000))
      taxStatusLabel = `مقدمة للضرائب بعد 31/7 (تأخير ${taxDaysLate} يوم)`
    }
  } else {
    taxDeadlineObj.setHours(0, 0, 0, 0)
    if (today <= taxDeadlineObj) {
      taxDaysLeft = Math.max(0, Math.ceil((taxDeadlineObj.getTime() - today.getTime()) / 86_400_000))
      taxDaysLate = 0
      taxStatusLabel = taxDaysLeft <= 30
        ? `مهلة الضرائب (31/7): متبقي ${taxDaysLeft} يوم ⚠️`
        : `مهلة الضرائب (31/7): متبقي ${taxDaysLeft} يوم`
    } else {
      taxDaysLeft = 0
      taxDaysLate = Math.max(1, Math.floor((today.getTime() - taxDeadlineObj.getTime()) / 86_400_000))
      taxStatusLabel = `متأخرة عن مهلة تسليم الضرائب 31/7 (${taxDaysLate} يوم تأخير)`
    }
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
    taxStatusLabel,
    dateReceived,
    dateSubmitted,
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
