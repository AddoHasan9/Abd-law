/**
 * صفحة لوحة التحكم الرئيسية — T5
 * ------------------------------------------------------------
 * تعرض المؤشرات المالية والمعاملات والمهل العاجلة والأداء.
 */
import { getDashboardStats } from '@/lib/data/dashboard'
import { listProfiles } from '@/lib/data/profiles'
import { checkAndTriggerCompanyDeadlineNotificationsAction } from '@/lib/data/deadline-notifications'
import DashboardClient from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: 'لوحة التحكم — مكتب المحامي عبد الحسن الخزرجي' }

export default async function DashboardPage() {
  const [stats, profiles] = await Promise.all([
    getDashboardStats(),
    listProfiles(),
    checkAndTriggerCompanyDeadlineNotificationsAction(),
  ])
  return <DashboardClient stats={stats} profiles={profiles} />
}
