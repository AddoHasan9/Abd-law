import { listCompanies } from '@/lib/data/companies'
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            مركز التذكيرات والمستحقات الشخصية
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '4px 0 0' }}>
            إنشاء وإدارة التذكيرات المؤرخة والملاحظات القائمة مع تنبيهات تلقائية.
          </p>
        </div>
      </div>

      <RemindersWidget companies={companies} />
    </div>
  )
}
