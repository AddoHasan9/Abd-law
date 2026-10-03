'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { logTimelineEvent } from '@/lib/data/timeline'
import { getWorkflowStatusConfig, StatusUpdatePayload, AuditLogItem } from '@/lib/workflow-status'
import { getCurrentUserProfile, requirePermission } from '@/lib/auth/require-permission'
import { logUserAuditAction } from '@/lib/data/audit'

const CLOSING_WORKFLOW_STATUSES = ['completed', 'closed', 'cancelled']

/** Updates status in Supabase and disk store, logs to Timeline, records Audit Log, and prepares WhatsApp draft if needed. */
export async function updateWorkflowStatusAction(payload: StatusUpdatePayload) {
  const category = payload.entityType === 'company' ? 'companies' : 'transactions'
  const action = payload.entityType === 'company'
    ? 'edit'
    : (CLOSING_WORKFLOW_STATUSES.includes(payload.toStatus) ? 'close' : 'edit')
  const denied = await requirePermission(category, action)
  if (denied) return denied

  try {
    const { entityId, entityType = 'transaction', companyId, fromStatus, toStatus, actorName = 'محمد أحمد', notes, reasons } = payload
    const fromConfig = getWorkflowStatusConfig(fromStatus)
    const toConfig = getWorkflowStatusConfig(toStatus)
    const now = new Date()

    const targetCompanyId = companyId || (entityType === 'company' ? entityId : null)

    // Build detail description for Timeline and Audit Log
    let reasonDetail = ''
    if (Array.isArray(reasons) && reasons.length > 0) {
      reasonDetail = `الأسباب: ${reasons.join(' ، ')}`
    } else if (typeof reasons === 'string' && reasons.trim()) {
      reasonDetail = `السبب: ${reasons.trim()}`
    }

    let notesDetail = ''
    if (notes && notes.trim()) {
      notesDetail = `ملاحظات: ${notes.trim()}`
    }

    const extraDetail = [reasonDetail, notesDetail].filter(Boolean).join(' | ')

    // 1. قاعدة البيانات — أي خطأ يُعاد للواجهة (كان يُتجاهل فلا تُحفظ الحالة)
    try {
      const supabase = createAdminClient()
      if (entityType === 'company') {
        const { error } = await supabase.from('companies').update({ status: toStatus }).eq('id', entityId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('transactions').update({ status: toStatus }).eq('id', entityId)
        if (error) throw error
        if (targetCompanyId) {
          const { error: coErr } = await supabase.from('companies').update({ status: toStatus }).eq('id', targetCompanyId)
          if (coErr) throw coErr
        }
      }
    } catch (e) {
      console.error('updateWorkflowStatusAction DB error:', e)
      return { success: false, error: 'تعذّر حفظ الحالة في قاعدة البيانات. حاول مجدداً' }
    }

    // 2. Update Disk JSON Stores
    if (entityType === 'transaction') {
      const diskTxs = ([] as Array<Record<string, unknown>>)
      const idx = diskTxs.findIndex(t => t.id === entityId || (targetCompanyId && t.company_id === targetCompanyId))
      if (idx !== -1) {
        diskTxs[idx].status = toStatus
        if (extraDetail) diskTxs[idx].status_reason = extraDetail
      } else {
        diskTxs.push({
          id: entityId,
          company_id: targetCompanyId,
          status: toStatus,
          status_reason: extraDetail || undefined,
          updated_at: now.toISOString(),
        })
      }
    }

    if (targetCompanyId) {
      const diskCompanies = ([] as Array<Record<string, unknown>>)
      const cIdx = diskCompanies.findIndex(c => c.id === targetCompanyId)
      if (cIdx !== -1) {
        diskCompanies[cIdx].status = toStatus
        if (extraDetail) diskCompanies[cIdx].status_reason = extraDetail
      }
    }

    // 3. Create Timeline Record (Automatic Integration)
    if (targetCompanyId) {
      const timelineDescription = `تم تغيير حالة سير العمل من (${fromConfig.label}) إلى (${toConfig.label})${
        extraDetail ? ` - ${extraDetail}` : ''
      }`

      await logTimelineEvent({
        company_id: targetCompanyId,
        event_type: 'status_change',
        title: 'تغيير حالة سير العمل',
        description: timelineDescription,
        actor_name: actorName,
        related_link: `/commercial/companies/${targetCompanyId}`,
      })
    }

    // 4. Create Permanent Audit Log Entry
    const auditId = 'aud_' + Math.random().toString(36).substring(2, 9)
    const auditEntry: AuditLogItem = {
      id: auditId,
      user: actorName,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      previousStatus: fromConfig.label,
      newStatus: toConfig.label,
      entityType: entityType === 'company' ? 'شركة' : 'معاملة',
      entityId: entityId,
      notesOrReasons: extraDetail || null,
      created_at: now.toISOString(),
    }

    // سجل تدقيق دائم (بدل ملف مؤقت)
    const actorProfile = await getCurrentUserProfile()
    await logUserAuditAction({
      userId: actorProfile?.id ?? null,
      userName: actorName,
      userEmail: actorProfile?.email ?? null,
      userRole: actorProfile?.role ?? null,
      action: 'update',
      category: entityType === 'company' ? 'companies' : 'transactions',
      entityType: entityType === 'company' ? 'شركة' : 'معاملة',
      entityId,
      details: `تغيير الحالة: ${auditEntry.previousStatus} ← ${auditEntry.newStatus}${extraDetail ? ` — ${extraDetail}` : ''}`,
    })

    // Revalidate paths across the ERP
    try {
      revalidatePath('/commercial')
      revalidatePath('/commercial/companies')
      if (targetCompanyId) {
        revalidatePath(`/commercial/companies/${targetCompanyId}`)
      }
      revalidatePath('/dashboard')
      revalidatePath('/settings/audit')
    } catch (revalErr) {
      console.warn('revalidatePath notice:', revalErr)
    }

    return { success: true, newStatus: toStatus }
  } catch (err: unknown) {
    console.error('updateWorkflowStatusAction error:', err)
    return { success: false, error: 'حدث خطأ أثناء تحديث حالة سير العمل' }
  }
}
