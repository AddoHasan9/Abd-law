/**
 * تخطيط التطبيق — يجلب بيانات الهيكل مرة واحدة لكل طلب
 * ------------------------------------------------------------
 * مكوّن خادمي: يقرأ الملف الشخصي والإعدادات والعدّادات وكافة
 * المهل والغرامات الحية، ثم يمرّرها للغلاف.
 */
import AppShell from '@/components/nav/AppShell'
import { IconSprite } from '@/components/ui/Icon'
import { getProfile, getSettings } from '@/lib/data/session'
import { countsByType } from '@/lib/data/transactions'
import { listCompanies, submittedMap } from '@/lib/data/companies'
import { penaltyState, DEFAULT_PENALTY } from '@/lib/constants'
import { getActiveExpiryAlerts } from '@/lib/notification-engine'
import { calculateFSState } from '@/lib/financial-statements/calc'
import { isCompanyNewAndExempt } from '@/lib/financial-statements/erp'
import type { DeadlineItem } from '@/components/nav/DeadlineCard'

// كل صفحات التطبيق تقرأ جلسة المستخدم من الكوكيز — لا يجوز توليدها ثابتاً
// ولا تخزينها في الكاش. هذا يمنع تسرّب بيانات مستخدم لآخر ويُسكت تحذيرات
// DYNAMIC_SERVER_USAGE أثناء البناء.
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // تُجلب على التوازي لتقليل زمن الاستجابة
  const [profile, settings, txCounts, companies, submitted, expiryAlerts] = await Promise.all([
    getProfile(),
    getSettings(),
    countsByType().catch(() => ({})),
    listCompanies().catch(() => []),
    submittedMap().catch(() => ({})),
    getActiveExpiryAlerts().catch(() => []),
  ])

  const cfg = settings
    ? {
        penaltyDays:  settings.penalty_days,
        penaltyWarn:  settings.penalty_warn,
        penaltyDaily: settings.penalty_daily,
        penaltyMax:   settings.penalty_max,
      }
    : DEFAULT_PENALTY

  // أقرب مهلة: الشركات غير المرسَلة على النظام، مرتّبة بالأقرب
  const pending = companies
    .map(c => ({ company: c, pen: penaltyState(c, !!(submitted as Record<string, boolean>)[c.id], cfg) }))
    .filter((x): x is { company: typeof x.company; pen: NonNullable<typeof x.pen> } => x.pen !== null)
    .sort((a, b) => a.pen.daysLeft - b.pen.daysLeft)

  // تجميع كافة المهل والغرامات عبر النظام (الودائع + الهويات + الحسابات الختامية)
  const allDeadlines: DeadlineItem[] = []

  // 1. غرامات ومهل إطلاق الوديعة (30 يوماً من صدور الشهادة)
  pending.forEach(p => {
    allDeadlines.push({
      id: `dep_${p.company.id}`,
      companyId: p.company.id,
      companyName: p.company.name,
      title: 'إطلاق الوديعة المصرفية',
      category: 'deposit',
      categoryLabel: 'إطلاق الوديعة',
      due: p.pen.due,
      daysLeft: p.pen.daysLeft,
      amount: p.pen.amount,
      total: cfg.penaltyDays,
      linkUrl: `/commercial/deposits?company=${p.company.id}`,
    })
  })

  // 2. هويات وتراخيص حكومية منتهية أو قريبة الانتهاء (60 يوماً أو أقل)
  expiryAlerts.forEach(a => {
    allDeadlines.push({
      id: `id_${a.id}`,
      companyId: a.companyId,
      companyName: a.companyName,
      title: a.title,
      category: 'government_id',
      categoryLabel: 'الهويات',
      due: a.expiryDate || '',
      daysLeft: a.daysLeft,
      amount: a.daysLeft <= 0 ? 50000 : 0,
      total: 60,
      linkUrl: `/commercial/ids?companyId=${a.companyId}`,
    })
  })

  // 3. غرامات ومهل الحسابات الختامية (الموعد النهائي 7/10 من كل سنة)
  const currentYear = new Date().getFullYear()
  companies.forEach(c => {
    if (isCompanyNewAndExempt(c)) return // الشركات الجديدة معفاة حتى إكمال سنة كاملة من التأسيس
    if (c.financial_statements_enabled || c.last_completed_fs_year) {
      const lastYear = c.last_completed_fs_year || (c.establishment_date ? parseInt(c.establishment_date.slice(0, 4)) - 1 : currentYear - 2)
      const pendingYear = lastYear + 1
      if (pendingYear < currentYear) {
        const fsState = calculateFSState({ company_id: c.id, year: pendingYear })
        allDeadlines.push({
          id: `fs_${c.id}_${pendingYear}`,
          companyId: c.id,
          companyName: c.name,
          title: `ميزانية السنة المالية ${pendingYear}`,
          category: 'financial_statement',
          categoryLabel: 'الحسابات الختامية',
          due: fsState.deadlineDate,
          daysLeft: fsState.daysLeft > 0 ? fsState.daysLeft : -fsState.daysLate,
          amount: fsState.penaltyAmount,
          total: 365,
          linkUrl: `/commercial/financial-statements?companyId=${c.id}`,
        })
      }
    }
  })

  // ترتيب المهل تصاعدياً بالأكثر إلحاحاً وتأخيراً
  allDeadlines.sort((a, b) => a.daysLeft - b.daysLeft)

  const nearest = allDeadlines[0] || null
  const notifCount = allDeadlines.filter(p => p.daysLeft <= 7).length

  return (
    <>
      <IconSprite />
      <AppShell
        profile={profile}
        officeName={settings?.office_name ?? 'مكتب المحامي عبد الحسن الخزرجي'}
        txCounts={txCounts}
        badges={{}}
        deadline={nearest}
        deadlines={allDeadlines}
        notifCount={notifCount}
        title="لوحة التحكم"
      >
        {children}
      </AppShell>
    </>
  )
}
