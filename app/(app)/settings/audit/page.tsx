import { getAuditLogs } from '@/lib/data/audit'
import AuditLogsClient from '@/components/settings/AuditLogsClient'

export const metadata = {
  title: 'سجل التدقيق والعمليات | مكتب المحامي عبد الحسن الخزرجي',
  description: 'سجل حركات تسجيل الدخول والخروج والعمليات في النظام',
}

export const dynamic = 'force-dynamic'

export default async function SettingsAuditPage() {
  const initialLogs = await getAuditLogs({ limit: 150 })
  return <AuditLogsClient initialLogs={initialLogs} />
}
