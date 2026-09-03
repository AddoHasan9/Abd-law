/**
 * محرك تنبيهات المواعيد النهائية — تفاعلي (يعمل عند تحميل لوحة التحكم)
 * ------------------------------------------------------------
 * يطابق نمط checkAndTriggerDueRemindersAction الموجود مسبقاً: لا يوجد
 * أي cron في هذا المشروع، فكل فحص للمواعيد يتم عند تحميل صفحة فعلية.
 * يعيد استعمال daysBetween/penaltyState من lib/constants.ts وcalculateFSState
 * من lib/financial-statements/calc.ts بدل إعادة اختراع حساب التواريخ.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { createNotificationAction } from '@/app/(app)/notifications/actions'
import { daysBetween, penaltyState } from '@/lib/constants'
import { calculateFSState } from '@/lib/financial-statements/calc'

const ID_EXPIRY_WARNING_DAYS = 60

const ID_TYPE_LABELS: Record<string, string> = {
  importer_id: 'هوية مستورد',
  tax_id: 'هوية ضريبية',
  planning_id: 'هوية التخطيط',
  chamber_id: 'هوية الغرفة التجارية',
}

let lastCheckTimestamp = 0
const CHECK_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes cooldown

/** ينشئ تنبيهاً واحداً فقط لكل (شركة + نوع) طالما لا يزال هناك تنبيه سابق غير مقروء من نفس النوع */
async function notifyOnceIfUnread(
  supabase: ReturnType<typeof createAdminClient>,
  params: { related_company_id: string; type: string; title: string; description: string; link_url: string }
) {
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('related_company_id', params.related_company_id)
    .eq('type', params.type)
    .eq('is_read', false)
    .limit(1)

  if (existing && existing.length > 0) return

  await createNotificationAction({
    title: params.title,
    description: params.description,
    type: params.type,
    related_company_id: params.related_company_id,
    link_url: params.link_url,
  })
}

export async function checkAndTriggerCompanyDeadlineNotificationsAction() {
  const now = Date.now()
  if (now - lastCheckTimestamp < CHECK_COOLDOWN_MS) {
    return // تم الفحص مسبقاً خلال الـ 10 دقائق الأخيرة — تجنّب تكرار الاستعلامات
  }
  lastCheckTimestamp = now

  try {
    const supabase = createAdminClient()

    // 1. هويات حكومية تقترب من الانتهاء (خلال 60 يوماً)
    const { data: expiringIds } = await supabase
      .from('company_ids')
      .select('id, company_id, id_type, expiry_date, companies(name)')
      .not('expiry_date', 'is', null)

    for (const rec of expiringIds || []) {
      if (!rec.expiry_date) continue
      const daysLeft = daysBetween(rec.expiry_date)
      if (daysLeft < 0 || daysLeft > ID_EXPIRY_WARNING_DAYS) continue

      const companyName = (rec as unknown as { companies?: { name?: string } | null }).companies?.name || 'شركة'
      const idLabel = ID_TYPE_LABELS[rec.id_type] || rec.id_type

      await notifyOnceIfUnread(supabase, {
        related_company_id: rec.company_id,
        type: 'id_expiry',
        title: `اقتراب انتهاء ${idLabel} — ${companyName}`,
        description: `تنتهي بتاريخ ${rec.expiry_date} (خلال ${daysLeft} يوماً).`,
        link_url: `/commercial/companies/${rec.company_id}`,
      })
    }

    // 2. حسابات ختامية: فحص مهلة الضرائب 31/7 ومهلة مسجل الشركات 7/10
    const { data: pendingFs } = await supabase
      .from('financial_statements')
      .select('id, company_id, year, date_submitted, companies(name)')
      .is('date_submitted', null)

    for (const fs of pendingFs || []) {
      const state = calculateFSState({ year: fs.year })
      const companyName = (fs as unknown as { companies?: { name?: string } | null }).companies?.name || 'شركة'

      // تنبيه مهلة الضرائب (31/7)
      if ((state.taxDaysLeft && state.taxDaysLeft <= 30 && state.taxDaysLeft > 0) || (state.taxDaysLate && state.taxDaysLate > 0)) {
        await notifyOnceIfUnread(supabase, {
          related_company_id: fs.company_id,
          type: 'fs_tax_deadline',
          title: `مهلة الضرائب (31/7) لحسابات ${fs.year} — ${companyName}`,
          description: state.taxStatusLabel || `آخر موعد لتسليم الحسابات الختامية للهيئة العامة للضرائب (قسم الشركات) هو 31/7`,
          link_url: '/commercial/financial-statements',
        })
      }

      // تنبيه مهلة مسجل الشركات (7/10)
      if (state.status === 'due_soon' || state.status === 'penalty_running' || state.status === 'penalty_max') {
        await notifyOnceIfUnread(supabase, {
          related_company_id: fs.company_id,
          type: 'fs_deadline',
          title: `مهلة مسجل الشركات (7/10) لحسابات ${fs.year} — ${companyName}`,
          description: state.statusLabel,
          link_url: '/commercial/financial-statements',
        })
      }
    }

    // 3. شركات تقترب من مهلة إرسال الوديعة على النظام الحكومي
    const { data: certifiedCompanies } = await supabase
      .from('companies')
      .select('id, name, cert_date, kind')
      .not('cert_date', 'is', null)
      .neq('status', 'established')

    for (const co of certifiedCompanies || []) {
      const pen = penaltyState(co, false)
      if (!pen || (pen.level !== 'soon' && pen.level !== 'late')) continue

      await notifyOnceIfUnread(supabase, {
        related_company_id: co.id,
        type: 'deposit_deadline',
        title: `اقتراب موعد إرسال الوديعة — ${co.name}`,
        description: pen.label,
        link_url: '/commercial/deposits',
      })
    }
  } catch (err) {
    console.error('checkAndTriggerCompanyDeadlineNotificationsAction exception:', err)
  }
}
