/**
 * نظام سجل التدقيق الشامل (System & User Audit Log)
 * ------------------------------------------------------------
 * يسجّل كافة عمليات الدخول، الخروج، الإنشاء، التعديل، والحذف
 * في قاعدة بيانات Supabase والتخزين المحلي المزدوج بدقة تامة.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'

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

  // 1. التخزين المحلي المزدوج (Disk JSON)
  try {
    const diskLogs = readJsonFile<UserAuditLogEntry[]>('user_audit_logs.json', [])
    diskLogs.unshift(entry)
    // الاحتفاظ بآخر 2000 سجل لضمان سرعة الأداء
    if (diskLogs.length > 2000) diskLogs.length = 2000
    writeJsonFile('user_audit_logs.json', diskLogs)
  } catch (err) {
    console.warn('Audit disk write notice:', err)
  }

  // 2. التخزين السحابي في Supabase
  try {
    const supabase = createAdminClient()
    await supabase.from('user_audit_logs').insert({
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
  const diskLogs = readJsonFile<UserAuditLogEntry[]>('user_audit_logs.json', [])

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('user_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 100)

    if (filters?.action) query = query.eq('action', filters.action)
    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.userId) query = query.eq('user_id', filters.userId)

    const { data, error } = await query

    if (!error && data && data.length > 0) {
      // Merge disk and DB
      const map = new Map<string, UserAuditLogEntry>()
      diskLogs.forEach(l => map.set(l.id, l))
      ;(data as UserAuditLogEntry[]).forEach(l => map.set(l.id, l))
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
  } catch {}

  let results = diskLogs
  if (filters?.action) results = results.filter(l => l.action === filters.action)
  if (filters?.category) results = results.filter(l => l.category === filters.category)
  if (filters?.userId) results = results.filter(l => l.user_id === filters.userId)
  return results.slice(0, filters?.limit || 100)
}
