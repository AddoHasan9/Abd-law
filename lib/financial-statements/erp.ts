import { formatMoney } from '@/lib/constants'
import { FS_DAILY_PENALTY, FS_MAX_PENALTY, calculateFSState } from '@/lib/financial-statements/calc'
import { isFSComplete } from '@/lib/financial-statements/completion'
import type { Company, FinancialStatement, FSContactStatus, RequiredFSItem } from '@/types/database'

export const FS_CONTACT_STATUS_LABELS: Record<FSContactStatus, { label: string; tagClass: string }> = {
  not_contacted: { label: 'لم يتم الاتصال', tagClass: 'tag-gray' },
  contacted: { label: 'تم الاتصال', tagClass: 'tag-blue' },
  promised: { label: 'وعد بالاستلام', tagClass: 'tag-warn' },
  waiting_docs: { label: 'بانتظار المستندات', tagClass: 'tag-orange' },
  docs_received: { label: 'تم استلام المستندات', tagClass: 'tag-ok' },
}

/**
 * دالة اقتراح طريقة الميزانية الأولى تلقائياً بناءً على تاريخ التأسيس (الشركات المعقودة في Q4)
 */
export function getSuggestedFirstMethod(company: Partial<Company>): 'standard' | 'merge_next_year' {
  if (company.fs_first_method) {
    return company.fs_first_method
  }

  const rawDate = company.establishment_date || company.cert_date
  if (!rawDate) return 'standard'

  const dt = new Date(rawDate.slice(0, 10))
  if (isNaN(dt.getTime())) return 'standard'

  const month = dt.getMonth() + 1 // 1..12
  // إذا أسست الشركة في الربع الرابع (تشرين الأول 10، تشرين الثاني 11، كانون الأول 12) -> دمج مع السنة التالية
  if (month >= 10) {
    return 'merge_next_year'
  }

  return 'standard'
}

/**
 * دالة فحص ما إذا كانت الشركة جديدة ولم تكمل عاماً كاملاً من تاريخ التأسيس (معفاة من المطالبة)
 */
export function isCompanyNewAndExempt(company: Partial<Company>, today = new Date()): boolean {
  if (company.last_completed_fs_year) return false
  const rawDate = company.establishment_date || company.cert_date
  if (!rawDate) {
    if (company.status === 'in_formation' || company.status === 'draft' || company.status === 'new') {
      return true
    }
    return false
  }

  const estDate = new Date(rawDate.slice(0, 10))
  if (isNaN(estDate.getTime())) return false

  const oneYearAfterEst = new Date(estDate)
  oneYearAfterEst.setFullYear(oneYearAfterEst.getFullYear() + 1)

  return today < oneYearAfterEst
}

/**
 * المحرك التلقائي لاستخراج الميزانيات المطلوبة والمستحقة لجميع الشركات (ERP Engine)
 */
