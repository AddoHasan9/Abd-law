import { listCompanies } from '@/lib/data/companies'
import { PageHeader } from '@/components/ui/PageHeader'
import RemindersWidget from '@/components/dashboard/RemindersWidget'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'التذكيرات والإشعارات — المكتب القانوني',
  description: 'إدارة التذكيرات الشخصية والمستحقات المحددة بوقت',
}

export default async function RemindersPage() {
  const companies = await listCompanies()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader icon="notifications_active" tone="amber" title="التذكيرات" subtitle="مواعيدك وتنبيهاتك الخاصة: جلسات، مراجعات دوائر، ومهل" />

      <RemindersWidget companies={companies} />
    </div>
  )
}
