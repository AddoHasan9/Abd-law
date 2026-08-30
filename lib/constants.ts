/**
 * ثوابت العمل ومنطقه — منقولة من نموذج المرحلة 1 بعد اختبارها
 * ------------------------------------------------------------
 * دوال خالصة بلا أي اعتماد على الشبكة أو قاعدة البيانات،
 * فيمكن اختبارها وحدها واستعمالها في الخادم والمتصفح معاً.
 */

import type {
  TxPriority, WfState, StageState,
  LeadStage, CommChannel, Company, PenaltyState,
} from '@/types/database'

/* ============================================================
   1) أنواع المعاملات الثمانية عشر (6.2.2 من الوثيقة)
   ============================================================ */
export interface TxType {
  id: string
  label: string
  /** معاملة تأسيس — تفتح حقول الشركة والنواقص */
  formation?: boolean
  /** معاملة هوية — تفتح حقول الهاتف والمبلغ */
  identity?: 'new' | 'renew'
}

export const TX_TYPES: TxType[] = [
  { id: 'formation',     label: 'تأسيس شركة', formation: true },
  { id: 'share-sale',    label: 'بيع أسهم' },
  { id: 'relocation',    label: 'نقل مقر' },
  { id: 'capital-up',    label: 'زيادة رأس المال' },
  { id: 'activity',      label: 'إضافة وحذف نشاط' },
  { id: 'mgr-renew',     label: 'استمرار تعيين مدير مفوّض' },
  { id: 'final-acc',     label: 'حسابات ختامية' },
  { id: 'certify',       label: 'تصديق أوراق' },
  { id: 'tax-assess',    label: 'تحاسب ضريبي' },
  { id: 'tax-clear',     label: 'براءة ذمة ضريبية' },
  { id: 'tax-id-renew',  label: 'تجديد هوية ضريبية', identity: 'renew' },
  { id: 'tax-id-new',    label: 'إصدار هوية ضريبية', identity: 'new' },
  { id: 'chamber-new',   label: 'إصدار هوية غرفة',   identity: 'new' },
  { id: 'chamber-renew', label: 'تجديد هوية غرفة',   identity: 'renew' },
  { id: 'plan-id',       label: 'إصدار هوية تخطيط',  identity: 'new' },
  { id: 'plan-id-renew', label: 'تجديد هوية تخطيط', identity: 'renew' },
  { id: 'importer-id-new', label: 'إصدار هوية مستورد', identity: 'new' },
  { id: 'importer-id-renew', label: 'تجديد هوية مستورد', identity: 'renew' },
  { id: 'importer_id',   label: 'هوية مستورد',       identity: 'new' },
  { id: 'contract-tax',  label: 'تحاسب عقد غير متحاسب' },
  { id: 'ss-include',    label: 'شمول ضمان' },
  { id: 'ss-statement',  label: 'كشف ضمان اجتماعي' },
]

export const txType = (id: string): TxType =>
  TX_TYPES.find(t => t.id === id) ?? { id, label: '—' }

/* ============================================================
   2) الحالات والأولويات — مع أصناف الوسم
   ============================================================ */
export interface Labeled<T extends string> { id: T; label: string; tag: string }

import { WORKFLOW_STATUS_LIST } from '@/lib/workflow-status'

export const STATUSES = WORKFLOW_STATUS_LIST.map(s => ({
  id: s.key,
  label: s.label,
  tag: s.key,
}))


export const PRIORITIES: (Labeled<TxPriority> & { rank: number })[] = [
  { id: 'low',    label: 'منخفضة', rank: 1, tag: 'tag-mute' },
  { id: 'medium', label: 'متوسطة', rank: 2, tag: 'tag-work' },
  { id: 'high',   label: 'عالية',  rank: 3, tag: 'tag-warn' },
  { id: 'urgent', label: 'عاجلة',  rank: 4, tag: 'tag-bad'  },
]

export const WF_STATES: Labeled<WfState>[] = [
  { id: 'wait',  label: 'في الانتظار', tag: 'tag-mute' },
  { id: 'doing', label: 'قيد التنفيذ', tag: 'tag-work' },
  { id: 'done',  label: 'مكتملة',      tag: 'tag-ok'   },
]

export const STAGE_STATES: Labeled<StageState>[] = [
  { id: 'idle',     label: 'لم تبدأ',   tag: 'tag-mute' },
  { id: 'progress', label: 'قيد العمل', tag: 'tag-work' },
  { id: 'done',     label: 'مكتملة',    tag: 'tag-ok'   },
]

