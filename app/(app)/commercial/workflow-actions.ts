'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'
import { logTimelineEvent } from '@/lib/data/timeline'
import { getWorkflowStatusConfig, StatusUpdatePayload, AuditLogItem } from '@/lib/workflow-status'
import { requirePermission } from '@/lib/auth/require-permission'

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

    // 1. Update Supabase
    try {
      const supabase = createAdminClient()
      if (entityType === 'company') {
        await supabase
          .from('companies')
          .update({
            status: toStatus,
          })
          .eq('id', entityId)
      } else {
        await supabase
          .from('transactions')
          .update({
            status: toStatus,
          })
          .eq('id', entityId)

        if (targetCompanyId) {
          await supabase
            .from('companies')
            .update({
              status: toStatus,
            })
            .eq('id', targetCompanyId)
        }
      }
    } catch (e) {
      console.warn('updateWorkflowStatusAction Supabase update notice:', e)
    }

    // 2. Update Disk JSON Stores
    if (entityType === 'transaction') {
      const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
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
      writeJsonFile('transactions.json', diskTxs)
    }

    if (targetCompanyId) {
      const diskCompanies = readJsonFile<Array<Record<string, unknown>>>('companies.json', [])
      const cIdx = diskCompanies.findIndex(c => c.id === targetCompanyId)
      if (cIdx !== -1) {
        diskCompanies[cIdx].status = toStatus
        if (extraDetail) diskCompanies[cIdx].status_reason = extraDetail
        writeJsonFile('companies.json', diskCompanies)
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

    try {
      const diskAudit = readJsonFile<AuditLogItem[]>('audit_logs.json', [])
      diskAudit.unshift(auditEntry)
      writeJsonFile('audit_logs.json', diskAudit)
    } catch (e) {
      console.warn('Audit log disk write notice:', e)
    }

    // 5. Automatic Notification Workflow Draft for "Waiting for Client"
    if (toStatus === 'waiting_client' && targetCompanyId) {
      try {
        const drafts = readJsonFile<Array<Record<string, unknown>>>('whatsapp_drafts.json', [])
        const draftMessage = `مرحباً بك، تود الإدارة إعلامكم بأن معاملتكم قد أصبحت بحالة (بانتظار العميل).\n${
          extraDetail ? `المطلوب: ${extraDetail}\n` : ''
        }يرجى تزويدنا بالمطلوب لاستكمال الإجراءات بأسرع وقت.`

        drafts.unshift({
          id: 'draft_' + Math.random().toString(36).substring(2, 9),
          company_id: targetCompanyId,
          type: 'waiting_client_notice',
          message: draftMessage,
          status: 'ready_for_review',
          created_at: now.toISOString(),
        })
        writeJsonFile('whatsapp_drafts.json', drafts)
      } catch (e) {
        console.warn('WhatsApp draft notice:', e)
      }
    }

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
