'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'
import { getCurrentUserProfile, requirePermission } from '@/lib/auth/require-permission'
import type { Settings } from '@/types/database'

export interface WorkflowTemplateStep {
  id: string
  label: string
  owner: string
  icon?: string
}

export interface WorkflowTemplate {
  txType: string
  txLabel: string
  description?: string
  steps: WorkflowTemplateStep[]
}

const DEFAULT_WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  formation: {
    txType: 'formation',
    txLabel: 'تأسيس الشركات (قسم التأسيس)',
    description: 'المسار الرسمي المعتمد لتأسيس وتسجيل الشركات لدى دائرة مسجل الشركات',
    steps: [
      { id: 'online_submission', label: 'الإرسال على النظام', owner: 'الموظف المختص', icon: 'rocket_launch' },
      { id: 'chamber_approval', label: 'موافقة غرفة التجارة', owner: 'غرفة التجارة', icon: 'balance' },
      { id: 'union_approval', label: 'موافقة اتحاد الغرف', owner: 'اتحاد الغرف', icon: 'description' },
      { id: 'bank_letter', label: 'إصدار كتاب مصرف', owner: 'المصرف التجاري', icon: 'account_balance' },
      { id: 'company_file', label: 'عمل إضبارة الشركة', owner: 'الموظف المختص', icon: 'folder_shared' },
      { id: 'specialist_officer', label: 'الموظف المختص', owner: 'الموظف المختص', icon: 'badge' },
      { id: 'sign_decision', label: 'رفع القرار للتوقيع', owner: 'المدير العام', icon: 'draw' },
      { id: 'issue_cert', label: 'إصدار شهادة التأسيس', owner: 'مسجل الشركات', icon: 'qr_code' },
    ],
  },
  share_sale: {
    txType: 'share_sale',
    txLabel: 'بيع ونقل الأسهم',
    description: 'مسار توثيق وتنازل ونقل الحصص والأسهم للشركات المحدودة',
    steps: [
      { id: 'pay_fee', label: 'دفع الرسوم الإلكترونية', owner: 'الموظف المختص', icon: 'payments' },
      { id: 'officer_review', label: 'تدقيق الموظف المختص', owner: 'الموظف المختص', icon: 'badge' },
      { id: 'dept_head', label: 'موافقة مدير القسم', owner: 'مدير القسم', icon: 'verified_user' },
      { id: 'gm_sign', label: 'توقيع المدير العام', owner: 'المدير العام', icon: 'draw' },
      { id: 'issue_barcode', label: 'إصدار القرار والباركود', owner: 'مسجل الشركات', icon: 'qr_code' },
    ],
  },
  capital_increase: {
    txType: 'capital_increase',
    txLabel: 'زيادة رأس المال',
    description: 'مسار تعديل رأس المال وإيداع الفرق المصرفي وتعديل العقد',
    steps: [
      { id: 'pay_fee', label: 'دفع الرسوم الإلكترونية', owner: 'الموظف المختص', icon: 'payments' },
      { id: 'bank_letter', label: 'إشعار الإيداع المصرفي', owner: 'المصرف التجاري', icon: 'account_balance' },
      { id: 'officer_review', label: 'تدقيق الموظف المختص', owner: 'الموظف المختص', icon: 'badge' },
      { id: 'dept_head', label: 'موافقة مدير القسم', owner: 'مدير القسم', icon: 'verified_user' },
      { id: 'gm_sign', label: 'توقيع المدير العام', owner: 'المدير العام', icon: 'draw' },
      { id: 'issue_barcode', label: 'إصدار القرار والباركود', owner: 'مسجل الشركات', icon: 'qr_code' },
    ],
  },
  manager_change: {
    txType: 'manager_change',
    txLabel: 'تعيين أو تغيير المدير المفوض',
    description: 'توثيق قرار الهيئة العامة بتعيين أو تغيير المدير المفوض وتحديث الصلاحيات',
    steps: [
      { id: 'pay_fee', label: 'دفع الرسوم الإلكترونية', owner: 'الموظف المختص', icon: 'payments' },
      { id: 'officer_review', label: 'تدقيق الموظف المختص', owner: 'الموظف المختص', icon: 'badge' },
      { id: 'dept_head', label: 'موافقة مدير القسم', owner: 'مدير القسم', icon: 'verified_user' },
      { id: 'gm_sign', label: 'توقيع المدير العام', owner: 'المدير العام', icon: 'draw' },
      { id: 'issue_barcode', label: 'تثبيت القرار في السجل التجاري', owner: 'مسجل الشركات', icon: 'qr_code' },
    ],
  },
  address_change: {
    txType: 'address_change',
    txLabel: 'نقل مقر الشركة وتعديل النشاط',
    description: 'تعديل عقد التأسيس وتثبيت المقر الجديد في السجل الرسمي',
    steps: [
      { id: 'pay_fee', label: 'دفع الرسوم الإلكترونية', owner: 'الموظف المختص', icon: 'payments' },
      { id: 'officer_review', label: 'تدقيق الموظف المختص', owner: 'الموظف المختص', icon: 'badge' },
      { id: 'dept_head', label: 'موافقة مدير القسم', owner: 'مدير القسم', icon: 'verified_user' },
      { id: 'gm_sign', label: 'توقيع المدير العام', owner: 'المدير العام', icon: 'draw' },
      { id: 'issue_barcode', label: 'إصدار كتاب تعديل المقر الرسمي', owner: 'مسجل الشركات', icon: 'qr_code' },
    ],
  },
  paper_attestation: {
    txType: 'paper_attestation',
    txLabel: 'تصديق الأوراق والمستندات',
    description: 'مسار سريع لتصديق الوثائق والشهادات والمحاضر في دائرة تسجيل الشركات',
    steps: [
      { id: 'pay_fee', label: 'دفع الرسوم على النظام', owner: 'الموظف المختص', icon: 'payments' },
      { id: 'officer_review', label: 'إحالة للموظف المختص', owner: 'الموظف المختص', icon: 'badge' },
      { id: 'issue_barcode', label: 'التصديق وتوليد الباركود الرسمي', owner: 'مسجل الشركات', icon: 'qr_code' },
    ],
  },
}

