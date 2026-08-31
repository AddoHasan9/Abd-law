/**
 * بيانات وإحصائيات لوحة التحكم — T5
 * ------------------------------------------------------------
 * تجميع المؤشرات، المهل الحاضرة، الغرامات المتراكمة، وتوزيع المعاملات.
 */
import { createClient } from '@/lib/supabase/server'
import { penaltyState, DEFAULT_PENALTY, txType } from '@/lib/constants'
import { WORKFLOW_STATUS_LIST, normalizeWorkflowStatus } from '@/lib/workflow-status'

import type { ViewDashboardAlert } from '@/types/database'
import { getActiveExpiryAlerts, type ExpiryAlertItem } from '@/lib/notification-engine'
import { calculateFSState } from '@/lib/financial-statements/calc'

export interface DashboardStats {
  activeTxCount: number
  doneThisMonthCount: number
  totalCompaniesCount: number
  establishedCompaniesCount: number
  formingCompaniesCount: number
  llcTransactionsCount: number
  activeDepositsCount: number
  totalIDsCount: number
  totalPenaltyAmount: number
  alerts: ViewDashboardAlert[]
  expiryAlerts: ExpiryAlertItem[]
  urgentDeadlines: Array<{
    companyId: string
    companyName: string
    title?: string
    daysLeft: number
    daysLate: number
    amount: number
    due: string
    level: 'late' | 'soon' | 'ok'
  }>
  statusDistribution: Array<{
    id: string
    label: string
    count: number
    tag: string
    bg?: string
    border?: string
    text?: string
  }>
  priorityDistribution: Array<{
    id: string
    label: string
    count: number
    tag: string
  }>
  recentTransactions: Array<{
    id: string
    type: string
    typeLabel: string
    companyId: string | null
    companyName: string | null
    clientName: string | null
    lawyerName: string | null
    status: string
    priority: string
    txDate: string
  }>
  topLawyers: Array<{
    id: string
    name: string
    doneCount: number
  }>
}