export const LEAD_STAGES: Labeled<LeadStage>[] = [
  { id: 'new',       label: 'جديد',   tag: 'tag-mute' },
  { id: 'followup',  label: 'متابعة', tag: 'tag-work' },
  { id: 'qualified', label: 'مؤهّل',  tag: 'tag-warn' },
  { id: 'converted', label: 'تحوّل',   tag: 'tag-ok'   },
]

export const CHANNELS: { id: CommChannel; label: string }[] = [
  { id: 'phone',    label: 'اتصال هاتفي' },
  { id: 'whatsapp', label: 'واتساب' },
  { id: 'email',    label: 'بريد إلكتروني' },
  { id: 'visit',    label: 'زيارة للمكتب' },
]

const pick = <T extends string>(list: Labeled<T>[], id: T | string): Labeled<T> =>
  list.find(x => x.id === id) ?? list[0]

export const statusOf     = (id: string) => pick(STATUSES, id)
export const priorityOf   = (id: string) => pick(PRIORITIES, id)
export const wfStateOf    = (id: string) => pick(WF_STATES, id)
export const stageStateOf = (id: string) => pick(STAGE_STATES, id)

/* ============================================================
   3) مخطط سير العمل — خطوات تأسيس الشركات الرسمية الـ 8
   ============================================================ */
export interface WfDef { id: string; label: string; owner: string }

export const WORKFLOW: WfDef[] = [
  { id: 'online_submission', label: 'الإرسال على النظام',     owner: 'الموظف المختص' },
  { id: 'chamber_approval',  label: 'موافقة غرفة التجارة',    owner: 'غرفة التجارة' },
  { id: 'union_approval',    label: 'موافقة اتحاد الغرف',     owner: 'اتحاد الغرف' },
  { id: 'bank_letter',       label: 'إصدار كتاب مصرف',        owner: 'المصرف التجاري' },
  { id: 'company_file',      label: 'عمل إضبارة الشركة',      owner: 'مسجل الشركات' },
  { id: 'specialist_officer',label: 'الموظف المختص',          owner: 'الموظف المختص' },
  { id: 'sign_decision',     label: 'رفع القرار للتوقيع',     owner: 'مسجل الشركات' },
  { id: 'issue_cert',        label: 'إصدار شهادة التأسيس',    owner: 'مسجل الشركات' },
]

/* ============================================================
   4) محطات الوديعة — الإرسال على النظام هي الحاسمة
   ============================================================ */
export interface StageDef { id: string; label: string; critical?: boolean }

export const DEPOSIT_STAGES: StageDef[] = [
  { id: 'submit',     label: 'إرسال على النظام', critical: true },
  { id: 'advisor',    label: 'مشاور' },
  { id: 'accountant', label: 'محاسب' },
]

/* ============================================================
   5) الخدمات التي قد يشملها المبلغ المستلم عند التأسيس
   ------------------------------------------------------------
   المعرّفات هنا تطابق قيم id_type المستعملة في وحدة الهويات
   (importer_id / tax_id / chamber_id / planning_id) كي تبقى
   المفردات موحّدة بين شاشة التأسيس ووحدة الهويات المنفصلة.
   ============================================================ */
export interface FormationService {
  id: string
  label: string
  defaultChecked: boolean
  /** خدمة أساسية تُشمل إلزامياً بكل معاملة تأسيس ولا يمكن إلغاؤها */
  locked?: boolean
}

export const FORMATION_SERVICES: FormationService[] = [
  { id: 'tasis',             label: 'تأسيس الشركة',               defaultChecked: true },
  { id: 'bank_letter',        label: 'كتاب مصرف',                  defaultChecked: false },
  { id: 'importer_id',       label: 'هوية مستورد',                defaultChecked: false },
  { id: 'tax_id',            label: 'هوية ضريبية',                defaultChecked: false },
  { id: 'chamber_id',        label: 'هوية الغرفة التجارية',        defaultChecked: false },
  { id: 'contractors_union',  label: 'اتحاد المقاولين (هوية وجدارية)', defaultChecked: false },
  { id: 'planning_id',       label: 'هوية التخطيط',               defaultChecked: false },
  { id: 'legal_consultant',  label: 'مشاور قانوني',               defaultChecked: false },
  { id: 'accountant',        label: 'محاسب',                      defaultChecked: false },
]

