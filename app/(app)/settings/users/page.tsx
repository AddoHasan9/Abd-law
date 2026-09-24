import { requireUserAdministration } from '@/lib/auth/require-permission'
import UsersClient from '@/components/settings/UsersClient'
import { listProfiles } from '@/lib/data/profiles'

export const metadata = { title: 'المستخدمون وفريق العمل — مكتب المحامي عبد الحسن الخزرجي' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsUsersPage() {
  const denied = await requireUserAdministration()
  if (denied) return <p role="alert">{denied.error}</p>
  const profiles = await listProfiles(true)

  return <UsersClient initialProfiles={profiles} />
}
