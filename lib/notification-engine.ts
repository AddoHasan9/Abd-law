/**
 * محرك تنبيهات المواعيد وانتهاء الهويات والترخيص (Reusable Expiry & Deadline Notification Engine)
 * -------------------------------------------------------------------------------------
 * يقدم محركاً شاملاً وموحداً لمراقبة مواعيد انتهاء الهويات الحكومية (الضريبية، المستورد، الغرفة التجارية،
 * التخطيط، البلدية وغيرها)، الحسابات الختامية، الودائع، والعلامات التجارية تلقائياً.
 *
 * مستويات الأولوية حسب المتبقي من الأيام:
 * 🟢 > 60 يوماً  ← لا يتطلب تنبيهاً.
 * 🟡 31–60 يوماً ← تحذير (Warning).
 * 🟠 15–30 يوماً ← أولوية مرتفعة (High Priority).
 * 🔴 0–14 يوماً  ← تنبيه حرج (Critical Alert).
 * ⚫ < 0 أيام     ← منتهية الصلاحية (Expired).
 */

import { createAdminClient } from '@/lib/supabase/server'
import { readJsonFile } from '@/lib/data/fs-store'
import type { CompanyIDRecord, Company } from '@/types/database'

export type AlertCategory =
  | 'government_id'
  | 'financial_statement'
  | 'deposit_deadline'
  | 'trademark_renewal'
  | 'license_renewal'
  | 'general_legal'

export type PriorityLevel = 'expired' | 'critical' | 'high' | 'warning' | 'ok'

export interface ExpiryAlertItem {
  id: string
  entityId: string
  companyId: string
  companyName: string
  category: AlertCategory
  categoryLabel: string
  title: string
  idType?: string
  idNumber?: string
  managerName?: string
  issueDate?: string | null
  expiryDate: string
  daysLeft: number
  priority: PriorityLevel
  priorityLabel: string
  badgeClass: string
  colorTheme: {
    bg: string
    border: string
    text: string
    badgeBg: string
    badgeText: string
  }
  profileUrl: string
  sectionUrl: string
  inProgress?: boolean
}

export const ID_TYPE_LABELS: Record<string, string> = {
  tax_id: 'الهوية الضريبية',
  chamber_id: 'هوية الغرفة التجارية',
  importer_id: 'هوية المستورد',
  planning_id: 'هوية التخطيط العمراني',
  municipality_id: 'ترخيص البلدية',
  commercial_reg: 'السجل التجاري',
  trademark: 'العلامة التجارية',
}

/** يحسب عدد الأيام المتبقية بالنسبة لتاريخ اليوم ومستوى الأولوية */
export function calculateExpiryDaysAndPriority(expiryDateStr: string): {
  daysLeft: number
  priority: PriorityLevel
  priorityLabel: string
  badgeClass: string
  colorTheme: ExpiryAlertItem['colorTheme']
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expDate = new Date(expiryDateStr)
  expDate.setHours(0, 0, 0, 0)

  const diffTime = expDate.getTime() - today.getTime()
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) {
    const absDays = Math.abs(daysLeft)
    const label = absDays === 0 ? 'انتهت اليوم' : absDays === 1 ? 'منتهية منذ يوم واحد' : `منتهية الصلاحية منذ ${absDays} يوماً`
    return {
      daysLeft,
      priority: 'expired',
      priorityLabel: label,
      badgeClass: 'tag-bad',
      colorTheme: {
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.4)',
        text: 'var(--bad, #ef4444)',
        badgeBg: '#dc2626',
        badgeText: '#ffffff',
      },
    }
  }

  if (daysLeft <= 14) {
    return {
      daysLeft,
      priority: 'critical',
      priorityLabel: `تنبيه حرج — تنتهي خلال ${daysLeft === 0 ? 'اليوم' : daysLeft === 1 ? 'يوم واحد' : daysLeft + ' يوماً'}`,
      badgeClass: 'tag-bad',
      colorTheme: {
        bg: 'rgba(239, 68, 68, 0.08)',
        border: 'rgba(239, 68, 68, 0.35)',
        text: 'var(--bad, #ef4444)',
        badgeBg: '#dc2626',
        badgeText: '#ffffff',
      },
    }
  }

  if (daysLeft <= 30) {
    return {
      daysLeft,
      priority: 'high',
      priorityLabel: `أولوية مرتفعة — تنتهي خلال ${daysLeft} يوماً`,
      badgeClass: 'tag-warn',
      colorTheme: {
        bg: 'rgba(249, 115, 22, 0.08)',
        border: 'rgba(249, 115, 22, 0.35)',
        text: 'var(--orange, #f97316)',
        badgeBg: '#ea580c',
        badgeText: '#ffffff',
      },
    }
  }

  if (daysLeft <= 60) {
    return {
      daysLeft,
      priority: 'warning',
      priorityLabel: `تحذير — تنتهي خلال ${daysLeft} يوماً`,
      badgeClass: 'tag-warn',
      colorTheme: {
        bg: 'rgba(245, 158, 11, 0.08)',
        border: 'rgba(245, 158, 11, 0.35)',
        text: 'var(--warn, #f59e0b)',
        badgeBg: '#d97706',
        badgeText: '#ffffff',
      },
    }
  }

  return {
    daysLeft,
    priority: 'ok',
    priorityLabel: `صالحة (${daysLeft} يوماً)`,
    badgeClass: 'tag-ok',
    colorTheme: {
      bg: 'rgba(16, 185, 129, 0.05)',
      border: 'rgba(16, 185, 129, 0.2)',
      text: '#047857',
      badgeBg: '#10b981',
      badgeText: '#ffffff',
    },
  }
}

