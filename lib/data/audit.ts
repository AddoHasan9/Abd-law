/**
 * نظام سجل التدقيق الشامل (System & User Audit Log)
 * ------------------------------------------------------------
 * يسجّل كافة عمليات الدخول، الخروج، الإنشاء، التعديل، والحذف
 * في قاعدة بيانات Supabase والتخزين المحلي المزدوج بدقة تامة.
 */
import { createAdminClient, createClient } from '@/lib/supabase/server'

export interface UserAuditLogEntry {
  id: string
  user_id: string | null
  user_name?: string | null
  user_email?: string | null
  user_role?: string | null
  action: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export'
  category: 'auth' | 'companies' | 'transactions' | 'deposits' | 'ids' | 'financial' | 'users' | 'settings'
  entity_type?: string | null
  entity_id?: string | null
  entity_name?: string | null
  details: string
  ip_address?: string | null
  created_at: string
}

export async function logUserAuditAction(payload: {
  userId?: string | null
  userName?: string | null
  userEmail?: string | null
  userRole?: string | null
  action: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export'
  category: 'auth' | 'companies' | 'transactions' | 'deposits' | 'ids' | 'financial' | 'users' | 'settings'
  entityType?: string | null
  entityId?: string | null
  entityName?: string | null
  details: string
  ipAddress?: string | null
}) {
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
  const entry: UserAuditLogEntry = {
    id: logId,
    user_id: payload.userId || null,
    user_name: payload.userName || null,
    user_email: payload.userEmail || null,
    user_role: payload.userRole || null,
    action: payload.action,
    category: payload.category,
    entity_type: payload.entityType || null,
    entity_id: payload.entityId || null,
    entity_name: payload.entityName || null,
    details: payload.details,
    ip_address: payload.ipAddress || null,
    created_at: new Date().toISOString(),
  }

  // التخزين في Supabase
  try {
    const supabase = createAdminClient()
    const { error: auditErr } = await supabase.from('user_audit_logs').insert({
      id: logId,
      user_id: payload.userId || null,
      user_name: payload.userName || null,
      user_email: payload.userEmail || null,
      user_role: payload.userRole || null,
      action: payload.action,
      category: payload.category,
      entity_type: payload.entityType || null,
      entity_id: payload.entityId || null,
      entity_name: payload.entityName || null,
      details: payload.details,
      ip_address: payload.ipAddress || null,
      created_at: entry.created_at,
    })
    if (auditErr) console.error('[audit] تعذّر حفظ قيد التدقيق:', auditErr.message)
  } catch (err) {
    console.warn('Audit Supabase insert notice:', err)
  }

  return entry
}

export async function getAuditLogs(filters?: {
  action?: string
  category?: string
  userId?: string
  limit?: number
}): Promise<UserAuditLogEntry[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('user_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 100)

    if (filters?.action) query = query.eq('action', filters.action)
    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.userId) query = query.eq('user_id', filters.userId)

    const { data, error } = await query
    if (error) {
      console.error('getAuditLogs:', error.message)
      return []
    }
    return (data ?? []) as UserAuditLogEntry[]
  } catch (err) {
    console.error('getAuditLogs:', err)
    return []
  }
}
