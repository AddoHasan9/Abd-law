import SettingsClient from '@/components/settings/SettingsClient'

export const metadata = { title: 'الإعدادات العامة ومسارات العمل — مكتب المحامي عبد الحسن الخزرجي' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function SettingsPage() {
  return <SettingsClient />
}