export async function getGeneralSettingsAction(): Promise<{ success: boolean; data?: Settings; error?: string }> {
  // تُقرأ بمفتاح المدير، لذا لا تُسلَّم إلا لمستخدم مسجّل ومفعّل
  if (!(await getCurrentUserProfile())) return { success: false, error: 'غير مصرح' }
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()

    if (error || !data) {
      const fallback = readJsonFile<Settings>('general_settings.json', {
        id: 1,
        office_name: 'مكتب المحامي عبد الحسن الخزرجي',
        penalty_days: 37,
        penalty_warn: 7,
        penalty_daily: 50000,
        penalty_max: 5000000,
        currency: 'IQD',
        updated_at: new Date().toISOString(),
      })
      return { success: true, data: fallback }
    }

    return { success: true, data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'تعذر جلب الإعدادات'
    return { success: false, error: msg }
  }
}

export async function updateGeneralSettingsAction(payload: Partial<Settings>): Promise<{ success: boolean; error?: string }> {
  const denied = await requirePermission('users', 'manage_permissions')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const updateData = {
      ...payload,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('settings').update(updateData).eq('id', 1)
    if (error) {
      console.warn('Supabase settings update error, syncing disk:', error.message)
    }

    // Update local store
    writeJsonFile('general_settings.json', updateData)

    revalidatePath('/settings')
    revalidatePath('/dashboard')
    revalidatePath('/commercial')
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل تحديث الإعدادات'
    return { success: false, error: msg }
  }
}

export async function getWorkflowTemplatesAction(): Promise<{ success: boolean; data: Record<string, WorkflowTemplate> }> {
  if (!(await getCurrentUserProfile())) return { success: false, data: {} }
  try {
    const templates = readJsonFile<Record<string, WorkflowTemplate>>('workflow_templates.json', DEFAULT_WORKFLOW_TEMPLATES)
    const merged: Record<string, WorkflowTemplate> = { ...DEFAULT_WORKFLOW_TEMPLATES, ...templates }
    if (merged.formation && merged.formation.steps.some(s => s.id === 'online_submission' || s.id === 'chamber_approval')) {
      merged.formation = DEFAULT_WORKFLOW_TEMPLATES.formation
    }
    return { success: true, data: merged }
  } catch (e) {
    console.error('Failed to get workflow templates:', e)
    return { success: true, data: DEFAULT_WORKFLOW_TEMPLATES }
  }
}

export async function saveWorkflowTemplatesAction(
  templates: Record<string, WorkflowTemplate>
): Promise<{ success: boolean; error?: string }> {
  const denied = await requirePermission('users', 'manage_permissions')
  if (denied) return denied

  try {
    writeJsonFile('workflow_templates.json', templates)
    revalidatePath('/settings')
    revalidatePath('/commercial/llc')
    revalidatePath('/commercial')
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل حفظ قوالب مسارات سير العمل'
    return { success: false, error: msg }
  }
}
