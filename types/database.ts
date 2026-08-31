/**
 * أنواع قاعدة البيانات الشاملة — مطابقة لمخطط Supabase السحابي
 * ------------------------------------------------------------
 */

/* ---------- الأنواع المعدودة ---------- */
export type UserRole    = 'super_admin' | 'admin' | 'manager' | 'lawyer' | 'staff'
export type ClientType  = 'individual' | 'company'
export type TxStatus    = 'new' | 'in_progress' | 'under_review' | 'waiting_client' | 'waiting_government' | 'completed' | 'closed' | 'cancelled' | 'progress' | 'done' | 'rejected' | 'hold' | string
export type TxPriority  = 'low' | 'medium' | 'high' | 'urgent'
export type WfState     = 'wait' | 'doing' | 'done'
export type StageState  = 'idle' | 'progress' | 'done'
export type LeadStage   = 'new' | 'followup' | 'qualified' | 'converted'
export type CommChannel = 'phone' | 'whatsapp' | 'email' | 'visit'
export type IDType      = 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'
export type ChamberGrade = 'ممتازة' | 'الأولى' | 'الثانية' | 'الثالثة' | 'الرابعة' | 'الخامسة'

/* ---------- الجداول الأساسية ---------- */

export interface Profile {
  id: string
  name: string
  role: UserRole
  dept: string | null
  phone: string | null
  age?: number | string | null
  gender?: 'male' | 'female' | string | null
  birth_date?: string | null
  active: boolean
  created_at: string
  email?: string
  avatar_url?: string | null
}

export interface Employee {
  id: string
  name: string
  title: string | null
  phone: string | null
  created_at: string
}

export interface Client {
  id: string
  name: string
  type: ClientType
  phones: string[]
  business: string | null
  notes: string | null
  created_at: string
}

export interface Lead {
  id: string
  name: string
  contact: string | null
  source: string | null
  stage: LeadStage
  note: string | null
  created_at: string
}

export interface AccountingBreakdown {
  accountant_fee?: number | null
  registration_fee?: number | null
  gov_fee?: number | null
  other_expenses?: number | null
  notes?: string | null
}

export interface Company {
  id: string
  task_no: string | null
  client_id: string | null
  name: string
  name_en: string | null
  kind: string | null
  capital: number
  manager?: string | null
  cert_no: string | null
  cert_date: string | null
  registrar_no?: string | null
  tax_no?: string | null
  deposit_released?: boolean | null
  deposit_released_at?: string | null
  barcode_url?: string | null
  deposit_status?: string | null
  establishment_date?: string | null
  last_completed_fs_year?: number | null
  fs_first_method?: 'standard' | 'merge_next_year' | null
  financial_statements_enabled?: boolean | null
  activity: string | null
  address: string | null
  has_reservation_letter?: boolean | null
  reservation_letter_governorate?: string | null
  phone: string | null
  lacks: string | null
  external: boolean
  status: string | null
  accounting_notes?: AccountingBreakdown | string | null
  created_at: string
}

export interface CompanyManager {
  id: string
  company_id: string
  name: string
  phone?: string | null
  id_number?: string | null
  start_date?: string | null
  end_date?: string | null
  active: boolean
  notes?: string | null
  created_at?: string
}

export interface CompanyShareholder {
  id: string
  company_id: string
  name: string
  share_percentage?: number | null
  share_amount?: number | null
  nationality?: string | null
  notes?: string | null
  created_at?: string
}

export type CompanyIDType = 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'
export type CompanyIDStatus = 'in_progress' | 'done' | 'lacks' | 'paused' | 'expired'

export interface CompanyIDRecord {
  id: string
  company_id: string
  company_name?: string | null
  id_type: CompanyIDType
  id_number?: string | null
  manager_name?: string | null
  grade?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  tx_start_date?: string | null
  status?: CompanyIDStatus
  notes?: string | null
  created_at: string
}

export interface GovernmentID extends CompanyIDRecord {}