/* ============================================================
   محافظات العراق الرسمية (لكتب الحجز والتسجيل التجاري)
   ============================================================ */
export const IRAQ_GOVERNORATES = [
  'بغداد',
  'البصرة',
  'نينوى',
  'أربيل',
  'النجف الأشرف',
  'كربلاء المقدسة',
  'كركوك',
  'الأنبار',
  'بابل',
  'ديالى',
  'واسط',
  'صلاح الدين',
  'ميسان',
  'ذي قار',
  'المثنى',
  'القادسية (الديوانية)',
  'السليمانية',
  'دهوك',
] as const

/* ============================================================
   6) الأدوار والصلاحيات (القسم 9 من الوثيقة)
   ============================================================ */
export const ROLE_LABELS = {
  admin:   'أدمن',
  manager: 'مدير',
  lawyer:  'محامي',
} as const

const CAPS: Record<string, string[]> = {
  super_admin: ['*'],
  admin:   ['*'],
  manager: ['tx.viewAll','tx.assign','tx.step','perf.all','pay.view','pay.edit',
            'hr.manage','doc.manage','crm.manage','audit.read','settings.partial','report.view'],
  lawyer:  ['tx.viewOwn','tx.step','perf.self','crm.manage','report.view'],
  staff:   ['tx.viewOwn','report.view'],
}

export function can(role: string | null | undefined, cap: string): boolean {
  if (!role) return false
  const list = CAPS[role]
  if (!list) return false
  return list.includes('*') || list.includes(cap)
}

/** أدمن أو مدير — يطابق دالة is_staff() في القاعدة */
export const isStaff = (role?: string | null) =>
  role === 'super_admin' || role === 'admin' || role === 'manager'

/* ============================================================
   7) قاعدة الغرامة — FR-EST-5/6
   المهلة 37 يوماً من تاريخ الشهادة، 50,000 د.ع يومياً،
   بسقف 5,154,000 د.ع يُبلَغ في اليوم 104.
   ============================================================ */
export interface PenaltyConfig {
  penaltyDays: number
  penaltyWarn: number
  penaltyDaily: number
  penaltyMax: number
}

export const DEFAULT_PENALTY: PenaltyConfig = {
  penaltyDays:  37,
  penaltyWarn:  7,
  penaltyDaily: 50_000,
  penaltyMax:   5_154_000,
}

function parseLocalDate(d: string | Date): Date {
  if (d instanceof Date) return d
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, day)
  }
  return new Date(d)
}

/** فرق الأيام بين تاريخين، متجاهلاً الوقت والمنطقة الزمنية */
export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const a = parseLocalDate(from)
  const b = parseLocalDate(to)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

export function penaltyAmount(daysLate: number, cfg = DEFAULT_PENALTY): number {
  const d = Math.max(0, daysLate)
  return Math.min(d * cfg.penaltyDaily, cfg.penaltyMax)
}

/** اليوم الذي يُبلَغ فيه السقف — 104 بالإعدادات الافتراضية */
export function penaltyCapDay(cfg = DEFAULT_PENALTY): number | null {
  return cfg.penaltyDaily > 0 ? Math.ceil(cfg.penaltyMax / cfg.penaltyDaily) : null
}

/**
 * حالة الغرامة لشركة.
 * ترجع null إذا لم يُدخل تاريخ الشهادة، أو إذا أُرسلت على النظام
 * (submitted = true) لأن الإرسال يوقف الاحتساب نهائياً.
 */
export function penaltyState(
  company: Pick<Company, 'cert_date'> & Partial<Pick<Company, 'kind' | 'status' | 'deposit_released'>> & { shareholder_count?: number },
  submitted: boolean,
  cfg = DEFAULT_PENALTY
): PenaltyState | null {
  if (!company.cert_date || submitted) return null
  if (company.deposit_released === true || company.status === 'established') return null

  const isMulti = company.kind !== 'فردية' || (company.shareholder_count && company.shareholder_count > 1)
  const penaltyDays = isMulti ? 55 : 37

  const certDateObj = parseLocalDate(company.cert_date)
  const daysPassed = Math.max(0, -daysBetween(certDateObj))

  const due = new Date(certDateObj)
  due.setDate(due.getDate() + penaltyDays)

  const daysLeft = daysBetween(due)
  const daysLate = Math.max(0, -daysLeft)
  const amount   = penaltyAmount(daysLate, cfg)
  const capped   = daysLate > 0 && amount >= cfg.penaltyMax

  const canSubmitYet = !isMulti || daysPassed >= 15
  const daysUntilSubmitAllowed = isMulti && daysPassed < 15 ? 15 - daysPassed : 0

  return {
    due: due.toISOString().slice(0, 10),
    daysLeft,
    daysLate,
    amount,
    capped,
    canSubmitYet,
    daysUntilSubmitAllowed,
    level: daysLeft <= 0 ? 'late' : daysLeft <= cfg.penaltyWarn ? 'soon' : 'ok',
    label: daysLeft > 0
      ? `${daysLeft} يوم متبقٍ`
      : `متأخرة ${daysLate} يوم · ${formatMoney(amount)}${capped ? ' (بلغت السقف)' : ''}`,
  }
}