export function calculateRequiredFSForCompanies(
  companies: Company[],
  statements: FinancialStatement[],
  contactStatusMap: Record<string, FSContactStatus> = {},
  today = new Date()
): RequiredFSItem[] {
  const currentYear = today.getFullYear()
  const results: RequiredFSItem[] = []

  // الخريطة السريعة للميزانيات المسجلة فعلياً
  // المنجز فعلاً فقط (مسلّم للدائرتين). السجل غير المكتمل يبقى مطلوباً ويُحسب بحالته الحقيقية
  const submittedSet = new Set<string>()
  const rowByKey = new Map<string, FinancialStatement>()
  statements.forEach(fs => {
    const k = `${fs.company_id}_${fs.year}`
    rowByKey.set(k, fs)
    if (isFSComplete(fs)) submittedSet.add(k)
  })

  companies.forEach(company => {
    // 1. الشركات غير المكلّف بها المكتب لا تطالَب بحسابات ختامية تلقائية
    if (!company.financial_statements_enabled) {
      return
    }

    // 2. الشركات قيد التأسيس ممنوع مطالبتها أو تكليفها بالحسابات الختامية
    const isEstablished = company.status === 'established' || Boolean(company.deposit_released) || Boolean(company.deposit_released_at)
    if (!isEstablished) {
      return
    }

    // الشركة الجديدة لا تطالَب بحسابات ختامية إلا بعد مرور سنة كاملة من تاريخ تأسيسها
    // — إلا إذا أضاف المكتب لها ميزانية بنفسه (فيجب متابعتها)
    const hasOpenRows = statements.some(fs => fs.company_id === company.id && !isFSComplete(fs))
    if (isCompanyNewAndExempt(company, today) && !hasOpenRows) {
      return
    }

    let startYear = currentYear - 1
    const rawDate = company.establishment_date || company.cert_date
    const firstMethod = getSuggestedFirstMethod(company)

    if (company.last_completed_fs_year) {
      startYear = company.last_completed_fs_year + 1
    } else if (rawDate) {
      const dt = new Date(rawDate.slice(0, 10))
      if (!isNaN(dt.getTime())) {
        const estYear = dt.getFullYear()
        if (firstMethod === 'merge_next_year') {
          // دمج سنة التأسيس مع السنة التالية -> البدء من السنة التالية
          startYear = estYear + 1
        } else {
          startYear = estYear
        }
      }
    }

    // «آخر سنة منجزة» اليدوية لا تتغلّب على سجل فعلي غير مكتمل لسنة سابقة
    const incompleteYears = statements
      .filter(fs => fs.company_id === company.id && !isFSComplete(fs))
      .map(fs => fs.year)
    if (incompleteYears.length) startYear = Math.min(startYear, ...incompleteYears)

    // الفحص التلقائي لجميع السنوات المالية المستحقة من سنة البداية حتى السنة المالية السابقة (N - 1)
    const maxRequiredYear = currentYear - 1

    for (let y = startYear; y <= maxRequiredYear; y++) {
      const key = `${company.id}_${y}`

      // إذا كانت الميزانية مقدمة ومكتملة مسبقاً -> يتجاوزها المحرك
      if (submittedSet.has(key)) {
        continue
      }

      // حساب المواعيد والغرامات للسنة الماليّة y (الموعد النهائي هو 07/10 للسنة الحالية N = y + 1)
      const deadlineYear = y + 1
      const deadlineObj = new Date(deadlineYear, 9, 7) // 7 October of submission year N
      const penaltyStartObj = new Date(deadlineYear, 9, 8) // 8 October of submission year N

      const deadlineDate = `${deadlineYear}-10-07`
      const penaltyStartDate = `${deadlineYear}-10-08`

      let daysLeft = 0
      let daysLate = 0
      let penaltyAmount = 0
      let isCapped = false
      let statusLabel = ''
      let tagClass = 'tag-gray'
      let status: RequiredFSItem['status'] = 'pending'

      if (today <= deadlineObj) {
        daysLeft = Math.max(0, Math.ceil((deadlineObj.getTime() - today.getTime()) / 86_400_000))
        if (daysLeft <= 30) {
          status = 'due_soon'
          statusLabel = `مستحقة قريباً (${daysLeft} يوم)`
          tagClass = 'tag-warn'
        } else {
          status = 'pending'
          statusLabel = `مطلوبة (متبقي ${daysLeft} يوم)`
          tagClass = 'tag-blue'
        }
      } else {
        daysLate = Math.max(1, Math.floor((today.getTime() - penaltyStartObj.getTime()) / 86_400_000) + 1)
        penaltyAmount = Math.min(daysLate * FS_DAILY_PENALTY, FS_MAX_PENALTY)
        isCapped = penaltyAmount >= FS_MAX_PENALTY

        if (isCapped) {
          status = 'penalty_max'
          statusLabel = `الغرامة بالسقف الأعلى (${formatMoney(penaltyAmount)})`
          tagClass = 'tag-bad'
        } else {
          status = 'penalty_running'
          statusLabel = `تتراكم الغرامة (${formatMoney(penaltyAmount)})`
          tagClass = 'tag-bad'
        }
      }

      // سجل موجود لكنه غير مكتمل: نأخذ حالته الحقيقية (تأخر الضرائب، تسليم جزئي، الغرامة)
      const existing = rowByKey.get(key)
      if (existing) {
        const real = calculateFSState(existing)
        daysLeft = real.daysLeft
        daysLate = real.daysLate
        penaltyAmount = real.penaltyAmount
        isCapped = real.isCapped
        status = real.status
        statusLabel = real.statusLabel
        tagClass = real.tagClass
      }

      const contactStatus = contactStatusMap[key] || 'not_contacted'

      results.push({
        companyId: company.id,
        companyName: company.name,
        requiredYear: y,
        deadlineDate,
        penaltyStartDate,
        daysLeft,
        daysLate,
        penaltyAmount,
        isCapped,
        status,
        statusLabel,
        tagClass,
        contactStatus,
        firstMethod,
        isMergedYear: firstMethod === 'merge_next_year' && rawDate ? new Date(rawDate.slice(0, 10)).getFullYear() === y - 1 : false,
      })
    }
  })

  // ترتيب النتائج حسب الأولوية والغرامات
  return results.sort((a, b) => b.penaltyAmount - a.penaltyAmount || a.daysLeft - b.daysLeft)
}