import { listCompanies } from '@/lib/data/companies'
import { listTransactions } from '@/lib/data/transactions'
import { listDeposits } from '@/lib/data/deposits'
import { readJsonFile } from '@/lib/data/fs-store'

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [companiesResult, txResult, depositsResult, expiryAlertsResult] = await Promise.allSettled([
      listCompanies(),
      listTransactions(),
      listDeposits(),
      getActiveExpiryAlerts(),
    ])

  const companies = companiesResult.status === 'fulfilled' ? companiesResult.value : []
  const txList = txResult.status === 'fulfilled' ? txResult.value : []
  const deposits = depositsResult.status === 'fulfilled' ? depositsResult.value : []
  const expiryAlerts = expiryAlertsResult.status === 'fulfilled' ? expiryAlertsResult.value : []

  if (companiesResult.status === 'rejected') {
    console.error('getDashboardStats companies failed:', companiesResult.reason)
  }
  if (txResult.status === 'rejected') {
    console.error('getDashboardStats transactions failed:', txResult.reason)
  }
  if (depositsResult.status === 'rejected') {
    console.error('getDashboardStats deposits failed:', depositsResult.reason)
  }

  const diskIDs = readJsonFile<Array<unknown>>('company_ids.json', [])
  const totalIDsCount = diskIDs.length || 0

  const establishedCompaniesCount = companies.filter(
    c => c.status === 'established' || c.status === 'done' || c.deposit_released || c.external
  ).length

  const formingCompaniesCount = companies.filter(
    c => c.status !== 'established' && c.status !== 'done' && !c.deposit_released && !c.external
  ).length

  const activeDepositsCount = deposits.filter(
    d => (d as unknown as { status?: string }).status !== 'released'
  ).length

  const llcTransactionsCount = txList.filter(
    t => (t.status === 'progress' || t.status === 'new' || t.status === 'doing' || t.status === 'wait') &&
         ['capital-up', 'share-sale', 'certify', 'mgr-renew', 'activity', 'relocation', 'final-acc', 'formation', 'tasis'].includes(t.type)
  ).length

  const activeTxCount = txList.filter(t => t.status === 'progress' || t.status === 'new' || t.status === 'doing' || t.status === 'wait').length

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const doneThisMonthCount = txList.filter(t => t.status === 'done' && (t.tx_date || '').slice(0, 10) >= firstDayOfMonth).length

  const submittedSet = new Set<string>()
  deposits.forEach(d => {
    const submitStage = (d.deposit_stages || []).find((s: { stage_key: string; state: string }) => s.stage_key === 'submit' && s.state === 'done')
    if (submitStage && d.company_id) {
      submittedSet.add(d.company_id)
    }
  })

  let totalPenaltyAmount = 0
  const urgentDeadlines: DashboardStats['urgentDeadlines'] = []

  // 1. غرامات ومهل إطلاق الوديعة (فقط للشركات قيد التأسيس وغير المطلقة وديعتها)
  for (const co of companies) {
    if (co.status === 'established' || co.deposit_released || Boolean(co.deposit_released_at)) continue
    const isSub = submittedSet.has(co.id)
    const pen = penaltyState(co, isSub, DEFAULT_PENALTY)
    if (pen) {
      totalPenaltyAmount += pen.amount
      if (pen.level === 'late' || pen.level === 'soon') {
        urgentDeadlines.push({
          companyId: co.id,
          companyName: co.name,
          title: 'إطلاق الوديعة المصرفية',
          daysLeft: pen.daysLeft,
          daysLate: pen.daysLate,
          amount: pen.amount,
          due: pen.due,
          level: pen.level,
        })
      }
    }
  }

  // 2. هويات وتراخيص حكومية تقترب من الانتهاء (أو منتهية)
  expiryAlerts.forEach(a => {
    urgentDeadlines.push({
      companyId: a.companyId,
      companyName: a.companyName,
      title: a.title,
      daysLeft: a.daysLeft,
      daysLate: a.daysLeft < 0 ? Math.abs(a.daysLeft) : 0,
      amount: a.daysLeft < 0 ? 50000 : 0,
      due: a.expiryDate || '',
      level: a.daysLeft < 0 ? 'late' : 'soon',
    })
  })

  // 3. الحسابات الختامية (فقط للشركات المكلّف بها المكتب بحساباتها)
  const currentYear = new Date().getFullYear()
  companies.forEach(c => {
    if (!c.financial_statements_enabled) return
    const lastYear = c.last_completed_fs_year || (c.establishment_date ? parseInt(c.establishment_date.slice(0, 4)) - 1 : currentYear - 2)
    const pendingYear = lastYear + 1
    if (pendingYear < currentYear) {
      const fsState = calculateFSState({ company_id: c.id, year: pendingYear })
      
      // مهلة الضرائب 31/7
      if ((fsState.taxDaysLeft && fsState.taxDaysLeft <= 30 && fsState.taxDaysLeft > 0) || (fsState.taxDaysLate && fsState.taxDaysLate > 0)) {
        urgentDeadlines.push({
          companyId: c.id,
          companyName: c.name,
          title: `تسليم ضرائب الشركات 31/7 (حسابات ${pendingYear})`,
          daysLeft: fsState.taxDaysLeft && fsState.taxDaysLeft > 0 ? fsState.taxDaysLeft : -(fsState.taxDaysLate || 0),
          daysLate: fsState.taxDaysLate || 0,
          amount: 0,
          due: fsState.taxDeadlineDate || '',
          level: (fsState.taxDaysLate && fsState.taxDaysLate > 0) ? 'late' : 'soon',
        })
      }

      // مهلة مسجل الشركات 7/10
      if (fsState.status === 'due_soon' || fsState.status === 'penalty_running' || fsState.status === 'penalty_max') {
        urgentDeadlines.push({
          companyId: c.id,
          companyName: c.name,
          title: `مسجل الشركات 7/10 (ميزانية ${pendingYear})`,
          daysLeft: fsState.daysLeft > 0 ? fsState.daysLeft : -fsState.daysLate,
          daysLate: fsState.daysLate,
          amount: fsState.penaltyAmount,
          due: fsState.deadlineDate,
          level: fsState.daysLate > 0 ? 'late' : 'soon',
        })
      }
    }
  })

  urgentDeadlines.sort((a, b) => a.daysLeft - b.daysLeft)

  const statusCounts: Record<string, number> = {}
  const priorityCounts: Record<string, number> = {}

  for (const t of txList) {
    const canonical = normalizeWorkflowStatus(t.status)
    statusCounts[canonical] = (statusCounts[canonical] || 0) + 1
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1
  }

  // Also include companies status if needed
  for (const c of companies) {
    if (c.status) {
      const canonical = normalizeWorkflowStatus(c.status)
      statusCounts[canonical] = (statusCounts[canonical] || 0) + 1
    }
  }

  const statusDistribution = WORKFLOW_STATUS_LIST.map(cfg => {
    let count = statusCounts[cfg.key] || 0
    if (cfg.aliases) {
      cfg.aliases.forEach(alias => {
        if (alias !== cfg.key && statusCounts[alias]) {
          count += statusCounts[alias]
        }
      })
    }
    return {
      id: cfg.key,
      label: cfg.label,
      count,
      tag: cfg.key,
      bg: cfg.bg,
      border: cfg.border,
      text: cfg.text,
    }
  })

  const priorityDistribution = [
    { id: 'urgent', label: 'عاجلة',  count: priorityCounts['urgent'] || 0, tag: 'tag-bad' },
    { id: 'high',   label: 'عالية',   count: priorityCounts['high'] || 0,   tag: 'tag-warn' },
    { id: 'medium', label: 'متوسطة', count: priorityCounts['medium'] || 0, tag: 'tag-work' },
    { id: 'low',    label: 'منخفضة', count: priorityCounts['low'] || 0,    tag: 'tag-mute' },
  ]

    // 4. أحدث المعاملات (آخر 8)
    type Row = typeof txList[number] & {
      companies: { id?: string; name: string } | null
      clients: { name: string } | null
      profiles: { name: string } | null
    }

    const recentTransactions = txList
      .slice()
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, 8)
      .map(t => {
        const row = t as unknown as Row
        const typeMap: Record<string, string> = {
          'capital-up': 'زيادة رأس مال',
          'share-sale': 'بيع وشراء أسهم',
          'certify': 'تصديق الأوراق والقرارات',
          'mgr-renew': 'تجديد المدير المفوض',
          'activity': 'إضافة / تعديل نشاط',
          'relocation': 'نقل موقع الشركة',
          'final-acc': 'حسابات ختامية',
          formation: 'تأسيس شركة',
          tasis: 'تأسيس شركة',
          deposit: 'إطلاق وديعة',
          deposit_stage: 'إطلاق وديعة',
          fs: 'حسابات ختامية',
          id: 'إصدار هوية',
          'importer_id': 'هوية مستورد',
          'tax_id': 'هوية ضريبية',
          'chamber_id': 'هوية غرفة التجارة',
          'planning_id': 'هوية تخطيط',
        }
        const foundLabel = typeMap[row.type] || (row.type ? txType(row.type).label : null)
        const typeLabel = (foundLabel && foundLabel !== '—') ? foundLabel : 'معاملة تجارية'

        return {
          id: row.id,
          type: row.type || 'tx',
          typeLabel,
          companyId: row.company_id || (row.companies && row.companies.id ? row.companies.id : null),
          companyName: row.companies?.name ?? ((t as unknown as { notes?: string }).notes?.startsWith('شركة ') ? (t as unknown as { notes?: string }).notes : null) ?? 'شركة تجارية',
          clientName: row.clients?.name ?? null,
          lawyerName: row.profiles?.name ?? null,
          status: row.status,
          priority: row.priority,
          txDate: row.tx_date || (row.created_at ? row.created_at.slice(0, 10) : ''),
        }
      })

    // 5. أعلى المحامين إنجازاً
    const lawyerMap: Record<string, { name: string; doneCount: number }> = {}
    for (const t of txList) {
      const row = t as unknown as Row
      if (row.profiles?.id && row.status === 'done') {
        const lid = row.profiles.id
        if (!lawyerMap[lid]) {
          lawyerMap[lid] = { name: row.profiles.name, doneCount: 0 }
        }
        lawyerMap[lid].doneCount++
      }
    }

    const topLawyers = Object.entries(lawyerMap)
      .map(([id, val]) => ({ id, name: val.name, doneCount: val.doneCount }))
      .sort((a, b) => b.doneCount - a.doneCount)
      .slice(0, 5)

    let alerts: ViewDashboardAlert[] = []
    try {
      const supabase = await createClient()
      const { data: dbAlerts, error: alertsErr } = await supabase
        .from('view_dashboard_alerts')
        .select('*')
        .order('severity', { ascending: false })

      if (!alertsErr && dbAlerts && dbAlerts.length > 0) {
        alerts = dbAlerts as ViewDashboardAlert[]
      }
    } catch {
      // Ignored for fallback
    }

    if (alerts.length === 0) {
      alerts = urgentDeadlines.map(ud => ({
        id: `alert_${ud.companyId}`,
        company_id: ud.companyId,
        company_name: ud.companyName,
        alert_type: ud.level === 'late' ? 'deposit_deadline' : 'fs_deadline',
        severity: ud.level === 'late' ? 'urgent' : 'high',
        title: `مهلة عاجلة للشركة: ${ud.companyName}`,
        description: ud.level === 'late' ? `تأخير ${ud.daysLate} يوم عن الموعد المحدد` : `متبقي ${ud.daysLeft} يوم للموعد النهائي`,
        due_date: ud.due,
        days_overdue: ud.daysLate || 0,
      }))
    }

    return {
      activeTxCount,
      doneThisMonthCount,
      totalCompaniesCount: companies.length,
      establishedCompaniesCount,
      formingCompaniesCount,
      llcTransactionsCount,
      activeDepositsCount,
      totalIDsCount,
      totalPenaltyAmount,
      alerts,
      expiryAlerts,
      urgentDeadlines,
      statusDistribution,
      priorityDistribution,
      recentTransactions,
      topLawyers,
    }
  } catch (err) {
    console.error('getDashboardStats error:', err)
    return {
      activeTxCount: 0,
      doneThisMonthCount: 0,
      totalCompaniesCount: 0,
      establishedCompaniesCount: 0,
      formingCompaniesCount: 0,
      llcTransactionsCount: 0,
      activeDepositsCount: 0,
      totalIDsCount: 0,
      totalPenaltyAmount: 0,
      alerts: [],
      expiryAlerts: [],
      urgentDeadlines: [],
      statusDistribution: [],
      priorityDistribution: [],
      recentTransactions: [],
      topLawyers: [],
    }
  }
}
