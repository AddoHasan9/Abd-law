/**
 * Centralized Workflow Status System Constants & Definitions
 * ------------------------------------------------------------
 * Pure definitions, styling tokens, types, and helper functions.
 * Safe for import in Client and Server components.
 */

export type WorkflowStatusKey =
  | 'new'
  | 'in_progress'
  | 'under_review'
  | 'waiting_client'
  | 'waiting_government'
  | 'completed'
  | 'closed'
  | 'cancelled'

export interface WorkflowStatusConfig {
  key: WorkflowStatusKey
  label: string
  bg: string
  border: string
  text: string
  aliases?: string[]
}

export const WORKFLOW_STATUS_CONFIGS: Record<WorkflowStatusKey, WorkflowStatusConfig> = {
  new: {
    key: 'new',
    label: 'جديدة',
    bg: 'rgba(148, 163, 184, 0.14)',
    border: 'rgba(148, 163, 184, 0.35)',
    text: '#94A3B8',
    aliases: ['new'],
  },
  in_progress: {
    key: 'in_progress',
    label: 'قيد التنفيذ',
    bg: 'rgba(14, 116, 144, 0.18)',
    border: 'rgba(56, 189, 248, 0.45)',
    text: '#38BDF8',
    aliases: ['progress', 'in_progress', 'doing', 'قيد الإنجاز'],
  },
  under_review: {
    key: 'under_review',
    label: 'قيد المراجعة',
    bg: 'rgba(99, 102, 241, 0.18)',
    border: 'rgba(129, 140, 248, 0.4)',
    text: '#818CF8',
    aliases: ['under_review', 'review'],
  },
  waiting_client: {
    key: 'waiting_client',
    label: 'بانتظار العميل',
    bg: 'rgba(180, 83, 9, 0.18)',
    border: 'rgba(251, 191, 36, 0.45)',
    text: '#FBBF24',
    aliases: ['waiting_client', 'hold', 'wait_client', 'بانتظار الإجراء'],
  },
  waiting_government: {
    key: 'waiting_government',
    label: 'بانتظار الجهات الحكومية',
    bg: 'rgba(194, 102, 10, 0.18)',
    border: 'rgba(251, 146, 60, 0.45)',
    text: '#FB923C',
    aliases: ['waiting_government', 'wait_gov'],
  },
  completed: {
    key: 'completed',
    label: 'مكتملة',
    bg: 'rgba(16, 185, 129, 0.18)',
    border: 'rgba(52, 211, 153, 0.45)',
    text: '#34D399',
    aliases: ['completed', 'done', 'established', 'منجزة'],
  },
  closed: {
    key: 'closed',
    label: 'مغلقة',
    bg: 'rgba(100, 116, 139, 0.18)',
    border: 'rgba(148, 163, 184, 0.35)',
    text: '#94A3B8',
    aliases: ['closed'],
  },
  cancelled: {
    key: 'cancelled',
    label: 'ملغاة',
    bg: 'rgba(185, 28, 28, 0.18)',
    border: 'rgba(248, 113, 113, 0.45)',
    text: '#F87171',
    aliases: ['cancelled', 'rejected'],
  },
}

export const WORKFLOW_STATUS_LIST: WorkflowStatusConfig[] = Object.values(WORKFLOW_STATUS_CONFIGS)

/** Normalizes raw status string to one of the 8 canonical WorkflowStatusKey */
export function normalizeWorkflowStatus(rawStatus?: string | null): WorkflowStatusKey {
  if (!rawStatus) return 'new'
  const cleaned = rawStatus.trim().toLowerCase()
  for (const config of WORKFLOW_STATUS_LIST) {
    if (config.key === cleaned) return config.key
    if (config.aliases && config.aliases.includes(cleaned)) return config.key
  }
  return 'new'
}

export function getWorkflowStatusConfig(statusKey?: string | null): WorkflowStatusConfig {
  const canonicalKey = normalizeWorkflowStatus(statusKey)
  return WORKFLOW_STATUS_CONFIGS[canonicalKey]
}

export interface StatusUpdatePayload {
  entityId: string
  entityType?: 'company' | 'transaction'
  companyId?: string | null
  fromStatus: string
  toStatus: WorkflowStatusKey
  actorName?: string
  notes?: string | null
  reasons?: string[] | string | null
}

export interface AuditLogItem {
  id: string
  user: string
  date: string
  time: string
  previousStatus: string
  newStatus: string
  entityType: string
  entityId: string
  notesOrReasons?: string | null
  created_at: string
}
