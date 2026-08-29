import UsersClient from '@/components/settings/UsersClient'
import { listProfiles } from '@/lib/data/profiles'

export const metadata = { title: 'المستخدمون وفريق العمل — مكتب المحامي عبد الحسن الخزرجي' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsUsersPage() {
  const profiles = await listProfiles()

  return <UsersClient initialProfiles={profiles} />
}