/** يجلب كافة التنبيهات النشطة للهويات القانونية التي تفصلها 60 يوماً أو أقل عن الانتهاء مع فرز ذكي */
export async function getActiveExpiryAlerts(): Promise<ExpiryAlertItem[]> {
  const alerts: ExpiryAlertItem[] = []
  const seenKeys = new Set<string>()

  try {
    const supabase = createAdminClient()

    // 1. جلب الهويات الحكومية من قاعدة البيانات Supabase
    try {
      const { data: dbIDs } = await supabase
        .from('company_ids')
        .select('*, companies(name)')

      for (const rec of dbIDs || []) {
        if (!rec.expiry_date || !rec.company_id) continue
        const companyName = (rec as unknown as { companies?: { name?: string } | null }).companies?.name || rec.company_name || 'شركة غير معرفة'
        const calc = calculateExpiryDaysAndPriority(rec.expiry_date)
        if (calc.priority === 'ok') continue

        const key = `id_${rec.id}`
        if (seenKeys.has(key)) continue
        seenKeys.add(key)

        const title = ID_TYPE_LABELS[rec.id_type] || rec.id_type || 'هوية حكومية'

        alerts.push({
          id: key,
          entityId: rec.id,
          companyId: rec.company_id,
          companyName,
          category: 'government_id',
          categoryLabel: 'هوية حكومية',
          title,
          idType: rec.id_type,
          idNumber: rec.id_number || undefined,
          managerName: rec.manager_name || undefined,
          issueDate: rec.issue_date,
          expiryDate: rec.expiry_date,
          daysLeft: calc.daysLeft,
          priority: calc.priority,
          priorityLabel: calc.priorityLabel,
          badgeClass: calc.badgeClass,
          colorTheme: calc.colorTheme,
          profileUrl: `/commercial/companies/${rec.company_id}`,
          sectionUrl: `/commercial/companies/${rec.company_id}?tab=ids`,
        })
      }
    } catch (err) {
      console.warn('getActiveExpiryAlerts DB company_ids notice:', err)
    }

    // 2. فحص التخزين القرصي المساعد (company_ids.json & companies.json)
    try {
      const diskIDs = readJsonFile<CompanyIDRecord[]>('company_ids.json', [])
      const diskCompanies = readJsonFile<Company[]>('companies.json', [])
      const compMap = new Map<string, string>()
      diskCompanies.forEach(c => compMap.set(c.id, c.name))

      for (const rec of diskIDs) {
        if (!rec.expiry_date || !rec.company_id) continue
        const key = `id_${rec.id}`
        if (seenKeys.has(key)) continue

        const calc = calculateExpiryDaysAndPriority(rec.expiry_date)
        if (calc.priority === 'ok') continue

        seenKeys.add(key)
        const companyName = compMap.get(rec.company_id) || rec.company_name || 'شركة غير معرفة'
        const title = ID_TYPE_LABELS[rec.id_type] || rec.id_type || 'هوية حكومية'

        alerts.push({
          id: key,
          entityId: rec.id,
          companyId: rec.company_id,
          companyName,
          category: 'government_id',
          categoryLabel: 'هوية حكومية',
          title,
          idType: rec.id_type,
          idNumber: rec.id_number || undefined,
          managerName: rec.manager_name || undefined,
          issueDate: rec.issue_date,
          expiryDate: rec.expiry_date,
          daysLeft: calc.daysLeft,
          priority: calc.priority,
          priorityLabel: calc.priorityLabel,
          badgeClass: calc.badgeClass,
          colorTheme: calc.colorTheme,
          profileUrl: `/commercial/companies/${rec.company_id}`,
          sectionUrl: `/commercial/companies/${rec.company_id}?tab=ids`,
        })
      }
    } catch (err) {
      console.warn('getActiveExpiryAlerts disk company_ids notice:', err)
    }

    // 3. فحص العلامات التجارية (Trademarks)
    try {
      const { data: dbTrademarks } = await supabase
        .from('trademarks')
        .select('*, companies(name)')

      for (const tm of dbTrademarks || []) {
        if (!tm.expiry_date || !tm.company_id) continue
        const key = `tm_${tm.id}`
        if (seenKeys.has(key)) continue

        const calc = calculateExpiryDaysAndPriority(tm.expiry_date)
        if (calc.priority === 'ok') continue

        seenKeys.add(key)
        const companyName = (tm as unknown as { companies?: { name?: string } | null }).companies?.name || 'شركة'

        alerts.push({
          id: key,
          entityId: tm.id,
          companyId: tm.company_id,
          companyName,
          category: 'trademark_renewal',
          categoryLabel: 'علامة تجارية',
          title: `تجديد العلامة التجارية: ${tm.name}`,
          expiryDate: tm.expiry_date,
          daysLeft: calc.daysLeft,
          priority: calc.priority,
          priorityLabel: calc.priorityLabel,
          badgeClass: calc.badgeClass,
          colorTheme: calc.colorTheme,
          profileUrl: `/commercial/companies/${tm.company_id}`,
          sectionUrl: `/commercial/companies/${tm.company_id}?tab=trademarks`,
        })
      }
    } catch (err) {
      console.warn('getActiveExpiryAlerts trademarks notice:', err)
    }
  } catch (err) {
    console.error('getActiveExpiryAlerts exception:', err)
  }

  // 4. فرز ذكي حسب متطلبات المستخدم:
  // أ. المنتهية أولاً (daysLeft < 0)
  // ب. المتبقي الأقل أولاً (daysLeft تصاعدي)
  return alerts.sort((a, b) => {
    const aIsExpired = a.daysLeft < 0
    const bIsExpired = b.daysLeft < 0

    if (aIsExpired && !bIsExpired) return -1
    if (!aIsExpired && bIsExpired) return 1

    return a.daysLeft - b.daysLeft
  })
}