export interface DepartmentTask {
  id: string
  company_id?: string | null
  dept?: string | null
  title: string
  description?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date?: string | null
  assigned_to?: string | null
  created_at: string
}

export interface ViewDashboardAlert {
  id: string
  company_id?: string | null
  company_name?: string | null
  alert_type: 'deposit_deadline' | 'fs_deadline' | 'id_expiry' | 'urgent_task' | 'general'
  severity: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description?: string | null
  due_date?: string | null
  days_overdue?: number | null
  created_at?: string
}

export type TimelineEventType =
  | 'company_created'
  | 'cert_issued'
  | 'deposit_started'
  | 'deposit_released'
  | 'id_issued'
  | 'fs_assigned'
  | 'fs_submitted'
  | 'trademark_registered'
  | 'manager_changed'
  | 'note'

export interface ViewCompanyTimeline {
  id: string
  company_id: string
  event_type: TimelineEventType | string
  title: string
  description?: string | null
  actor_id?: string | null
  actor_name?: string | null
  related_link?: string | null
  created_at: string
}

export interface WorkflowStep {
  id: string
  company_id: string
  step_key: string
  step_order: number
  label: string
  owner_kind: string | null
  state: WfState
  done_by: string | null
  done_at: string | null
}

export interface Transaction {
  id: string
  type: string
  client_id: string | null
  company_id: string | null
  lawyer_id: string | null
  priority: TxPriority
  status: TxStatus
  tx_date: string
  due_date: string | null
  description: string | null
  services: string[]
  lacks: string | null
  fee: number | null
  phone: string | null
  capital_before?: number | null
  capital_after?: number | null
  seller_name?: string | null
  buyer_name?: string | null
  created_at: string
}

export interface TransactionStep {
  id: string
  tx_id: string
  text: string
  by_id: string | null
  at_date: string
  created_at: string
}

export interface Deposit {
  id: string
  company_id: string
  tx_id: string | null
  started_at: string
  created_at: string
}

export interface DepositStage {
  id: string
  deposit_id: string
  stage_key: string
  label?: string
  stage_order: number
  state: StageState
  at_date: string | null
  by_id: string | null
  notes: string | null
  created_at: string
}

export interface Document {
  id: string
  company_id: string | null
  client_id: string | null
  title: string
  kind: string | null
  storage_path: string | null
  doc_date: string | null
  created_at: string
}

export interface POA {
  id: string
  code: string
  client_name: string
  grantee: string | null
  issue_date: string | null
  notes: string | null
  created_at: string
}

export interface Seal {
  id: string
  seal_code: string
  seal_name: string
  custodian: string | null
  notes: string | null
  created_at: string
}

export interface CommercialReport {
  id: string
  title: string
  report_date: string
  data_json: Record<string, unknown> | null
  created_at: string
}

export type NotificationType =
  | 'company_created'
  | 'deposit_released'
  | 'fs_submitted'
  | 'id_updated'
  | 'deposit_deadline'
  | 'fs_deadline'
  | 'id_expiry'
  | 'urgent_task'
  | 'general'
  | string

export interface Notification {
  id: string
  user_id?: string | null
  title: string
  description?: string | null
  type?: NotificationType | string | null
  related_company_id?: string | null
  link_url?: string | null
  read: boolean
  is_read?: boolean
  created_at: string
}

export type NotificationItem = Notification

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Reminder {
  id: string
  title: string
  remind_at?: string
  due_date?: string | null
  due_time?: string | null
  priority?: ReminderPriority | string | null
  notes?: string | null
  company_id?: string | null
  company_name?: string | null
  tx_id?: string | null
  done?: boolean
  is_done?: boolean
  is_completed?: boolean
  is_archived?: boolean
  alert_sent?: boolean
  created_at: string
}

export type ReminderItem = Reminder

export interface Comm {
  id: string
  client_id: string | null
  company_id?: string | null
  channel: CommChannel
  summary: string | null
  comm_date: string
  by_id: string | null
  created_at: string
}

