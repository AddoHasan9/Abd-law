/**
 * محرك حالة الشركات المركزي (Centralized Company Status Engine)
 * ------------------------------------------------------------
 * يحسب حالة الشركة تلقائياً بناءً على محطات سير العمل،
 * إطلاق الوديعة، الهويات الحكومية، والحسابات الختامية.
 */
import type { CompanyWithWorkflow, DepositStage, CompanyIDRecord, FinancialStatement } from '@/types/database'

export type CalculatedCompanyStatus =
  | 'under_establishment'
  | 'waiting_cert'
  | 'deposit_running'
  | 'deposit_released'
  | 'ids_in_progress'
  | 'fully_operational'
  | 'suspended'
  | 'archived'

export interface CompanyStatusMeta {
  key: CalculatedCompanyStatus
  label: string
  tagClass: string
  description: string
}

export const COMPANY_STATUS_META: Record<CalculatedCompanyStatus, CompanyStatusMeta> = {
  under_establishment: {
    key: 'under_establishment',
    label: 'قيد التأسيس',
    tagClass: 'tag-work',
    description: 'خطوات تأسيس الشركة وإجراءات التسجيل جارية حالياً.',
  },
  waiting_cert: {
    key: 'waiting_cert',
    label: 'بانتظار شهادة التأسيس',
    tagClass: 'tag-warn',
    description: 'تم إكمال الخطوات الأساسية وبانتظار إصدار شهادة التأسيس الرسمية.',
  },
  deposit_running: {
    key: 'deposit_running',
    label: 'الوديعة قيد المتابعة',
    tagClass: 'tag-blue',
    description: 'شهادة التأسيس صادرة ومسار إطلاق الوديعة قيد المتابعة والمحطات الإلزامية.',
  },
  deposit_released: {
    key: 'deposit_released',
    label: 'تم إطلاق الوديعة',
    tagClass: 'tag-ok',
    description: 'تم إطلاق الوديعة بنجاح واستكمال المحطات الأربع وباركود الشركة.',
  },
  ids_in_progress: {
    key: 'ids_in_progress',
    label: 'قيد إصدار الهويات',
    tagClass: 'tag-orange',
    description: 'الوديعة مطلقة وجاري إصدار الهويات والترقيمات.',
  },
  fully_operational: {
    key: 'fully_operational',
    label: 'مجهزة وعاملة بالكامل',
    tagClass: 'tag-ok',
    description: 'الشركة مكتملة التأسيس، الوديعة مطلقة، الهويات صادرة، والحسابات الختامية مكلّفة.',
  },
  suspended: {
    key: 'suspended',
    label: 'معلقة / متوقفة',
    tagClass: 'tag-bad',
    description: 'أُوقفت المعاملة أو تعلقت الشركة مؤقتاً.',
  },
  archived: {
    key: 'archived',
    label: 'مؤرشفة',
    tagClass: 'tag-gray',
    description: 'ملف الشركة مؤرشف.',
  },
}

export function calculateCompanyStatus(params: {
  company: Partial<CompanyWithWorkflow>
  depositStages?: DepositStage[]
  ids?: CompanyIDRecord[]
  financialStatements?: FinancialStatement[]
}): CompanyStatusMeta {
  const { company, depositStages = [], ids = [], financialStatements = [] } = params

  // 1. Manual override check for suspended or archived
  if (company.status === 'suspended' || company.status === 'rejected' || company.status === 'hold') {
    return COMPANY_STATUS_META.suspended
  }
  if (company.status === 'archived') {
    return COMPANY_STATUS_META.archived
  }

  const hasCert = Boolean(company.cert_no || company.cert_date)
  const isFsEnabled = Boolean(company.financial_statements_enabled || company.last_completed_fs_year || financialStatements.length > 0)
  const hasIds = ids.length > 0

  const allDepositStagesDone = depositStages.length > 0 && depositStages.every(s => s.state === 'done')
  const isDepositRunning = depositStages.length > 0 && !allDepositStagesDone

  // 2. Fully Operational Condition
  if (allDepositStagesDone && isFsEnabled && hasIds) {
    return COMPANY_STATUS_META.fully_operational
  }

  // 3. IDs In Progress Condition
  if (allDepositStagesDone && (hasIds || isFsEnabled)) {
    return COMPANY_STATUS_META.ids_in_progress
  }

  // 4. Deposit Released Condition
  if (allDepositStagesDone) {
    return COMPANY_STATUS_META.deposit_released
  }

  // 5. Deposit Running Condition
  if (hasCert || isDepositRunning) {
    return COMPANY_STATUS_META.deposit_running
  }

  // 6. Waiting Certificate Condition
  const stepsDone = (company.workflow_steps || []).filter(s => s.state === 'done').length
  const totalSteps = company.workflow_steps?.length || 0
  if (totalSteps > 0 && stepsDone >= totalSteps - 1) {
    return COMPANY_STATUS_META.waiting_cert
  }

  // 7. Default: Under Establishment
  return COMPANY_STATUS_META.under_establishment
}
