import { requirePermission } from '@/lib/auth/require-permission'
import nextDynamic from 'next/dynamic'
import { SkeletonTable } from '@/components/ui/Skeleton'

const PermissionsClient = nextDynamic(() => import('@/components/settings/PermissionsClient'), {
  loading: () => (
    <div className="p-6 flex flex-col gap-6">
      <SkeletonTable rows={6} cols={5} />
    </div>
  ),
})

export const metadata = { title: 'مصفوفة الصلاحيات والأذونات — مكتب المحامي عبد الحسن الخزرجي' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPermissionsPage() {
  const denied = await requirePermission('users', 'manage_permissions')
  if (denied) return <p role="alert">{denied.error}</p>
  return <PermissionsClient />
}