/* ============================================================
   8) التنسيق
   ============================================================ */
const AR_MONTHS = [
  'كانون الثاني','شباط','آذار','نيسان','أيار','حزيران',
  'تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول',
]

const AR_WEEKDAYS = [
  'الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت',
]

export function formatDate(d: string | Date | null | undefined, long = false): string {
  if (!d) return '—'
  const x = new Date(d)
  if (isNaN(x.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return long
    ? `${x.getDate()} ${AR_MONTHS[x.getMonth()]} ${x.getFullYear()}`
    : `${x.getFullYear()}/${p(x.getMonth() + 1)}/${p(x.getDate())}`
}

/** التاريخ الكامل بالعربية وبأرقام لاتينية: «الأحد، 30 آب 2026» */
export function formatFullDate(d: string | Date | null | undefined = new Date()): string {
  const x = d ? new Date(d) : new Date()
  if (isNaN(x.getTime())) return '—'
  return `${AR_WEEKDAYS[x.getDay()]}، ${x.getDate()} ${AR_MONTHS[x.getMonth()]} ${x.getFullYear()}`
}

/** الوقت بصيغة 24 ساعة وبأرقام لاتينية: «14:05» */
export function formatTime(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const x = new Date(d)
  if (isNaN(x.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(x.getHours())}:${p(x.getMinutes())}`
}

export function formatMoney(n: number | null | undefined, currency = 'IQD'): string {
  const v = Number(n ?? 0).toLocaleString('en-US')
  return currency === 'IQD' ? `${v} د.ع` : `${v} $`
}

/** تحويل الرقم إلى نص بأرقام مفصولة بفواصل دون إضافة رمز العملة */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '0'
  return Number(n).toLocaleString('en-US')
}

/**
 * دالة لتنسيق النصوص والأرقام المدخلة في حقول رأس المال والمبالغ بفواصل الآلاف أثناء الكتابة (مثال: 50,000,000)
 */
export function formatNumberWithCommas(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const str = String(value).replace(/[^0-9.]/g, '')
  if (!str) return ''

  const parts = str.split('.')
  // تنسيق الجزء الصحيح بفواصل الآلاف
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  if (parts.length > 1) {
    return `${intPart}.${parts.slice(1).join('')}`
  }
  return intPart
}

/**
 * دالة استخراج الرقم الصافي كـ number بدون فواصل من النصوص المدخلة
 */
export function parseNumberFromCommas(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const clean = String(value).replace(/[^0-9.]/g, '')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

/* ============================================================
   9) تقدّم سير العمل
   ============================================================ */
export interface WfProgress {
  done: number
  total: number
  pct: number
  current: WfDef | null
  complete: boolean
}

export function wfProgress(
  steps: { step_key: string; state: WfState }[] | null | undefined
): WfProgress {
  const list  = steps ?? []
  const total = WORKFLOW.length
  const done  = list.filter(s => s.state === 'done').length
  const cur   = list.find(s => s.state === 'doing')
  return {
    done, total,
    pct: total ? Math.round((done / total) * 100) : 0,
    current: cur ? WORKFLOW.find(w => w.id === cur.step_key) ?? null : null,
    complete: total > 0 && done === total,
  }
}

/** حالة الشركة مشتقّة من مخططها — لا تُخزَّن في القاعدة */
export function companyStatus(steps: { state: WfState }[] | null | undefined) {
  const done = (steps ?? []).filter(s => s.state === 'done').length
  return done === WORKFLOW.length
    ? { id: 'done',     label: 'منجزة',       tag: 'tag-ok'   }
    : { id: 'progress', label: 'قيد التنفيذ', tag: 'tag-work' }
}