export interface Followup {
  id: string
  client_id: string | null
  tx_id: string | null
  due_date: string
  note: string | null
  status: string
  created_at: string
}

export interface Settings {
  id: number
  office_name: string
  penalty_days: number
  penalty_warn: number
  penalty_daily: number
  penalty_max: number
  currency: string
  updated_at: string
}

export interface AuditEntry {
  id: number
  actor_id: string | null
  actor_name: string | null
  actor_role: UserRole | null
  action: string
  entity: string | null
  entity_id: string | null
  note: string | null
  at: string
}

/* ---------- أنواع مركّبة تستعملها الواجهة ---------- */

export interface CompanyWithWorkflow extends Company {
  workflow_steps: WorkflowStep[]
  managers?: CompanyManager[]
  shareholders?: CompanyShareholder[]
  government_ids?: GovernmentID[]
  timeline?: ViewCompanyTimeline[]
}

export interface DepositWithStages extends Deposit {
  companies: Company | null
  deposit_stages: DepositStage[]
}

export interface TransactionFull extends Transaction {
  clients: Client | null
  companies: Company | null
  profiles: Profile | null
  transaction_steps?: TransactionStep[]
}

export interface PenaltyState {
  due: string
  label: string
  daysLeft: number
  daysLate: number
  amount: number
  level: 'late' | 'soon' | 'ok'
  capped: boolean
  canSubmitYet: boolean
  daysUntilSubmitAllowed: number
}

export interface FinancialStatement {
  id: string
  company_id: string
  company_name?: string | null
  year: number
  date_received?: string | null
  date_submitted?: string | null
  notes?: string | null
  created_at: string
}

export type FSStatus = 'submitted' | 'submitted_late' | 'due_soon' | 'pending' | 'overdue' | 'penalty_running' | 'penalty_max'

export interface FinancialStatementState {
  statementId?: string
  companyId: string
  companyName?: string
  year: number
  startDate: string
  deadlineDate: string
  penaltyStartDate: string
  taxDeadlineDate?: string
  taxDaysLeft?: number
  taxDaysLate?: number
  taxStatusLabel?: string
  dateReceived?: string | null
  dateSubmitted?: string | null
  isSubmitted: boolean
  daysLeft: number
  daysLate: number
  penaltyAmount: number
  isCapped: boolean
  status: FSStatus
  statusLabel: string
  tagClass: string
}

export type FSContactStatus =
  | 'not_contacted'
  | 'contacted'
  | 'promised'
  | 'waiting_docs'
  | 'docs_received'

export interface RequiredFSItem {
  companyId: string
  companyName: string
  requiredYear: number
  deadlineDate: string
  penaltyStartDate: string
  daysLeft: number
  daysLate: number
  penaltyAmount: number
  isCapped: boolean
  status: FSStatus
  statusLabel: string
  tagClass: string
  contactStatus: FSContactStatus
  firstMethod: 'standard' | 'merge_next_year'
  isMergedYear: boolean
  mergedNote?: string
}

export interface Trademark {
  id: string
  company_id: string
  name: string
  registration_no?: string | null
  status: 'pending' | 'registered' | 'rejected' | 'expired'
  registered_date?: string | null
  expiry_date?: string | null
  notes?: string | null
  created_at: string
}

export interface TaxAssessment {
  id: string
  company_id: string
  company_name?: string | null
  year: number
  tax_branch?: string | null
  tax_file_number?: string | null
  contracts_info?: string | null
  contracts_amount?: number | null
  imports_info?: string | null
  imports_amount?: number | null
  lawyer_id?: string | null
  assigned_lawyer_name?: string | null
  tx_start_date?: string | null
  status: 'in_progress' | 'auditing' | 'assessed' | 'tax_cleared'
  tax_amount_assessed?: number | null
  receipt_number?: string | null
  clearance_letter_no?: string | null
  clearance_date?: string | null
  notes?: string | null
  created_at: string
}

