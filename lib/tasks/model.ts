/** نموذج المهام — أنواع وخيارات وحساب موعد التذكير (مشترك بين الخادم والواجهة) */

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'normal' | 'urgent'

export interface ChecklistItem { text: string; done: boolean }

export interface Task {
  id: string
  title: string
  agency: string | null
  notes: string | null
  task_date: string | null
  task_time: string | null
  priority: TaskPriority
  status: TaskStatus
  company_id: string | null
  company_name: string | null
  assignee_id: string | null
  owner_id: string | null
  checklist: ChecklistItem[]
  remind_before: number | null
  result_notes: string | null
  done_at: string | null
  created_at: string
  updated_at: string
  // مُشتقّة للعرض
  assignee_name?: string | null
  company_display?: string | null
}

export interface TaskInput {
  title: string
  agency?: string | null
  notes?: string | null
  task_date?: string | null
  task_time?: string | null
  priority?: TaskPriority
  company_id?: string | null
  company_name?: string | null
  assignee_id?: string | null
  checklist?: ChecklistItem[]
  remind_before?: number | null
}

export const STATUS_META: Record<TaskStatus, { label: string; tone: string }> = {
  todo: { label: 'لم تبدأ', tone: 'neutral' },
  in_progress: { label: 'جارية', tone: 'work' },
  done: { label: 'منجزة', tone: 'ok' },
}

/** خيارات التذكير (دقائق قبل الموعد؛ null = بدون) */
export const REMIND_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'بدون' },
  { value: 0, label: 'عند الموعد' },
  { value: 15, label: 'قبل 15 د' },
  { value: 60, label: 'قبل ساعة' },
  { value: 1440, label: 'قبل يوم' },
]

export function remindLabel(v: number | null | undefined): string {
  if (v == null) return ''
  const o = REMIND_OPTIONS.find(x => x.value === v)
  if (o) return o.label
  if (v % 1440 === 0) return `قبل ${v / 1440} يوم`
  if (v % 60 === 0) return `قبل ${v / 60} ساعة`
  return `قبل ${v} د`
}

/** دوائر شائعة تُقترح أثناء الكتابة (تُضاف إليها الدوائر المستخدمة سابقاً) */
export const COMMON_AGENCIES = [
  'وزارة الخارجية',
  'مسجل الشركات',
  'دائرة تسجيل الشركات',
  'الهيئة العامة للضرائب',
  'غرفة تجارة بغداد',
  'اتحاد الغرف التجارية',
  'كاتب العدل',
  'محكمة البداءة',
  'محكمة الأحوال الشخصية',
  'محكمة استئناف بغداد',
  'دائرة التسجيل العقاري',
  'وزارة التجارة',
  'البنك المركزي العراقي',
  'المصرف',
  'دائرة الضمان الاجتماعي',
  'وزارة التخطيط',
  'الجهاز المركزي للتقييس والسيطرة النوعية',
  'هيئة الاستثمار',
  'دائرة الجنسية والأحوال المدنية',
  'الكمارك',
]

/** "HH:MM" من وقت قاعدة البيانات "HH:MM:SS" */
export const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null)

export const DEFAULT_TASK_TIME = '09:00'

/**
 * موعد التذكير = موعد المهمة − remind_before (توقيت بغداد كتاريخ/وقت محليين).
 * بلا تاريخ أو بلا تذكير ⇒ null.
 */
export function reminderDueFor(taskDate: string | null | undefined, taskTime: string | null | undefined, remindBefore: number | null | undefined): { date: string; time: string } | null {
  if (!taskDate || remindBefore == null) return null
  const [y, mo, d] = taskDate.split('-').map(Number)
  const [h, mi] = (hhmm(taskTime) || DEFAULT_TASK_TIME).split(':').map(Number)
  const t = Date.UTC(y, mo - 1, d, h, mi) - remindBefore * 60_000
  const dt = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`,
    time: `${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}`,
  }
}

/** تنظيف قائمة الأوراق: نصوص غير فارغة، حدّ أقصى 30 عنصراً */
export function cleanChecklist(list: unknown): ChecklistItem[] {
  if (!Array.isArray(list)) return []
  return list
    .map(x => ({ text: String((x as ChecklistItem)?.text ?? '').trim().slice(0, 200), done: Boolean((x as ChecklistItem)?.done) }))
    .filter(x => x.text)
    .slice(0, 30)
}
